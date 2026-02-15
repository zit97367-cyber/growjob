import { JobCategory, VerificationTier } from "@prisma/client";
import { subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { computeMatch, sortFeed } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/jobFilters";

function toBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const searchParams = req.nextUrl.searchParams;

  const category = searchParams.get("category") as JobCategory | null;
  const q = normalizeText(searchParams.get("q") ?? "");
  const location = normalizeText(searchParams.get("location") ?? "");
  const salaryFloorK = Number(searchParams.get("salaryFloorK") ?? "10");
  const salaryFloorUsd = Number.isFinite(salaryFloorK) ? Math.max(10, salaryFloorK) * 1000 : 10000;
  const remoteOnly = searchParams.get("remoteOnly") === "true";
  const limit = toBoundedInt(searchParams.get("limit"), 30, 1, 60);
  const offset = toBoundedInt(searchParams.get("offset"), 0, 0, 500);

  const dbStartedAt = Date.now();
  const [jobs, profile, hiddenIds] = await Promise.all([
    prisma.job.findMany({
      where: {
        AND: [
          { OR: [{ publishedAt: { gte: subDays(new Date(), 7) } }, { firstSeenAt: { gte: subDays(new Date(), 7) } }] },
          {
            OR: [
              { salaryMinUsd: { gte: salaryFloorUsd } },
              { salaryMaxUsd: { gte: salaryFloorUsd } },
              { salaryMinUsd: null },
            ],
          },
        ],
        ...(category && Object.values(JobCategory).includes(category) ? { jobCategory: category } : {}),
        ...(remoteOnly ? { isRemote: true } : {}),
      },
      select: {
        id: true,
        title: true,
        location: true,
        isRemote: true,
        description: true,
        applyUrl: true,
        publishedAt: true,
        firstSeenAt: true,
        verificationTier: true,
        sourceReliability: true,
        salaryMinUsd: true,
        salaryMaxUsd: true,
        salaryInferred: true,
        jobCategory: true,
        company: { select: { name: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { firstSeenAt: "desc" }],
      take: 200,
    }),
    userId ? prisma.userProfile.findUnique({ where: { userId } }) : Promise.resolve(null),
    userId
      ? prisma.userJobAction.findMany({ where: { userId, actionType: "HIDE" }, select: { jobId: true } })
      : Promise.resolve([]),
  ]);
  const dbElapsedMs = Date.now() - dbStartedAt;

  const hidden = new Set((hiddenIds ?? []).map((item) => item.jobId));

  const enrichStartedAt = Date.now();
  const enriched = jobs
    .filter((job) => !hidden.has(job.id))
    .map((job) => {
      const match = computeMatch(profile, job);
      return {
        id: job.id,
        title: job.title,
        company: job.company.name,
        location: job.location,
        isRemote: job.isRemote,
        postedAt: job.publishedAt ?? job.firstSeenAt,
        applyUrl: job.applyUrl,
        matchScore: match.score,
        matchReason: match.reason,
        salaryMinUsd: job.salaryMinUsd,
        salaryMaxUsd: job.salaryMaxUsd,
        salaryInferred: job.salaryInferred,
        verificationTier: job.verificationTier,
        sourceReliability: job.sourceReliability,
        jobCategory: job.jobCategory,
        freshnessRank: Math.floor((new Date(job.publishedAt ?? job.firstSeenAt).getTime() - subDays(new Date(), 10).getTime()) / (1000 * 60 * 60)),
        verificationRank:
          job.verificationTier === VerificationTier.SOURCE_VERIFIED
            ? 3
            : job.verificationTier === VerificationTier.DOMAIN_VERIFIED
              ? 2
              : 1,
      };
    })
    .filter((job) => {
      if (!q) return true;
      const haystack = normalizeText(`${job.title} ${job.company} ${job.location ?? ""} ${job.matchReason}`);
      return haystack.includes(q);
    })
    .filter((job) => {
      if (!location) return true;
      const haystack = normalizeText(`${job.location ?? ""} ${job.title} ${job.company}`);
      return haystack.includes(location);
    });

  const sorted = sortFeed(enriched).slice(offset, offset + limit);
  const enrichElapsedMs = Date.now() - enrichStartedAt;
  const totalElapsedMs = Date.now() - startedAt;
  if (userId) {
    void logEvent({
      eventType: "job_view",
      userId,
      metadata: {
        jobsShown: sorted.length,
        category: category ?? null,
        salaryFloorK: salaryFloorK ?? 10,
        q,
        location,
        limit,
        offset,
      },
    }).catch(() => {
      // Keep feed path resilient even if analytics logging fails.
    });
  }

  const response = {
    jobs: sorted,
    meta: {
      limit,
      offset,
      totalApprox: enriched.length,
      source: "PERSONALIZED" as const,
      timingsMs: {
        db: dbElapsedMs,
        enrichSort: enrichElapsedMs,
        total: totalElapsedMs,
      },
    },
  };

  return NextResponse.json(response);
}
