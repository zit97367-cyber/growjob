import { FeatureRail } from "@/components/marketing/FeatureRail";
import { FlowSteps } from "@/components/marketing/FlowSteps";
import { HeroSplit } from "@/components/marketing/HeroSplit";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { TrustStrip } from "@/components/marketing/TrustStrip";

export default function HomePage() {
  return (
    <MarketingShell>
      <HeroSplit />
      <TrustStrip />
      <FeatureRail />
      <FlowSteps />
      <MarketingCTA
        title="Ready to turn your search into results?"
        body="Download GrowJob app to start using preferences, match confidence, and safe apply workflow."
        primaryLabel="Get the App"
        primaryHref="/#get-app"
        secondaryLabel="Explore Pricing"
        secondaryHref="/pricing"
      />

      <section id="get-app" className="mkt-app-panel mkt-reveal delay-2">
        <div>
          <p className="mkt-kicker">Get The App</p>
          <h2>Mobile app download and QR launch are coming soon.</h2>
          <p>We will add direct APK + QR access here so users can install and explore instantly.</p>
        </div>
        <div className="mkt-app-actions">
          <button className="mkt-btn solid" type="button" disabled>Download APK (Soon)</button>
          <button className="mkt-btn ghost" type="button" disabled>Scan QR (Soon)</button>
        </div>
        <div className="mkt-qr-placeholder" aria-label="QR placeholder">
          QR Placeholder
        </div>
      </section>
    </MarketingShell>
  );
}
