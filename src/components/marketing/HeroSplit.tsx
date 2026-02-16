"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const rotating = [
  {
    title: "Senior Product Marketing Manager",
    company: "LayerZero Labs",
    meta: "Remote • Marketing • Competitive Salary",
    confidence: "82%",
  },
  {
    title: "Protocol Backend Engineer",
    company: "Offchain Labs",
    meta: "US / Europe • Engineering • $140k-$190k",
    confidence: "88%",
  },
  {
    title: "Community Growth Lead",
    company: "Base Ecosystem",
    meta: "APAC • Community • Competitive Salary",
    confidence: "79%",
  },
];

export function HeroSplit() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % rotating.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  const card = useMemo(() => rotating[active], [active]);

  return (
    <section className="mkt-hero">
      <div className="mkt-hero-copy mkt-reveal">
        <p className="mkt-kicker">GrowJob</p>
        <h1>Apply to better roles with confidence, not guesswork.</h1>
        <p>
          A modern Web3 career platform for focused discovery, safer apply flow, and weekly progress you can measure.
        </p>
        <div className="mkt-actions">
          <Link href="/#get-app" className="mkt-btn solid">Get the App</Link>
          <Link href="/how-it-works" className="mkt-btn ghost">See How It Works</Link>
        </div>
      </div>

      <div className="mkt-hero-mock mkt-reveal delay-1">
        <article className="mkt-mock-card top">
          <p className="mkt-card-label">Live Role Signal</p>
          <h3>{card.title}</h3>
          <p>{card.company}</p>
          <p className="mkt-card-meta">{card.meta}</p>
        </article>
        <article className="mkt-mock-card mid">
          <p className="mkt-card-label">Match Confidence</p>
          <h3>{card.confidence}</h3>
          <p>Role fit + location fit + skill overlap</p>
          <div className="mkt-confidence-track">
            <span className="mkt-confidence-fill" style={{ width: card.confidence }} />
          </div>
        </article>
        <article className="mkt-mock-card low">
          <p className="mkt-card-label">Safe Apply Layer</p>
          <h3>Link Safety Enabled</h3>
          <p>Broken-link protection and token safety checks are active.</p>
        </article>
      </div>
    </section>
  );
}
