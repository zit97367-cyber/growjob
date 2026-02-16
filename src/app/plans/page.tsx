"use client";

import { AppShell } from "@/components/app-shell";

export default function PlansPage() {
  return (
    <AppShell title="Plans" subtitle="Choose the plan that fits your job hunt">
      <section className="section-card animate-rise">
        <p className="card-title">Free</p>
        <p className="soft-text mt-1">7 applies / week</p>
      </section>

      <section className="section-card mt-3 animate-rise delay-1">
        <p className="card-title">Premium</p>
        <p className="soft-text mt-1">20 applies / week + advanced match tools</p>
        <button
          className="action-btn primary mt-3 w-full"
          onClick={async () => {
            const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
            const data = await res.json();
            if (data?.url) {
              window.location.href = data.url;
              return;
            }
            if (data?.ok && data?.upgraded) {
              window.location.href = "/jobs";
            }
          }}
        >
          Continue to Payment
        </button>
      </section>
    </AppShell>
  );
}
