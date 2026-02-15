"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ActionImpactCard } from "@/components/common/ActionImpactCard";
import { OutcomeMeter } from "@/components/common/OutcomeMeter";
import { ConfirmApplyModal } from "@/components/feed/ConfirmApplyModal";
import { FeedJob, TokenState } from "@/components/feed/types";
import { FiltersSheet } from "@/components/feed/FiltersSheet";
import { FocusHeader } from "@/components/feed/FocusHeader";
import { JobCard } from "@/components/feed/JobCard";
import { JobsToolbar } from "@/components/feed/JobsToolbar";
import { inferredVerification, isFreshWithinDays, jobSectionLabel, locationRegionLabel, timeAgo, workStyleLabel } from "@/lib/feedUi";

const INITIAL_PAGE_SIZE = 30;
const SECOND_PAGE_SIZE = 30;
const REQUEST_TIMEOUT_MS = 5000;

type ViewMode = "JOBS_FOR_YOU" | "AI_MATCHES" | "ALL_JOBS";

type FeedResponse = {
  jobs?: FeedJob[];
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
  const [viewMode, setViewMode] = useState<ViewMode>("JOBS_FOR_YOU");
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [message, setMessage] = useState("");
  const [feedError, setFeedError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [hasResume, setHasResume] = useState(false);

  const [salaryFloorK, setSalaryFloorK] = useState(10);
  const [query, setQuery] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [workStyles, setWorkStyles] = useState<string[]>([]);

  const [loadingFeed, setLoadingFeed] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [confirmJob, setConfirmJob] = useState<FeedJob | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

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

  const refreshTokenState = useCallback(async () => {
    try {
      const tokenJson = await fetchJsonWithTimeout<{
        tokenState?: TokenState | null;
        authenticated?: boolean;
        isPremium?: boolean;
        hasResume?: boolean;
      }>("/api/me/token-state", REQUEST_TIMEOUT_MS);

      setTokenState(tokenJson.tokenState ?? null);
      setAuthenticated(Boolean(tokenJson.authenticated));
      setIsPremium(Boolean(tokenJson.isPremium));
      setHasResume(Boolean(tokenJson.hasResume));
    } catch {
      setTokenState((prev) => prev ?? { weeklyLimit: 7, bonusTokensBought: 0, usedTokens: 0, tokensLeft: 7 });
      setAuthenticated(false);
      setIsPremium(false);
      setHasResume(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    params.set("salaryFloorK", String(salaryFloorK));
    params.set("limit", String(INITIAL_PAGE_SIZE));
    params.set("offset", "0");
    if (roles.length > 0) params.set("roles", roles.join(","));
    if (regions.length > 0) params.set("regions", regions.join(","));
    if (workStyles.length > 0) params.set("workStyles", workStyles.join(","));

    setFeedError("");
    setLoadingFeed(true);
    setLoadingMore(false);
    void refreshTokenState();

    try {
      const firstPage = await fetchJsonWithTimeout<FeedResponse>(`/api/jobs/feed?${params.toString()}`, REQUEST_TIMEOUT_MS);
      const firstJobs = firstPage.jobs ?? [];
      setJobs(firstJobs);

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
          .finally(() => setLoadingMore(false));
      }
    } catch {
      setJobs([]);
      setFeedError("Couldn’t fetch jobs right now. Please try again.");
    } finally {
      setLoadingFeed(false);
    }
  }, [debouncedQuery, regions, refreshTokenState, roles, salaryFloorK, workStyles]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 120);
    return () => window.clearTimeout(timer);
  }, [refresh, refreshTick]);

  const updatedAgo = useMemo(() => {
    if (jobs.length === 0) return "just now";
    const latest = jobs
      .map((job) => new Date(job.postedAt).getTime())
      .sort((a, b) => b - a)[0];
    return latest ? timeAgo(new Date(latest)) : "just now";
  }, [jobs]);

  const jobsByView = useMemo(() => {
    if (viewMode === "ALL_JOBS") {
      return jobs;
    }

    const fresh = jobs.filter((job) => isFreshWithinDays(job.postedAt, 10));
    const roleSet = new Set(roles.map((item) => item.toLowerCase()));
    const regionSet = new Set(regions.map((item) => item.toLowerCase()));
    const styleSet = new Set(workStyles.map((item) => item.toLowerCase()));

    const preferenceScore = (job: FeedJob) => {
      let score = 0;
      const section = jobSectionLabel(job).toLowerCase();
      const region = locationRegionLabel(job.location).toLowerCase();
      const style = workStyleLabel(job).toLowerCase();
      const verify = inferredVerification(job.applyUrl, job.verificationTier);
      if (roleSet.size === 0 || roleSet.has(section)) score += 18;
      if (regionSet.size === 0 || regionSet.has(region)) score += 12;
      if (styleSet.size === 0 || styleSet.has(style)) score += 10;
      if (verify === "SOURCE_VERIFIED") score += 10;
      if (verify === "DOMAIN_VERIFIED") score += 5;
      score += Math.max(0, 10 - Math.floor((Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24)));
      return score;
    };

    if (viewMode === "AI_MATCHES") {
      return [...fresh].sort((a, b) => {
        const scoreA = preferenceScore(a) + (a.matchReason?.length ?? 0) + (a.salaryMinUsd ?? 0) / 1000;
        const scoreB = preferenceScore(b) + (b.matchReason?.length ?? 0) + (b.salaryMinUsd ?? 0) / 1000;
        return scoreB - scoreA;
      });
    }

    return [...fresh].sort((a, b) => {
      const scoreA = preferenceScore(a) + (a.matchReason?.length ?? 0) + (a.isRemote ? 10 : 0);
      const scoreB = preferenceScore(b) + (b.matchReason?.length ?? 0) + (b.isRemote ? 10 : 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });
  }, [jobs, regions, roles, viewMode, workStyles]);

  const outcomeScore = useMemo(() => {
    let score = 22;
    if (hasResume) score += 24;
    if (roles.length > 0) score += 16;
    if (regions.length > 0) score += 10;
    if (workStyles.length > 0) score += 8;
    if (tokensLeft > 0) score += 10;
    if (jobsByView.length > 0) score += 10;
    return Math.min(100, score);
  }, [hasResume, roles.length, regions.length, workStyles.length, tokensLeft, jobsByView.length]);

  const nextBestAction = useMemo(() => {
    if (!hasResume) return "Upload your resume to unlock AI Matches.";
    if (roles.length === 0) return "Set roles in Job Preferences for better ranking.";
    if (regions.length === 0) return "Select at least one region to tighten discovery.";
    if (tokensLeft <= 1) return "Upgrade to Premium to increase weekly applies.";
    return "Run Check Match % on top 2 roles before applying.";
  }, [hasResume, roles.length, regions.length, tokensLeft]);

  async function postAction(url: string, successMessage?: string) {
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      if (data?.errorCode === "broken_apply_url") {
        setMessage(data?.tokenRefunded ? "Apply link failed. 1 token was refunded." : "Apply link failed. Please try another job.");
      } else {
        setMessage(data.error ?? "Action failed");
      }
      return data;
    }
    if (successMessage) setMessage(successMessage);
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
    <AppShell title="GrowJob" subtitle="One platform to apply and get results" badge={isPremium ? "Premium" : undefined}>
      <FocusHeader
        remaining={tokensLeft}
        total={weeklyCap}
        isPremium={isPremium}
        onUpgrade={() => (window.location.href = "/plans")}
      />

      {message ? <p className="toast mt-3">{message}</p> : null}

      <section className="jobs-hero-card mt-3 animate-rise delay-1">
        <JobsToolbar
          query={query}
          onQueryChange={setQuery}
          onOpenPreferences={() => setPreferencesOpen(true)}
          count={jobsByView.length}
          updatedAgo={updatedAgo}
        />

        <div className="jobs-tabs mt-3">
          <button className={`tab-pill ${viewMode === "JOBS_FOR_YOU" ? "active" : ""}`} onClick={() => setViewMode("JOBS_FOR_YOU")}>
            Jobs for you
          </button>
          <button className={`tab-pill ${viewMode === "AI_MATCHES" ? "active" : ""}`} onClick={() => setViewMode("AI_MATCHES")}>
            AI Matches
          </button>
          <button className={`tab-pill ${viewMode === "ALL_JOBS" ? "active" : ""}`} onClick={() => setViewMode("ALL_JOBS")}>
            All jobs
          </button>
        </div>
      </section>

      <OutcomeMeter
        score={outcomeScore}
        subtitle="Match quality + application quality + interview likelihood"
        nextAction={nextBestAction}
      />

      {preferencesOpen ? (
        <FiltersSheet
          onClose={() => setPreferencesOpen(false)}
          roles={roles}
          regions={regions}
          workStyles={workStyles}
          salaryFloorK={salaryFloorK}
          onSave={(next) => {
            setRoles(next.roles);
            setRegions(next.regions);
            setWorkStyles(next.workStyles);
            setSalaryFloorK(next.salaryFloorK);
            setRefreshTick((prev) => prev + 1);
          }}
        />
      ) : null}

      <section className="jobs-results-panel mt-3 space-y-3">
        <ActionImpactCard
          title="Apply with confidence"
          body="Safer links and better-ranked roles help avoid wasted applications."
          impact="+8% response quality"
          ctaLabel="Open Job Preferences"
          onClick={() => setPreferencesOpen(true)}
        />

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

        {feedError ? (
          <article className="section-card animate-rise delay-2">
            <p className="card-title">{feedError}</p>
            <button className="action-btn mt-2" onClick={() => setRefreshTick((prev) => prev + 1)}>
              Retry
            </button>
          </article>
        ) : null}

        {viewMode === "AI_MATCHES" && !hasResume ? (
          <article className="section-card animate-rise delay-2">
            <p className="card-title">Upload resume to unlock AI Matches</p>
            <p className="soft-text mt-1">Add your resume once, then AI Matches will prioritize your strongest-fit roles.</p>
            <button className="action-btn primary mt-3 w-full" onClick={() => (window.location.href = "/resume")}>
              Upload Resume
            </button>
          </article>
        ) : null}

        {!loadingFeed && jobsByView.length === 0 ? (
          <article className="section-card animate-rise delay-3">
            <p className="card-title">No jobs found</p>
            <p className="soft-text mt-1">Try widening Job Preferences or reducing salary range.</p>
          </article>
        ) : null}

        {(viewMode !== "AI_MATCHES" || hasResume) &&
          jobsByView.map((job, index) => (
            <div key={job.id} className={`delay-${(index % 4) + 1}`}>
              {(() => {
                const verification = inferredVerification(job.applyUrl, job.verificationTier);
                const section = jobSectionLabel(job);
                const region = locationRegionLabel(job.location);
                const style = workStyleLabel(job);
                const whyRole = `Why this role: ${section} fit + ${region} market + ${style.toLowerCase()} preference`;
                const interviewLikelihood = Math.max(
                  42,
                  Math.min(
                    96,
                    45 +
                      (job.matchReason?.length ?? 0) +
                      (verification === "SOURCE_VERIFIED" ? 14 : verification === "DOMAIN_VERIFIED" ? 8 : 2),
                  ),
                );
                const gapFixes = [
                  `Add 2 ${section.toLowerCase()} keywords to resume summary.`,
                  "Quantify one recent outcome with metrics.",
                ];

                return (
                  <JobCard
                    job={job}
                    verification={verification}
                    whyRole={whyRole}
                    mode={viewMode}
                    interviewLikelihood={interviewLikelihood}
                    gapFixes={gapFixes}
                    applyDisabled={!authenticated || tokensLeft <= 0}
                    showUpgradeCta={!isPremium}
                    onCheckMatch={() => (window.location.href = `/resume?jobId=${job.id}`)}
                    onApply={() => setConfirmJob(job)}
                    onUpgrade={() => (window.location.href = "/plans")}
                  />
                );
              })()}
            </div>
          ))}

        {loadingMore ? (
          <article className="section-card animate-rise">
            <p className="soft-text">Loading more jobs...</p>
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
