"use client";

import { FeedJob } from "@/components/feed/types";
import { VerifiedBadge } from "@/components/feed/VerifiedBadge";
import { RiskLevel, VerificationStatus, inferRiskLevel, jobSectionLabel, timeAgo } from "@/lib/feedUi";
import { salaryLabel } from "@/lib/salary";

type Props = {
  job: FeedJob;
  verification: VerificationStatus;
  whyRole: string;
  mode: "JOBS_FOR_YOU" | "AI_MATCHES" | "ALL_JOBS";
  interviewLikelihood?: number;
  gapFixes?: string[];
  applyDisabled: boolean;
  showUpgradeCta: boolean;
  onCheckMatch: () => void;
  onApply: () => void;
  onUpgrade: () => void;
};

function riskCopy(level: RiskLevel) {
  if (level === "HIGH") return "Risk banner: weak source signals, review before applying.";
  if (level === "MEDIUM") return "Risk banner: partial source confidence.";
  return "Source checks look healthy.";
}

export function JobCard({
  job,
  verification,
  whyRole,
  mode,
  interviewLikelihood,
  gapFixes,
  applyDisabled,
  showUpgradeCta,
  onCheckMatch,
  onApply,
  onUpgrade,
}: Props) {
  const salaryText =
    job.salaryMinUsd || job.salaryMaxUsd
      ? salaryLabel(job.salaryMinUsd, job.salaryMaxUsd, Boolean(job.salaryInferred))
      : "Competitive Salary";
  const riskLevel = inferRiskLevel({ verification, postedAt: job.postedAt, applyUrl: job.applyUrl });
  const showRisk = riskLevel !== "LOW";

  return (
    <article className="job-card-premium animate-rise">
      <h2 className="job-title">{job.title}</h2>
      <p className="job-meta mt-1">{job.company}</p>

      <div className="mt-3 space-y-2 text-sm text-[#335950]">
        <p><span className="font-semibold text-[#213f37]">Salary:</span> {salaryText}</p>
        <p><span className="font-semibold text-[#213f37]">Location:</span> {job.location || "Remote / Global"}</p>
        <p><span className="font-semibold text-[#213f37]">Section:</span> {jobSectionLabel(job)}</p>
        <p><span className="font-semibold text-[#213f37]">Posted:</span> {timeAgo(job.postedAt)}</p>
      </div>

      <p className="why-role mt-2">{whyRole}</p>

      {mode === "AI_MATCHES" ? (
        <div className="ai-match-box mt-2">
          <p className="text-xs font-semibold text-[#21453d]">Interview likelihood: {Math.max(0, Math.min(99, interviewLikelihood ?? 62))}%</p>
          {gapFixes && gapFixes.length > 0 ? (
            <ul className="mt-1 list-disc pl-4 text-xs text-[#3b5f56]">
              {gapFixes.slice(0, 2).map((fix) => (
                <li key={fix}>{fix}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {showRisk ? <p className={`risk-banner ${riskLevel.toLowerCase()}`}>{riskCopy(riskLevel)}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="action-btn" onClick={onCheckMatch}>Check Match %</button>
        <VerifiedBadge status={verification} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className={`action-btn primary apply-btn ${applyDisabled ? "locked" : ""}`} onClick={onApply} disabled={applyDisabled}>
          {applyDisabled ? "Apply Locked" : "Apply"}
        </button>
        {applyDisabled && showUpgradeCta ? (
          <button className="upgrade-inline" onClick={onUpgrade}>Upgrade to Premium</button>
        ) : null}
      </div>
    </article>
  );
}
