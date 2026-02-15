"use client";

type Props = {
  title: string;
  body: string;
  impact: string;
  ctaLabel?: string;
  onClick?: () => void;
};

export function ActionImpactCard({ title, body, impact, ctaLabel, onClick }: Props) {
  return (
    <article className="section-card action-impact-card animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="job-title text-[0.95rem]">{title}</h3>
          <p className="soft-text mt-1">{body}</p>
        </div>
        <span className="impact-chip">{impact}</span>
      </div>
      {ctaLabel ? (
        <button className="action-btn mt-3" onClick={onClick}>
          {ctaLabel}
        </button>
      ) : null}
    </article>
  );
}
