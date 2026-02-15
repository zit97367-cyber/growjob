"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConfirmApplyModal } from "@/components/feed/ConfirmApplyModal";
import { FeedJob, TokenState } from "@/components/feed/types";
import { FiltersSheet } from "@/components/feed/FiltersSheet";
import { FocusHeader } from "@/components/feed/FocusHeader";
import { JobCard } from "@/components/feed/JobCard";
import { JobsToolbar } from "@/components/feed/JobsToolbar";
import { deriveMatchReason, inferredVerification, isFreshWithinDays, timeAgo } from "@/lib/feedUi";

const INITIAL_PAGE_SIZE = 30;
const SECOND_PAGE_SIZE = 30;
const REQUEST_TIMEOUT_MS = 5000;

type FeedResponse = {
  jobs?: FeedJob[];
  meta?: {
    limit: number;
    offset: number;
    totalApprox: number;
    source: "PERSONALIZED" | "FALLBACK";
  };
};

type FallbackJobsResponse = {
  jobs?: Array<{
    id: string;
    title: string;
    company: string;
    location: string | null;
    remote: boolean | null;
    description?: string | null;
    applyUrl: string;
    postedAt: string | null;
    firstSeenAt: string;
    verificationTier?: "UNVERIFIED" | "DOMAIN_VERIFIED" | "SOURCE_VERIFIED";
  }>;
};

async function fetchJsonWithTimeout<T>(input: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { cache: "no-store", signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Request failed with ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

export function JobsFeed() {
  const [viewMode, setViewMode] = useState<"BEST_MATCHES" | "SMART_MATCHES" | "ALL_JOBS">("BEST_MATCHES");
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [message, setMessage] = useState("");
  const [feedError, setFeedError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [dataSource, setDataSource] = useState<"PERSONALIZED" | "FALLBACK">("PERSONALIZED");
  const [authenticated, setAuthenticated] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountRole, setAccountRole] = useState<"USER" | "ADMIN" | null>(null);

  const [category, setCategory] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [salaryFloorK, setSalaryFloorK] = useState(10);
  const [query, setQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationChip, setLocationChip] = useState("");

  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [freshOnly, setFreshOnly] = useState(false);

  const [loadingFeed, setLoadingFeed] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [confirmJob, setConfirmJob] = useState<FeedJob | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debouncedLocationQuery, setDebouncedLocationQuery] = useState("");

  const weeklyCap = useMemo(() => {
    if (!tokenState) return 7;
    return tokenState.weeklyLimit + tokenState.bonusTokensBought;
  }, [tokenState]);

  const tokensLeft = useMemo(() => {
    if (!tokenState) return 7;
    if (typeof tokenState.tokensLeft === "number") return tokenState.tokensLeft;
    return Math.max(0, weeklyCap - tokenState.usedTokens);
  }, [tokenState, weeklyCap]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedLocationQuery(locationQuery), 350);
    return () => window.clearTimeout(timer);
  }, [locationQuery]);

  const refreshTokenState = useCallback(async () => {
    try {
      const tokenJson = await fetchJsonWithTimeout<{
        tokenState?: TokenState | null;
        authenticated?: boolean;
        isPremium?: boolean;
        user?: { email?: string | null; role?: "USER" | "ADMIN" | null };
      }>("/api/me/token-state", REQUEST_TIMEOUT_MS);

      setTokenState(tokenJson.tokenState ?? null);
      setAuthenticated(Boolean(tokenJson.authenticated));
      setIsPremium(Boolean(tokenJson.isPremium));
      setAccountEmail(tokenJson.user?.email ?? null);
      setAccountRole(tokenJson.user?.role ?? null);
    } catch {
      setTokenState((prev) => prev ?? { weeklyLimit: 7, bonusTokensBought: 0, usedTokens: 0, tokensLeft: 7 });
      setAuthenticated(false);
      setIsPremium(false);
      setAccountEmail(null);
      setAccountRole(null);
    }
  }, []);

  const fetchFallbackJobs = useCallback(async () => {
    const fallbackParams = new URLSearchParams();
    fallbackParams.set("days", "7");
    if (remoteOnly) fallbackParams.set("remoteOnly", "true");
    const fallbackQuery = [debouncedQuery.trim(), (locationChip || debouncedLocationQuery).trim()].filter(Boolean).join(" ");
    if (fallbackQuery) fallbackParams.set("q", fallbackQuery);

    const fallback = await fetchJsonWithTimeout<FallbackJobsResponse>(`/api/jobs?${fallbackParams.toString()}`, REQUEST_TIMEOUT_MS);
    const mapped: FeedJob[] = (fallback.jobs ?? []).map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location ?? undefined,
      isRemote: Boolean(job.remote),
      description: job.description ?? undefined,
      postedAt: job.postedAt ?? job.firstSeenAt,
      applyUrl: job.applyUrl,
      verificationTier: job.verificationTier ?? undefined,
    }));
    return mapped;
  }, [debouncedLocationQuery, debouncedQuery, locationChip, remoteOnly]);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (remoteOnly) params.set("remoteOnly", "true");
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    if ((locationChip || debouncedLocationQuery).trim()) params.set("location", (locationChip || debouncedLocationQuery).trim());
    params.set("salaryFloorK", String(salaryFloorK));
    params.set("limit", String(INITIAL_PAGE_SIZE));
    params.set("offset", "0");

    setFeedError("");
    setLoadingFeed(true);
    setLoadingMore(false);
    void refreshTokenState();

    try {
      const firstPage = await fetchJsonWithTimeout<FeedResponse>(`/api/jobs/feed?${params.toString()}`, REQUEST_TIMEOUT_MS);
      const firstJobs = firstPage.jobs ?? [];
      setJobs(firstJobs);
      setDataSource(firstPage.meta?.source ?? "PERSONALIZED");

      if (firstJobs.length >= INITIAL_PAGE_SIZE) {
        setLoadingMore(true);
        const nextParams = new URLSearchParams(params);
        nextParams.set("limit", String(SECOND_PAGE_SIZE));
        nextParams.set("offset", String(INITIAL_PAGE_SIZE));
        void fetchJsonWithTimeout<FeedResponse>(`/api/jobs/feed?${nextParams.toString()}`, REQUEST_TIMEOUT_MS)
          .then((secondPage) => {
            const secondJobs = secondPage.jobs ?? [];
            if (secondJobs.length === 0) return;
            setJobs((prev) => {
              const ids = new Set(prev.map((job) => job.id));
              return [...prev, ...secondJobs.filter((job) => !ids.has(job.id))];
            });
          })
          .catch(() => {
            // Background enrichment failure should not block interaction.
          })
          .finally(() => setLoadingMore(false));
      }
    } catch {
      try {
        const fallbackJobs = await fetchFallbackJobs();
        setJobs(fallbackJobs);
        setDataSource("FALLBACK");
        setFeedError("Live feed timed out. Showing cached jobs.");
      } catch {
        setJobs([]);
        setFeedError("Couldn’t fetch latest roles in time.");
      }
    } finally {
      setLoadingFeed(false);
    }
  }, [category, debouncedLocationQuery, debouncedQuery, fetchFallbackJobs, locationChip, refreshTokenState, remoteOnly, salaryFloorK]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 120);
    return () => window.clearTimeout(timer);
  }, [refresh, refreshTick]);

  const displayJobs = useMemo(() => {
    return jobs.filter((job) => {
      const verification = inferredVerification(job.applyUrl, job.verificationTier);
      if (verifiedOnly && verification === "UNVERIFIED") return false;
      if (freshOnly && !isFreshWithinDays(job.postedAt, 7)) return false;
      return true;
    });
  }, [freshOnly, jobs, verifiedOnly]);

  const updatedAgo = useMemo(() => {
    if (displayJobs.length === 0) return "just now";
    const latest = displayJobs
      .map((job) => new Date(job.postedAt).getTime())
      .sort((a, b) => b - a)[0];
    return latest ? timeAgo(new Date(latest)) : "just now";
  }, [displayJobs]);

  const newCount = useMemo(() => displayJobs.filter((job) => isFreshWithinDays(job.postedAt, 1)).length, [displayJobs]);

  const jobsByView = useMemo(() => {
    if (viewMode === "ALL_JOBS") {
      return displayJobs;
    }

    if (viewMode === "SMART_MATCHES") {
      return [...displayJobs]
        .sort((a, b) => {
          const scoreA = deriveMatchReason({ job: a, selectedCategory: category, query, salaryFloorK }).length;
          const scoreB = deriveMatchReason({ job: b, selectedCategory: category, query, salaryFloorK }).length;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        })
        .slice(0, 40);
    }

    return [...displayJobs].sort((a, b) => {
      const ageDelta = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      if (ageDelta !== 0) return ageDelta;
      return a.title.localeCompare(b.title);
    });
  }, [category, displayJobs, query, salaryFloorK, viewMode]);

  const locationChips = useMemo(() => {
    const common = new Set<string>(["Remote", "US", "Europe", "India", "Singapore", "Dubai"]);
    for (const location of jobs.map((j) => j.location).filter(Boolean) as string[]) {
      const short = location.split(",")[0]?.trim();
      if (short && short.length <= 16) common.add(short);
      if (common.size >= 10) break;
    }
    return [...common].slice(0, 10);
  }, [jobs]);

  async function postAction(url: string, successMessage?: string) {
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Action failed");
      return data;
    }
    if (successMessage) {
      setMessage(successMessage);
    }
    await refresh();
    return data;
  }

  async function confirmApplyNow() {
    if (!confirmJob) return;
    const data = await postAction(`/api/jobs/${confirmJob.id}/apply`, "Applied. Redirecting...");
    setConfirmJob(null);
    if (data?.redirectUrl) {
      window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <AppShell
      title="GrowJob"
      subtitle="One platform to find, apply, and track results"
      badge="Live"
      statusText={authenticated ? (isPremium ? "Premium User" : "Free User") : "Guest"}
    >
      <FocusHeader remaining={tokensLeft} total={weeklyCap} onUpgrade={() => void postAction("/api/stripe/create-checkout", "Premium upgraded")} />

      {message ? <p className="toast mt-3">{message}</p> : null}
      {loadingFeed ? (
        <section className="section-card mt-3 animate-rise">
          <p className="card-title">Loading latest roles...</p>
          <p className="soft-text mt-1">Preparing your personalized feed.</p>
        </section>
      ) : null}
      {feedError ? (
        <section className="section-card mt-3 animate-rise">
          <p className="card-title">{feedError}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="action-btn" onClick={() => setRefreshTick((prev) => prev + 1)}>
              Retry now
            </button>
            <button
              className="action-btn"
              onClick={() => {
                setFeedError("");
                void fetchFallbackJobs().then((mapped) => {
                  setJobs(mapped);
                  setDataSource("FALLBACK");
                }).catch(() => setFeedError("Fallback jobs are unavailable right now."));
              }}
            >
              Show cached roles
            </button>
          </div>
        </section>
      ) : null}

      {!authenticated ? (
        <section className="section-card mt-3 animate-rise delay-1">
          <p className="card-title">Sign in to apply and track weekly tokens</p>
          <p className="soft-text mt-1">You can still browse, save, and hide jobs as a guest.</p>
        </section>
      ) : null}

      <section className="section-card mt-3 animate-rise delay-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="soft-text">
            {authenticated ? `Signed in as ${accountEmail ?? "account user"}` : "Signed in as Guest"}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="ghost-chip">{authenticated ? (isPremium ? "PREMIUM" : "FREE") : "GUEST"}</span>
            {authenticated ? <span className="ghost-chip">{accountRole ?? "USER"}</span> : null}
            <span className="ghost-chip">{dataSource === "PERSONALIZED" ? "Live personalized" : "Fallback cached"}</span>
          </div>
        </div>
      </section>

      <section className="section-card mt-3 animate-rise delay-1">
        <div className="view-switch">
          <button className={`view-pill ${viewMode === "BEST_MATCHES" ? "active" : ""}`} onClick={() => setViewMode("BEST_MATCHES")}>
            Best Matches
          </button>
          <button className={`view-pill ${viewMode === "SMART_MATCHES" ? "active" : ""}`} onClick={() => setViewMode("SMART_MATCHES")}>
            Smart Picks
          </button>
          <button className={`view-pill ${viewMode === "ALL_JOBS" ? "active" : ""}`} onClick={() => setViewMode("ALL_JOBS")}>
            All Jobs
          </button>
        </div>
        <p className="soft-text mt-2">
          {viewMode === "BEST_MATCHES"
            ? "Best Matches shows roles most aligned with your filters."
            : viewMode === "SMART_MATCHES"
            ? "Smart Picks highlights roles likely to get better response."
            : "All Jobs shows everything from the latest market feed."}
        </p>
      </section>

      <JobsToolbar
        query={query}
        onQueryChange={setQuery}
        locationQuery={locationQuery}
        onLocationQueryChange={(value) => {
          setLocationChip("");
          setLocationQuery(value);
        }}
        locationChips={locationChips}
        selectedLocationChip={locationChip}
        onSelectLocationChip={(value) => {
          setLocationChip(value);
          if (value) setLocationQuery("");
        }}
        remoteOnly={remoteOnly}
        setRemoteOnly={setRemoteOnly}
        verifiedOnly={verifiedOnly}
        setVerifiedOnly={setVerifiedOnly}
        freshOnly={freshOnly}
        setFreshOnly={setFreshOnly}
        onOpenFilters={() => setFiltersOpen(true)}
        count={jobsByView.length}
        updatedAgo={updatedAgo}
        newCount={newCount}
      />

      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        category={category}
        setCategory={setCategory}
        salaryFloorK={salaryFloorK}
        setSalaryFloorK={setSalaryFloorK}
      />

      <section className="mt-3 space-y-3">
        {loadingFeed && jobs.length === 0 ? (
          <>
            {Array.from({ length: 3 }).map((_, index) => (
              <article key={`skeleton-${index}`} className="section-card animate-pulse">
                <div className="h-5 w-2/3 rounded bg-emerald-900/10" />
                <div className="mt-2 h-4 w-1/2 rounded bg-emerald-900/10" />
                <div className="mt-3 h-9 w-full rounded bg-emerald-900/10" />
              </article>
            ))}
          </>
        ) : null}

        {!loadingFeed && jobsByView.length === 0 ? (
          <article className="section-card animate-rise delay-3">
            <p className="card-title">No jobs match the current filters</p>
            <p className="soft-text mt-1">Try clearing filters, removing location, or switching off verified/fresh chips.</p>
            <div className="mt-2 flex gap-2">
              <button className="action-btn" onClick={() => { setLocationChip(""); setLocationQuery(""); setVerifiedOnly(false); setFreshOnly(false); }}>
                Clear restrictive filters
              </button>
              <button className="action-btn" onClick={() => setFreshOnly(false)}>
                Widen freshness window
              </button>
            </div>
          </article>
        ) : null}

        {authenticated ? (
          <article className="section-card animate-rise delay-2">
            <p className="card-title">Quick start</p>
            <p className="soft-text mt-1">1) Complete profile  2) Upload resume  3) Run first match scan</p>
          </article>
        ) : null}

        {jobsByView.map((job, index) => (
          <div key={job.id} className={`delay-${(index % 4) + 1}`}>
            <JobCard
              job={job}
              whyMatch={deriveMatchReason({ job, selectedCategory: category, query, salaryFloorK })}
              verification={inferredVerification(job.applyUrl, job.verificationTier)}
              applyDisabled={!authenticated || tokensLeft <= 0}
              showUpgradeCta={authenticated && tokensLeft <= 0}
              onSave={() => void postAction(`/api/jobs/${job.id}/save`, "Saved")}
              onHide={() => void postAction(`/api/jobs/${job.id}/hide`, "Hidden")}
              onCheckMatch={() => (window.location.href = `/resume?jobId=${job.id}`)}
              onApply={() => setConfirmJob(job)}
              onUpgrade={() => void postAction("/api/stripe/create-checkout", "Premium upgraded")}
            />
          </div>
        ))}

        {loadingMore ? (
          <article className="section-card animate-rise">
            <p className="soft-text">Loading more roles in background...</p>
          </article>
        ) : null}
      </section>

      <ConfirmApplyModal
        open={Boolean(confirmJob)}
        title={confirmJob?.title ?? ""}
        company={confirmJob?.company ?? ""}
        onCancel={() => setConfirmJob(null)}
        onConfirm={() => void confirmApplyNow()}
      />
    </AppShell>
  );
}
