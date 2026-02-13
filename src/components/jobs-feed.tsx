"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ApplyRing } from "@/components/apply-ring";
import { filterJobsByTags } from "@/lib/jobFilters";

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
  category?: "TECH" | "NON_TECH" | "HYBRID";
};

type TokenState = {
  weeklyLimit: number;
  bonusTokensBought: number;
  usedTokens: number;
  tokensLeft: number;
};

const domainTags = [
  "ai",
  "analyst",
  "backend",
  "bitcoin",
  "blockchain",
  "community manager",
  "crypto",
  "cryptography",
  "cto",
  "customer support",
  "dao",
  "data science",
  "defi",
  "design",
  "developer relations",
  "devops",
  "economy designer",
  "entry level",
  "evm",
  "front end",
  "full stack",
  "golang",
  "intern",
  "javascript",
  "layer 2",
  "marketing",
  "mobile",
  "moderator",
  "nft",
  "node",
  "non tech",
  "open source",
  "product manager",
  "project manager",
  "react",
  "research",
  "rust",
  "sales",
  "smart contract",
  "solana",
  "solidity",
  "web3",
  "web3js",
  "zero knowledge",
];

export function JobsFeed() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [message, setMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [salaryBand, setSalaryBand] = useState(150);

  const totalTokens = useMemo(() => {
    if (!tokenState) return 7;
    return tokenState.weeklyLimit + tokenState.bonusTokensBought;
  }, [tokenState]);

  const filteredJobs = useMemo(() => filterJobsByTags(jobs, selectedTags, remoteOnly), [jobs, selectedTags, remoteOnly]);

  async function refresh() {
    const [jobsRes, tokenRes] = await Promise.all([
      fetch("/api/jobs/feed", { cache: "no-store" }),
      fetch("/api/me/token-state", { cache: "no-store" }),
    ]);

    const jobsJson = await jobsRes.json();
    const tokenJson = await tokenRes.json();

    setJobs(jobsJson.jobs ?? []);
    setTokenState(tokenJson.tokenState ?? null);
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      void refresh();
    });
  }, []);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  }

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
    <AppShell title="Home Jobs Feed" subtitle="Curated multi-domain roles and deep interactions" badge="Live ATS">
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
                <input
                  checked={remoteOnly}
                  onChange={(e) => setRemoteOnly(e.target.checked)}
                  type="checkbox"
                />
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
          <p className="card-title">Tag, Location, Company</p>
          <button
            className="action-btn"
            onClick={() => {
              setSelectedTags([]);
              setRemoteOnly(false);
            }}
          >
            Clear Filters
          </button>
        </div>
        <p className="soft-text mt-1">
          Add marketing, sales, design, data, and engineering domains to your feed requirements.
        </p>
        <p className="soft-text mt-1">{filteredJobs.length} results</p>

        <div className="tag-cloud mt-3">
          {domainTags.map((tag) => (
            <button
              key={tag}
              className={`filter-chip ${selectedTags.includes(tag) ? "active" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section className="section-card mt-3 animate-rise delay-2">
        <div className="flex items-center justify-between">
          <p className="card-title">Salary Range</p>
          <span className="soft-text">${salaryBand}k+</span>
        </div>
        <input
          className="mt-3 w-full accent-emerald-700"
          type="range"
          min={80}
          max={320}
          step={5}
          value={salaryBand}
          onChange={(e) => setSalaryBand(Number(e.target.value))}
        />
      </section>

      <section className="mt-3 space-y-3">
        {filteredJobs.length === 0 ? (
          <article className="section-card animate-rise delay-3">
            <p className="card-title">No jobs match your current filters</p>
            <p className="soft-text mt-1">
              Try clearing filters or using related tags like marketing, design, sales, customer support, product
              manager.
            </p>
          </article>
        ) : null}

        {filteredJobs.slice(0, 30).map((job, index) => (
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
            <div className="mt-2">
              <span className="badge-muted">{job.category ?? "TECH"}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button className="action-btn" onClick={() => postAction(`/api/jobs/${job.id}/save`, "Saved")}>Save</button>
              <button className="action-btn" onClick={() => postAction(`/api/jobs/${job.id}/hide`, "Hidden")}>Hide</button>
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
