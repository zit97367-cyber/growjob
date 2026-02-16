import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mkt-section-head mkt-reveal">
        <p className="mkt-kicker">Pricing</p>
        <h1>Simple plans for focused job search.</h1>
        <p>Start free, upgrade when you want more weekly applications and premium match tooling.</p>
      </section>

      <section className="mkt-pricing-grid">
        <article className="mkt-price-card mkt-reveal">
          <p className="mkt-price-label">Free</p>
          <h2>$0</h2>
          <p className="mkt-price-sub">Best for getting started</p>
          <ul>
            <li>7 applies per week</li>
            <li>Unlimited save/hide</li>
            <li>Resume upload + basic match confidence</li>
          </ul>
          <Link href="/#get-app" className="mkt-btn ghost mt-4 inline-flex">Get App Access</Link>
        </article>

        <article className="mkt-price-card featured mkt-reveal delay-1">
          <p className="mkt-price-label">Premium</p>
          <h2>Upgrade</h2>
          <p className="mkt-price-sub">For higher-volume, higher-quality applying</p>
          <ul>
            <li>20 applies per week</li>
            <li>Advanced ATS suggestions</li>
            <li>Priority match workflow</li>
          </ul>
          <Link href="/plans" className="mkt-btn solid mt-4 inline-flex">Continue to Plans</Link>
        </article>
      </section>

      <MarketingCTA
        title="Start free, upgrade when ready"
        body="Your free plan includes the core workflow. Install the app first, then upgrade when needed."
        primaryLabel="Open Plans"
        primaryHref="/plans"
        secondaryLabel="Get the App"
        secondaryHref="/#get-app"
      />
    </MarketingShell>
  );
}
