const features = [
  {
    title: "Smart discovery",
    body: "Fresh jobs from reliable sources, ranked for fit and relevance.",
  },
  {
    title: "Match confidence",
    body: "Check role likelihood before applying and prioritize stronger opportunities.",
  },
  {
    title: "Safe apply workflow",
    body: "Apply through guarded links with user-protective handling built in.",
  },
  {
    title: "Weekly momentum",
    body: "Track your search outcomes and keep your application cycle focused.",
  },
];

export function FeatureRail() {
  return (
    <section className="mkt-feature-grid">
      {features.map((feature, index) => (
        <article key={feature.title} className={`mkt-feature-card mkt-reveal delay-${Math.min(index, 3)}`}>
          <h3>{feature.title}</h3>
          <p>{feature.body}</p>
        </article>
      ))}
    </section>
  );
}
