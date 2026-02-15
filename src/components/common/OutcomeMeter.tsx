"use client";

type Props = {
  score: number;
  title?: string;
  subtitle: string;
  nextAction: string;
};

export function OutcomeMeter({ score, title = "Outcome Meter", subtitle, nextAction }: Props) {
  const bounded = Math.max(0, Math.min(100, score));

  return (
    <section className="section-card outcome-meter animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="card-title">{title}</p>
          <p className="soft-text mt-1">{subtitle}</p>
        </div>
        <p className="outcome-score">{bounded}</p>
      </div>

      <div className="confidence-track mt-3">
        <div className="confidence-fill" style={{ width: `${bounded}%` }} />
      </div>

      <p className="next-action mt-3">
        <strong>Next Best Action:</strong> {nextAction}
      </p>
    </section>
  );
}
