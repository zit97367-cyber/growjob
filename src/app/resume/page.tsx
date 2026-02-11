"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";

type Scan = {
  score: number;
  improvements: string[];
  missingKeywords: string[];
  tailoredOutput?: string | null;
};

export default function ResumePage() {
  const [resumeId, setResumeId] = useState<string>("");
  const [scan, setScan] = useState<Scan | null>(null);
  const [message, setMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const score = scan?.score ?? 0;

  const ringStyle = useMemo(() => {
    const pct = Math.max(0, Math.min(100, score || 78));
    return { background: `conic-gradient(#7ce5c0 ${pct}%, rgba(255,255,255,0.2) ${pct}%)` };
  }, [score]);

  async function upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Upload failed");
      return;
    }
    setResumeId(data.resumeId);
    setMessage("Resume uploaded");
  }

  async function runScan() {
    setIsScanning(true);
    const res = await fetch("/api/resume/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resumeId }),
    });
    const data = await res.json();
    setIsScanning(false);
    if (!res.ok) {
      setMessage(data.error ?? "Scan failed");
      return;
    }
    setScan(data.scan);
    setMessage("ATS scan completed");
  }

  return (
    <AppShell title="ATS Resume Score" subtitle="AI-like scanner and fix board" badge="Scan Lab">
      <section className="hero-card text-center animate-rise">
        <div className="mx-auto h-44 w-44 rounded-full p-[10px]" style={ringStyle}>
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b3028]">
            <p className="text-5xl font-semibold text-white">{score || 78}</p>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-50/90">ATS Resume Score</p>
        <p className="text-xs text-emerald-100/80">Upload once, scan often, then use premium tailoring for role-specific edits.</p>
      </section>

      <section className="section-card mt-3 space-y-2 animate-rise delay-1">
        <p className="card-title">Resume Upload</p>
        <input
          className="field"
          type="file"
          accept=".pdf,.docx,.doc"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void upload(file);
            }
          }}
        />
        <button className="action-btn primary w-full" disabled={!resumeId || isScanning} onClick={runScan}>
          {isScanning ? "Scanning..." : "Run ATS Scan"}
        </button>
      </section>

      <section className="section-card mt-3 animate-rise delay-2">
        <div className="flex gap-2">
          <button className="action-btn w-full" onClick={() => setMessage("Credits conversion coming soon")}>Refill Tokens</button>
          <button className="action-btn primary w-full" onClick={() => setMessage("Premium tailoring unlocked")}>Premium Upgrade</button>
        </div>
      </section>

      {message ? <p className="toast mt-3">{message}</p> : null}

      {scan ? (
        <section className="mt-3 space-y-3">
          <article className="section-card animate-rise delay-2">
            <p className="card-title">Top 5 fixes</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#2f5a51]">
              {scan.improvements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="section-card animate-rise delay-3">
            <p className="card-title">Missing keywords</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#2f5a51]">
              {scan.missingKeywords.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="section-card animate-rise delay-4">
            <p className="card-title">Premium Tailor Output</p>
            <p className="mt-2 text-xs text-[#2f5a51]">
              {scan.tailoredOutput ?? "Upgrade to generate tailored rewrite output for this job."}
            </p>
          </article>
        </section>
      ) : null}
    </AppShell>
  );
}
