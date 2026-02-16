"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

const links = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/find-talent", label: "Find Talent" },
];

export function MarketingShell({ children }: Props) {
  const pathname = usePathname();

  return (
    <div className="mkt-root">
      <header className="mkt-topbar">
        <Link href="/" className="mkt-brand">
          <span className="mkt-brand-dot" />
          GrowJob
        </Link>
        <nav className="mkt-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mkt-link ${pathname === link.href ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mkt-top-actions">
          <Link href="/pricing" className="mkt-btn ghost">Pricing</Link>
          <Link href="/#get-app" className="mkt-btn solid">Get the App</Link>
        </div>
      </header>

      <main className="mkt-main">{children}</main>

      <footer className="mkt-footer">
        <div>
          <p className="mkt-footer-title">GrowJob</p>
          <p className="mkt-footer-text">One platform to discover roles, apply safely, and improve outcomes.</p>
        </div>
        <div className="mkt-footer-links">
          <Link href="/how-it-works">How It Works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/find-talent">Find Talent</Link>
          <Link href="/#get-app">Get the App</Link>
        </div>
      </footer>
    </div>
  );
}
