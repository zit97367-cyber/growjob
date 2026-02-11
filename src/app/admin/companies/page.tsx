"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";

type Company = {
  id: string;
  name: string;
  websiteDomain: string;
  careersUrl: string;
  atsType: string;
};

function atsBadge(atsType: string) {
  if (atsType === "GREENHOUSE") return "badge-verify";
  if (atsType === "LEVER") return "badge-verify";
  if (atsType === "ASHBY") return "badge-verify";
  if (atsType === "SMARTRECRUITERS") return "badge-verify";
  return "badge-muted";
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? companies.filter((company) =>
          `${company.name} ${company.websiteDomain} ${company.atsType}`.toLowerCase().includes(normalized),
        )
      : companies;

    return filtered.slice(0, 24);
  }, [companies, query]);

  async function load() {
    const res = await fetch("/api/admin/companies", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Forbidden");
      return;
    }
    setError("");
    setCompanies(data.companies ?? []);
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      void load();
    });
  }, []);

  async function detect(id: string) {
    const res = await fetch(`/api/admin/companies/${id}/detect-ats`, { method: "POST" });
    setMessage(res.ok ? "ATS detected" : "Detection failed");
    await load();
  }

  return (
    <AppShell title="Company Directory" subtitle="Search, verify, and detect ATS configs" badge="Admin">
      {error ? (
        <section className="section-card">
          <p className="card-title text-red-700">Access blocked</p>
          <p className="mt-2 text-xs text-red-700">Sign in with an email listed in ADMIN_EMAILS to manage companies.</p>
        </section>
      ) : (
        <>
          <section className="hero-card animate-rise">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Directory Health</p>
            <p className="mt-1 text-3xl font-semibold">{companies.length}</p>
            <p className="text-xs text-emerald-100/80">companies available for ingestion.</p>
          </section>

          <section className="section-card mt-3 animate-rise delay-1">
            <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company, domain, ATS" />
          </section>

          {message ? <p className="toast mt-3">{message}</p> : null}

          <section className="mt-3 space-y-3">
            {shown.map((company, index) => (
              <article key={company.id} className={`job-card animate-rise delay-${(index % 4) + 1}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#183e35]">{company.name}</p>
                    <p className="text-xs text-[#5b7d75]">{company.websiteDomain}</p>
                    <p className="mt-2 text-[0.64rem] text-[#76928b]">
                      <span className={atsBadge(company.atsType)}>{company.atsType}</span>
                    </p>
                  </div>
                  <button className="action-btn primary" onClick={() => detect(company.id)}>
                    Detect ATS
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </AppShell>
  );
}
