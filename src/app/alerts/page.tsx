"use client";

import { AppShell } from "@/components/app-shell";

const items = [
  {
    title: "3 new roles match your filters",
    body: "Smart Picks found fresh opportunities in Marketing and Non-Tech.",
    time: "2m ago",
  },
  {
    title: "Weekly apply window refreshed",
    body: "Your weekly cap is active. Use Best Matches to prioritize higher fit roles.",
    time: "Today",
  },
  {
    title: "Resume scan ready",
    body: "Run ATS check from the ATS tab to get your latest match probability.",
    time: "Yesterday",
  },
];

export default function AlertsPage() {
  return (
    <AppShell title="Alerts" subtitle="Track opportunities and account signals" badge="Inbox">
      <section className="section-card animate-rise">
        <p className="card-title">Notification center</p>
        <p className="soft-text mt-1">Only high-signal updates are shown here.</p>
      </section>

      <section className="mt-3 space-y-3">
        {items.map((item, index) => (
          <article key={item.title} className={`section-card animate-rise delay-${(index % 4) + 1}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="job-title text-[0.95rem]">{item.title}</h2>
                <p className="job-meta mt-1">{item.body}</p>
              </div>
              <span className="badge-muted">{item.time}</span>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
