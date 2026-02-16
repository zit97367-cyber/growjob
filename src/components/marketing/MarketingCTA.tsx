import Link from "next/link";

type Props = {
  title: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function MarketingCTA({
  title,
  body,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: Props) {
  return (
    <section className="mkt-cta mkt-reveal delay-1">
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="mkt-actions">
        <Link href={primaryHref} className="mkt-btn solid">{primaryLabel}</Link>
        {secondaryLabel && secondaryHref ? (
          <Link href={secondaryHref} className="mkt-btn ghost">{secondaryLabel}</Link>
        ) : null}
      </div>
    </section>
  );
}
