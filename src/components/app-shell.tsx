"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
};

const tabs = [
  { href: "/", label: "Feed" },
  { href: "/profile", label: "Profile" },
  { href: "/resume", label: "ATS" },
  { href: "/admin/companies", label: "Admin" },
];

export function AppShell({ title, subtitle, badge, children }: Props) {
  const pathname = usePathname();

  return (
    <div className="phone-shell">
      <div className="shell-scroll">
        <header className="shell-top">
          <div>
            <h1 className="shell-title">{title}</h1>
            <p className="shell-subtitle">{subtitle}</p>
          </div>
          {badge ? <span className="ghost-chip">{badge}</span> : null}
        </header>

        {children}
      </div>

      <nav className="bottom-nav">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link key={tab.href} href={tab.href} className={`nav-item ${active ? "active" : ""}`}>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
