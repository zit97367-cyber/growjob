import Link from "next/link";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { MarketingShell } from "@/components/marketing/marketing-shell";

const steps = [
  {
    title: "Discover roles",
    body: "Browse fresh Web3 listings from trusted connectors with clear role context and section labels.",
  },
  {
    title: "Validate match",
    body: "Use resume-driven AI match signals and practical reasons before spending an apply token.",
  },
  {
    title: "Apply safely",
    body: "Apply via validated links with built-in safeguards to reduce broken-link frustration.",
  },
  {
    title: "Track progress",
    body: "Improve profile strength and apply quality every week with focused actions.",
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <section className="mkt-section-head mkt-reveal">
        <p className="mkt-kicker">How it works</p>
        <h1>A simple workflow from discovery to outcomes.</h1>
        <p>GrowJob is designed to keep decisions clear and reduce friction in your job search.</p>
      </section>

      <section className="mkt-timeline-grid">
        {steps.map((step, index) => (
          <article key={step.title} className={`mkt-timeline-card mkt-reveal delay-${Math.min(index, 3)}`}>
            <p className="mkt-flow-step">0{index + 1}</p>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      <section className="mkt-compare-card mkt-reveal delay-1">
        <h2>What makes GrowJob different</h2>
        <ul>
          <li>Focused on application quality, not just job volume.</li>
          <li>Match confidence and clear role signals before apply.</li>
          <li>Safer link handling across external job sources.</li>
        </ul>
        <Link href="/#get-app" className="mkt-btn ghost mt-4 inline-flex">Get the App</Link>
      </section>

      <MarketingCTA
        title="Start your weekly application loop"
        body="Use role signals, confidence checks, and safer links to apply with less friction."
        primaryLabel="Get the App"
        primaryHref="/#get-app"
      />
    </MarketingShell>
  );
}
