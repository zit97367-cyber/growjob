"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ApplyRing } from "@/components/apply-ring";
import { MAIN_CATEGORIES } from "@/lib/jobFilters";
import { salaryLabel } from "@/lib/salary";

type Job = {
  id: string;
  title: string;
  company: string;
  location?: string;
  isRemote: boolean;
  description?: string;
  postedAt: string;
  matchReason: string;
  verificationTier: "UNVERIFIED" | "DOMAIN_VERIFIED" | "SOURCE_VERIFIED";
  jobCategory: "AI" | "BACKEND" | "FRONT_END" | "CRYPTO" | "NON_TECH" | "DESIGN" | "MARKETING" | "DATA_SCIENCE" | "OTHER";
  salaryMinUsd?: number | null;
  salaryMaxUsd?: number | null;
  salaryInferred?: boolean;
};

type TokenState = {
  weeklyLimit: number;
  bonusTokensBought: number;
  usedTokens: number;
  tokensLeft: number;
};

const CATEGORY_LABEL: Record<Job["jobCategory"], string> = {
  AI: "AI",
  BACKEND: "Backend",
  FRONT_END: "Front End",
  CRYPTO: "Crypto",
  NON_TECH: "Non Tech",
  DESIGN: "Design",
  MARKETING: "Marketing",
  DATA_SCIENCE: "Data Science",
  OTHER: "Other",
};

export function JobsFeed() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string>("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [salaryFloorK, setSalaryFloorK] = useState(10);
  const [query, setQuery] = useState("");
  const [loadingFeed, setLoadingFeed] = useState(false);

  const totalTokens = useMemo(() => {
    if (!tokenState) return 7;
    return tokenState.weeklyLimit + tokenState.bonusTokensBought;
  }, [tokenState]);

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
    }, 180);

    return () => window.clearTimeout(timer);
  }, [refresh]);

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

  return (
    <AppShell title="GrowJob Feed" subtitle="Focused category search with salary intelligence" badge="Live ATS + Board APIs">
      <section className="hero-card animate-rise">
        <div className="flex items-center justify-between gap-3">
          <ApplyRing used={tokenState?.usedTokens ?? 0} total={totalTokens} />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Remaining</p>
            <p className="text-2xl font-semibold text-white">
              {tokenState?.tokensLeft ?? 0}/{totalTokens}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-full border border-emerald-100/40 bg-emerald-50/10 px-3 py-1 text-xs font-semibold text-emerald-50">
                <input checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} type="checkbox" />
                Remote
              </label>
              <button
                className="rounded-full border border-emerald-100/40 bg-emerald-50/10 px-3 py-1 text-xs font-semibold text-emerald-50"
                onClick={() => postAction("/api/stripe/create-checkout", "Premium upgraded")}
              >
                Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {message ? <p className="toast">{message}</p> : null}

      <section className="section-card mt-3 animate-rise delay-1">
        <div className="flex items-center justify-between gap-2">
          <p className="card-title">Search jobs</p>
          <button
            className="action-btn"
            onClick={() => {
              setCategory("");
              setRemoteOnly(false);
              setSalaryFloorK(10);
              setQuery("");
            }}
          >
            Clear
          </button>
        </div>

        <input
          className="field mt-3"
          placeholder="Search job title or company"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="tag-cloud mt-3">
          {MAIN_CATEGORIES.map((item) => (
            <button
              key={item.value}
              className={`filter-chip ${category === item.value ? "active" : ""}`}
              onClick={() => setCategory((prev) => (prev === item.value ? "" : item.value))}
            >
              {item.label}
            </button>
          ))}
        </div>

        <details className="mt-3 rounded-xl border border-emerald-900/10 bg-white/70 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-[#22463e]">More filters</summary>
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <p className="card-title">Salary Floor</p>
              <span className="soft-text">${salaryFloorK}k+</span>
            </div>
            <input
              className="mt-2 w-full accent-emerald-700"
              type="range"
              min={10}
              max={500}
              step={5}
              value={salaryFloorK}
              onChange={(e) => setSalaryFloorK(Number(e.target.value))}
            />
          </div>
        </details>

        <p className="soft-text mt-2">{loadingFeed ? "Loading..." : `${jobs.length} results`}</p>
      </section>

      <section className="mt-3 space-y-3">
        {!loadingFeed && jobs.length === 0 ? (
          <article className="section-card animate-rise delay-3">
            <p className="card-title">No jobs match the current filters</p>
            <p className="soft-text mt-1">
              Try lowering salary floor, clearing category, or searching by a broader title.
            </p>
          </article>
        ) : null}

        {jobs.slice(0, 30).map((job, index) => (
          <article key={job.id} className={`job-card animate-rise delay-${(index % 4) + 1}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[0.94rem] font-semibold text-[#163d34]">{job.title}</h2>
                <p className="text-[0.72rem] text-[#50756c]">
                  {job.company} · {job.location || "Global"} {job.isRemote ? "· Remote" : ""}
                </p>
                <p className="mt-1 text-[0.69rem] text-[#6b8881]">{job.matchReason}</p>
                <p className="mt-1 text-[0.64rem] uppercase tracking-wide text-[#86a49c]">
                  {new Date(job.postedAt).toLocaleDateString()}
                </p>
              </div>
              <span className="badge-verify">
                {job.verificationTier === "SOURCE_VERIFIED"
                  ? "Source Verified"
                  : job.verificationTier === "DOMAIN_VERIFIED"
                    ? "Domain Verified"
                    : "Unverified"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge-muted">{CATEGORY_LABEL[job.jobCategory] ?? "Other"}</span>
              <span className="badge-muted">
                {salaryLabel(job.salaryMinUsd, job.salaryMaxUsd, Boolean(job.salaryInferred))}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button className="action-btn" onClick={() => postAction(`/api/jobs/${job.id}/save`, "Saved")}>Save</button>
              <button className="action-btn" onClick={() => postAction(`/api/jobs/${job.id}/hide`, "Hidden")}>Hide</button>
              <button className="action-btn" onClick={() => (window.location.href = `/resume?jobId=${job.id}`)}>Check Match %</button>
              <button
                className="action-btn primary"
                disabled={(tokenState?.tokensLeft ?? 0) <= 0}
                onClick={async () => {
                  const data = await postAction(`/api/jobs/${job.id}/apply`, "Applied. Redirecting...");
                  if (data?.redirectUrl) {
                    window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                Apply (-1 token)
              </button>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
