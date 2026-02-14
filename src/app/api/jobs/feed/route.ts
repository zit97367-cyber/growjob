import { JobCategory, VerificationTier } from "@prisma/client";
import { subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { computeMatch, sortFeed } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/jobFilters";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const searchParams = req.nextUrl.searchParams;

  const category = searchParams.get("category") as JobCategory | null;
  const q = normalizeText(searchParams.get("q") ?? "");
  const location = normalizeText(searchParams.get("location") ?? "");
  const salaryFloorK = Number(searchParams.get("salaryFloorK") ?? "10");
  const salaryFloorUsd = Number.isFinite(salaryFloorK) ? Math.max(10, salaryFloorK) * 1000 : 10000;
  const remoteOnly = searchParams.get("remoteOnly") === "true";

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
      include: { company: true },
      orderBy: [{ publishedAt: "desc" }, { firstSeenAt: "desc" }],
      take: 200,
    }),
    userId ? prisma.userProfile.findUnique({ where: { userId } }) : Promise.resolve(null),
    userId
      ? prisma.userJobAction.findMany({ where: { userId, actionType: "HIDE" }, select: { jobId: true } })
      : Promise.resolve([]),
  ]);

  const hidden = new Set(hiddenIds.map((item) => item.jobId));

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
        description: job.description ?? undefined,
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
      const haystack = normalizeText(
        `${job.title} ${job.company} ${job.location ?? ""} ${job.description ?? ""} ${job.matchReason}`,
      );
      return haystack.includes(q);
    })
    .filter((job) => {
      if (!location) return true;
      const haystack = normalizeText(`${job.location ?? ""} ${job.title} ${job.company}`);
      return haystack.includes(location);
    });

  const sorted = sortFeed(enriched);
  if (userId) {
    await logEvent({
      eventType: "job_view",
      userId,
      metadata: { jobsShown: sorted.length, category: category ?? null, salaryFloorK: salaryFloorK ?? 10, q, location },
    });
  }
  return NextResponse.json({ jobs: sorted });
}
