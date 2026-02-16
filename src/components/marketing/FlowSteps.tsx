type Step = {
  step: string;
  title: string;
  body: string;
};

const steps: Step[] = [
  {
    step: "Step 1",
    title: "Set your preferences",
    body: "Choose target roles, locations, work style, and salary range.",
  },
  {
    step: "Step 2",
    title: "Upload resume",
    body: "Unlock stronger AI match recommendations from your profile.",
  },
  {
    step: "Step 3",
    title: "Apply safely",
    body: "Move fast with validated links and practical confidence cues.",
  },
];

export function FlowSteps() {
  return (
    <section className="mkt-flow-band">
      <h2>How GrowJob works</h2>
      <div className="mkt-flow-grid">
        {steps.map((item, index) => (
          <article key={item.title} className={`mkt-flow-card mkt-reveal delay-${Math.min(index, 3)}`}>
            <p className="mkt-flow-step">{item.step}</p>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
