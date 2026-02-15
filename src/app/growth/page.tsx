"use client";

import { AppShell } from "@/components/app-shell";

export default function GrowthPage() {
  return (
    <AppShell title="Growth" subtitle="Track your progress and job outcomes" badge="Progress">
      <section className="hero-card animate-rise">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/90">Progress Score</p>
        <p className="mt-2 text-5xl font-semibold text-white">58.2</p>
        <p className="mt-2 text-xs text-emerald-100/85">Complete simple actions to improve your chances of getting hired.</p>
      </section>

      <section className="section-card mt-3 animate-rise delay-1">
        <p className="card-title">Job bounties</p>
        <article className="job-card-premium mt-2">
          <p className="badge-muted inline-flex">$10,000 referral bounty</p>
          <h3 className="job-title mt-2">Junior Crypto Analyst & Trader</h3>
          <p className="job-meta">White Bridge LTD · Remote (Worldwide)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge-muted">$48k - $60k / year</span>
            <span className="badge-muted">Part-time</span>
            <span className="badge-muted">30+ days ago</span>
          </div>
        </article>
      </section>

      <section className="section-card mt-3 animate-rise delay-2">
        <p className="card-title">Quests</p>
        <div className="mt-2 space-y-2 text-xs text-[#355b54]">
          <p>• Complete your profile sections</p>
          <p>• Run ATS scan on 3 target jobs</p>
          <p>• Refer one candidate</p>
        </div>
        <button className="action-btn primary mt-3 w-full">Start quests</button>
      </section>
    </AppShell>
  );
}
