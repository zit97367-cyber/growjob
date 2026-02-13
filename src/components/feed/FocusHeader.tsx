"use client";

import { TokenRing } from "@/components/feed/TokenRing";

type Props = {
  remaining: number;
  total: number;
  onUpgrade: () => void;
};

export function FocusHeader({ remaining, total, onUpgrade }: Props) {
  return (
    <section className="focus-header sticky top-0 z-20 animate-rise">
      <div>
        <p className="focus-kicker">Weekly Focus Plan</p>
        <p className="focus-meta">{total} applies/week • Resets 00:00 UTC</p>
      </div>
      <div className="focus-actions">
        <TokenRing remaining={remaining} total={total} />
        <button className="action-btn" onClick={onUpgrade}>
          Upgrade
        </button>
      </div>
    </section>
  );
}
