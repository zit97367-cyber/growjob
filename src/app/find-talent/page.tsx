import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export default function FindTalentPage() {
  return (
    <MarketingShell>
      <section className="mkt-section-head mkt-reveal">
        <p className="mkt-kicker">Find Talent</p>
        <h1>Hiring workspace is coming soon.</h1>
        <p>We are designing a recruiter experience for sourcing high-signal Web3 candidates.</p>
      </section>

      <section className="mkt-coming-soon-card mkt-reveal delay-1">
        <span className="ghost-chip">Coming Soon</span>
        <h2>Recruiter tools in progress</h2>
        <p>Planned modules for v2 include candidate discovery, profile verification, and hiring pipeline analytics.</p>
        <div className="mkt-teaser-grid">
          <article>
            <h3>Candidate discovery</h3>
            <p>Filter by role fit, resume quality, and location preferences.</p>
          </article>
          <article>
            <h3>Verified profiles</h3>
            <p>Prioritize candidates with complete profiles and reliable apply history.</p>
          </article>
          <article>
            <h3>Hiring analytics</h3>
            <p>Track interview conversion and source performance in one view.</p>
          </article>
        </div>
      </section>

      <MarketingCTA
        title="Hiring dashboard arriving soon"
        body="We will launch a focused recruiter workspace with candidate quality signals and pipeline visibility."
        primaryLabel="Back to Home"
        primaryHref="/"
      />
    </MarketingShell>
  );
}
