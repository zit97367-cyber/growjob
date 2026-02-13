"use client";

import { FeedJob } from "@/components/feed/types";
import { VerifiedBadge } from "@/components/feed/VerifiedBadge";
import { VerificationStatus, daysAgo, timeAgo } from "@/lib/feedUi";
import { salaryLabel } from "@/lib/salary";

type Props = {
  job: FeedJob;
  whyMatch: string;
  verification: VerificationStatus;
  applyDisabled: boolean;
  onSave: () => void;
  onHide: () => void;
  onCheckMatch: () => void;
  onApply: () => void;
  onUpgrade: () => void;
};

function postedTone(days: number) {
  if (days <= 1) return "fresh";
  if (days <= 4) return "warm";
  return "aged";
}

export function JobCard({ job, whyMatch, verification, applyDisabled, onSave, onHide, onCheckMatch, onApply, onUpgrade }: Props) {
  const ageDays = daysAgo(job.postedAt);

  return (
    <article className="job-card-premium animate-rise">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="job-title">{job.title}</h2>
          <p className="job-meta">
            {job.company} · {job.location || "Global"} {job.isRemote ? "· Remote" : ""}
          </p>
        </div>
        <VerifiedBadge status={verification} />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <span className={`posted-chip ${postedTone(ageDays)}`}>{timeAgo(job.postedAt)}</span>
        {job.jobCategory ? <span className="badge-muted">{job.jobCategory.replace("_", " ")}</span> : null}
        <span className="badge-muted">{salaryLabel(job.salaryMinUsd, job.salaryMaxUsd, Boolean(job.salaryInferred))}</span>
      </div>

      <p className="why-match mt-2">Why this matches you: {whyMatch}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="action-btn" onClick={onSave}>Save</button>
        <button className="action-btn" onClick={onHide}>Hide</button>
        <button className="action-btn" onClick={onCheckMatch}>Check Match %</button>
        <button className={`action-btn primary apply-btn ${applyDisabled ? "locked" : ""}`} onClick={onApply} disabled={applyDisabled}>
          {applyDisabled ? "🔒 Apply" : "Apply (-1 token)"}
        </button>
      </div>

      {applyDisabled ? (
        <button className="upgrade-inline mt-2" onClick={onUpgrade}>Upgrade for 20/week</button>
      ) : null}
    </article>
  );
}
