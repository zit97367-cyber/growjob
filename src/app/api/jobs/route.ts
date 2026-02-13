import { NextRequest, NextResponse } from "next/server";
import { getJobsCacheOrRefresh } from "@/lib/ingest/index";
import { detectTags } from "@/lib/ingest/tags";
import { computeVerificationTier } from "@/lib/verify";

function toBool(value: string | null) {
  return value === "true";
}

function toDays(value: string | null) {
  const parsed = Number(value ?? "7");
  if (!Number.isFinite(parsed)) return 7;
  return Math.min(10, Math.max(1, parsed));
}

function rankVerification(tier: string) {
  if (tier === "SOURCE_VERIFIED") return 3;
  if (tier === "DOMAIN_VERIFIED") return 2;
  return 1;
}

function toTimestamp(value: string | null) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;

  const days = toDays(search.get("days"));
  const verifiedOnly = toBool(search.get("verifiedOnly"));
  const remoteOnly = toBool(search.get("remoteOnly"));
  const tag = (search.get("tag") ?? "").toLowerCase().trim();
  const q = (search.get("q") ?? "").toLowerCase().trim();

  const cache = await getJobsCacheOrRefresh();
  const cutoffTs = Date.now() - days * 24 * 60 * 60 * 1000;

  const jobs = cache.jobs
    .map((job) => {
      const verificationTier = computeVerificationTier(job);
      const tags = detectTags(job);
      return {
        ...job,
        verificationTier,
        tags,
      };
    })
    .filter((job) => {
      const referenceTs = toTimestamp(job.postedAt ?? job.firstSeenAt);
      if (referenceTs < cutoffTs) return false;

      if (verifiedOnly && job.verificationTier === "UNVERIFIED") return false;
      if (remoteOnly && !job.remote) return false;
      if (tag && !job.tags.includes(tag)) return false;

      if (q) {
        const haystack = `${job.title} ${job.company} ${job.location ?? ""} ${job.description ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const tierDiff = rankVerification(b.verificationTier) - rankVerification(a.verificationTier);
      if (tierDiff !== 0) return tierDiff;

      const aTs = toTimestamp(a.postedAt ?? a.firstSeenAt);
      const bTs = toTimestamp(b.postedAt ?? b.firstSeenAt);
      if (bTs !== aTs) return bTs - aTs;
      return a.title.localeCompare(b.title);
    });

  return NextResponse.json({
    generatedAt: cache.generatedAt,
    jobs,
    count: jobs.length,
    filters: { days, verifiedOnly, remoteOnly, tag: tag || null, q: q || null },
  });
}
