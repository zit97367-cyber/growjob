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

export function JobsFeed() {
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [message, setMessage] = useState("");

  const [category, setCategory] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [salaryFloorK, setSalaryFloorK] = useState(10);
  const [query, setQuery] = useState("");

  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [freshOnly, setFreshOnly] = useState(false);

  const [loadingFeed, setLoadingFeed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [confirmJob, setConfirmJob] = useState<FeedJob | null>(null);

  const weeklyCap = useMemo(() => {
    if (!tokenState) return 7;
    return tokenState.weeklyLimit + tokenState.bonusTokensBought;
  }, [tokenState]);

  const tokensLeft = useMemo(() => {
    if (!tokenState) return 7;
    if (typeof tokenState.tokensLeft === "number") return tokenState.tokensLeft;
    return Math.max(0, weeklyCap - tokenState.usedTokens);
  }, [tokenState, weeklyCap]);

  const refresh = useCallback(async () => {
    setLoadingFeed(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (remoteOnly) params.set("remoteOnly", "true");
    if (query.trim()) params.set("q", query.trim());
    params.set("salaryFloorK", String(salaryFloorK));

    const [jobsRes, tokenRes] = await Promise.all([
      fetch(`/api/jobs/feed?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/me/token-state", { cache: "no-store" }),
    ]);

    const jobsJson = await jobsRes.json();
    const tokenJson = await tokenRes.json();

    setJobs(jobsJson.jobs ?? []);
    setTokenState(tokenJson.tokenState ?? null);
    setLoadingFeed(false);
  }, [category, query, remoteOnly, salaryFloorK]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 140);
    return () => window.clearTimeout(timer);
  }, [refresh]);

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
    <AppShell title="GrowJob Feed" subtitle="Premium productivity view" badge="Live">
      <FocusHeader remaining={tokensLeft} total={weeklyCap} onUpgrade={() => void postAction("/api/stripe/create-checkout", "Premium upgraded")} />

      {message ? <p className="toast mt-3">{message}</p> : null}

      <JobsToolbar
        query={query}
        onQueryChange={setQuery}
        remoteOnly={remoteOnly}
        setRemoteOnly={setRemoteOnly}
        verifiedOnly={verifiedOnly}
        setVerifiedOnly={setVerifiedOnly}
        freshOnly={freshOnly}
        setFreshOnly={setFreshOnly}
        onOpenFilters={() => setFiltersOpen(true)}
        count={displayJobs.length}
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
        {!loadingFeed && displayJobs.length === 0 ? (
          <article className="section-card animate-rise delay-3">
            <p className="card-title">No jobs match the current filters</p>
            <p className="soft-text mt-1">Try clearing filters or switching off verified/fresh chips.</p>
          </article>
        ) : null}

        {displayJobs.slice(0, 30).map((job, index) => (
          <div key={job.id} className={`delay-${(index % 4) + 1}`}>
            <JobCard
              job={job}
              whyMatch={deriveMatchReason({ job, selectedCategory: category, query, salaryFloorK })}
              verification={inferredVerification(job.applyUrl, job.verificationTier)}
              applyDisabled={tokensLeft <= 0}
              onSave={() => void postAction(`/api/jobs/${job.id}/save`, "Saved")}
              onHide={() => void postAction(`/api/jobs/${job.id}/hide`, "Hidden")}
              onCheckMatch={() => (window.location.href = `/resume?jobId=${job.id}`)}
              onApply={() => setConfirmJob(job)}
              onUpgrade={() => void postAction("/api/stripe/create-checkout", "Premium upgraded")}
            />
          </div>
        ))}
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
