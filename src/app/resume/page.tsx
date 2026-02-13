"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";

type Scan = {
  score: number;
  matchProbability?: number | null;
  matchReason?: string | null;
  improvements: string[];
  missingKeywords: string[];
  detailedSuggestions?: string[];
  tailoredOutput?: string | null;
};

type FeedJob = {
  id: string;
  title: string;
  company: string;
};

export default function ResumePage() {
  const [resumeId, setResumeId] = useState("");
  const [scan, setScan] = useState<Scan | null>(null);
  const [message, setMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [jobId, setJobId] = useState("");

  const score = scan?.score ?? 0;
  const probability = scan?.matchProbability ?? 0;

  const scoreRingStyle = useMemo(() => {
    const pct = Math.max(0, Math.min(100, score || 78));
    return { background: `conic-gradient(#7ce5c0 ${pct}%, rgba(255,255,255,0.2) ${pct}%)` };
  }, [score]);

  const probabilityRingStyle = useMemo(() => {
    const pct = Math.max(0, Math.min(100, probability));
    return { background: `conic-gradient(#34d399 ${pct}%, rgba(255,255,255,0.2) ${pct}%)` };
  }, [probability]);

  useEffect(() => {
    void (async () => {
      const fromQuery = new URLSearchParams(window.location.search).get("jobId") ?? "";
      const res = await fetch("/api/jobs/feed?salaryFloorK=10", { cache: "no-store" });
      const data = await res.json();
      const nextJobs: FeedJob[] = (data.jobs ?? []).slice(0, 100).map((job: FeedJob) => ({
        id: job.id,
        title: job.title,
        company: job.company,
      }));
      setJobs(nextJobs);
      setJobId((prev) => prev || fromQuery || nextJobs[0]?.id || "");
    })();
  }, []);

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
      body: JSON.stringify({ resumeId, jobId }),
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
    <AppShell title="ATS Resume Score" subtitle="Resume quality + probability of match for target jobs" badge="Scan Lab">
      <section className="hero-card animate-rise">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="mx-auto h-36 w-36 rounded-full p-[10px]" style={scoreRingStyle}>
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b3028]">
                <p className="text-4xl font-semibold text-white">{score || 78}</p>
              </div>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50/90">ATS Score</p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-36 w-36 rounded-full p-[10px]" style={probabilityRingStyle}>
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b3028]">
                <p className="text-4xl font-semibold text-white">{probability}%</p>
              </div>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50/90">Match Probability</p>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-emerald-100/80">
          {scan?.matchReason ?? "Select a target job and run scan to estimate acceptance probability."}
        </p>
      </section>

      <section className="section-card mt-3 space-y-2 animate-rise delay-1">
        <p className="card-title">Resume + Target Job</p>
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

        <select className="field" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">Select target job</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} · {job.company}
            </option>
          ))}
        </select>

        <button className="action-btn primary w-full" disabled={!resumeId || !jobId || isScanning} onClick={runScan}>
          {isScanning ? "Scanning..." : "Run ATS + Match Scan"}
        </button>
      </section>

      {message ? <p className="toast mt-3">{message}</p> : null}

      {scan ? (
        <section className="mt-3 space-y-3">
          <article className="section-card animate-rise delay-2">
            <p className="card-title">Top fixes</p>
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
            <p className="card-title">Detailed suggestions (Premium)</p>
            {scan.detailedSuggestions && scan.detailedSuggestions.length > 0 ? (
              <div className="space-y-2">
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#2f5a51]">
                  {scan.detailedSuggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="text-xs text-[#2f5a51]">
                  {scan.tailoredOutput ?? "Tailored rewrite guidance is available for premium users."}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#2f5a51]">Upgrade to unlock detailed rewrite guidance and job-tailored improvements.</p>
            )}
          </article>
        </section>
      ) : null}
    </AppShell>
  );
}
