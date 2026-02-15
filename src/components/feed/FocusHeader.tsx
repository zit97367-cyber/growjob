"use client";

import { TokenRing } from "@/components/feed/TokenRing";

type Props = {
  remaining: number;
  total: number;
  onUpgrade?: () => void;
  isPremium?: boolean;
};

export function FocusHeader({ remaining, total, onUpgrade, isPremium }: Props) {
  return (
    <section className="focus-header sticky top-0 z-20 animate-rise">
      <div>
        <p className="focus-kicker">Weekly Focus Plan</p>
        <p className="focus-meta">{total} applies/week • Resets 00:00 UTC</p>
      </div>
      <div className="focus-actions">
        <TokenRing remaining={remaining} total={total} />
        {isPremium ? (
          <span className="ghost-chip">Premium</span>
        ) : (
          <button className="action-btn" onClick={onUpgrade}>
            Upgrade to Premium
          </button>
        )}
      </div>
    </section>
  );
}
