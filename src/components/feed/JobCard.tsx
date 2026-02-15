"use client";

import { FeedJob } from "@/components/feed/types";
import { VerifiedBadge } from "@/components/feed/VerifiedBadge";
import { VerificationStatus, jobSectionLabel } from "@/lib/feedUi";
import { salaryLabel } from "@/lib/salary";

type Props = {
  job: FeedJob;
  verification: VerificationStatus;
  applyDisabled: boolean;
  showUpgradeCta: boolean;
  onCheckMatch: () => void;
  onApply: () => void;
  onUpgrade: () => void;
};

export function JobCard({ job, verification, applyDisabled, showUpgradeCta, onCheckMatch, onApply, onUpgrade }: Props) {
  const salaryText =
    job.salaryMinUsd || job.salaryMaxUsd
      ? salaryLabel(job.salaryMinUsd, job.salaryMaxUsd, Boolean(job.salaryInferred))
      : "Competitive Salary";

  return (
    <article className="job-card-premium animate-rise">
      <h2 className="job-title">{job.title}</h2>
      <p className="job-meta mt-1">{job.company}</p>

      <div className="mt-3 space-y-2 text-sm text-[#335950]">
        <p><span className="font-semibold text-[#213f37]">Salary:</span> {salaryText}</p>
        <p><span className="font-semibold text-[#213f37]">Location:</span> {job.location || "Remote / Global"}</p>
        <p><span className="font-semibold text-[#213f37]">Section:</span> {jobSectionLabel(job)}</p>
      </div>

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
