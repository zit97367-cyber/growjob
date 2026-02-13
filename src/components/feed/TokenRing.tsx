"use client";

type Props = {
  remaining: number;
  total: number;
};

export function TokenRing({ remaining, total }: Props) {
  const safeTotal = Math.max(1, total);
  const safeRemaining = Math.max(0, Math.min(safeTotal, remaining));
  const pct = safeRemaining / safeTotal;

  const size = 76;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (1 - pct);

  return (
    <div className="token-ring" aria-label={`Applications remaining ${safeRemaining} of ${safeTotal}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="token-ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        <circle
          className="token-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dash}
        />
      </svg>
      <div className="token-ring-center">
        <p className="token-ring-value">{safeRemaining}</p>
        <p className="token-ring-label">left</p>
      </div>
    </div>
  );
}
