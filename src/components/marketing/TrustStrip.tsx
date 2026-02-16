const items = [
  "Apply with confidence",
  "Match % before applying",
  "Safer links, fewer dead ends",
];

export function TrustStrip() {
  return (
    <section className="mkt-trust mkt-reveal delay-1">
      {items.map((item) => (
        <article key={item} className="mkt-trust-pill">
          {item}
        </article>
      ))}
    </section>
  );
}
