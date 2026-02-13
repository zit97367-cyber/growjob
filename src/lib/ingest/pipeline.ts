import { createHash } from "node:crypto";
import { hasCryptoSignal } from "@/lib/ingest/tags";
import { normalizeJob } from "@/lib/ingest/normalize";
import { UnifiedJob } from "@/lib/ingest/types";

function toTs(value: string | null | undefined) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

export function dedupeHash(job: Pick<UnifiedJob, "company" | "title" | "location" | "applyUrl">) {
  const raw = `${job.company}|${job.title}|${job.location ?? ""}|${job.applyUrl}`.toLowerCase();
  return createHash("sha256").update(raw).digest("hex");
}

export function mergeFirstSeenAt(existing: UnifiedJob[], incoming: UnifiedJob[]) {
  const firstSeenByHash = new Map<string, string>();
  for (const job of existing) {
    firstSeenByHash.set(dedupeHash(job), job.firstSeenAt);
  }

  return incoming.map((job) => {
    const hash = dedupeHash(job);
    const firstSeen = firstSeenByHash.get(hash) ?? job.firstSeenAt;
    return { ...job, firstSeenAt: firstSeen };
  });
}

export function dedupeJobs(jobs: UnifiedJob[]) {
  const byHash = new Map<string, UnifiedJob>();

  for (const job of jobs) {
    const hash = dedupeHash(job);
    const prev = byHash.get(hash);
    if (!prev) {
      byHash.set(hash, { ...job, id: hash });
      continue;
    }

    const prevTs = toTs(prev.postedAt ?? prev.firstSeenAt);
    const nextTs = toTs(job.postedAt ?? job.firstSeenAt);
    if (nextTs >= prevTs) {
      byHash.set(hash, { ...job, id: hash, firstSeenAt: prev.firstSeenAt });
    }
  }

  return [...byHash.values()];
}

export function filterByFreshness(jobs: UnifiedJob[], maxDays = 14) {
  const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
  return jobs.filter((job) => {
    const reference = toTs(job.postedAt ?? job.firstSeenAt);
    return reference >= cutoff;
  });
}

export function normalizeAndFilter(jobs: UnifiedJob[]) {
  return jobs
    .map((job) => normalizeJob(job))
    .filter((job): job is UnifiedJob => Boolean(job))
    .filter((job) => {
      if (job.source === "REMOTIVE") {
        return hasCryptoSignal({ title: job.title, description: job.description });
      }
      return true;
    });
}

export function sortJobs(jobs: UnifiedJob[]) {
  return [...jobs].sort((a, b) => {
    const aTs = toTs(a.postedAt ?? a.firstSeenAt);
    const bTs = toTs(b.postedAt ?? b.firstSeenAt);
    if (bTs !== aTs) return bTs - aTs;
    return a.title.localeCompare(b.title);
  });
}
