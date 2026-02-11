import { VerificationTier } from "@prisma/client";
import { subDays } from "date-fns";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { computeMatch, sortFeed } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  const [jobs, profile, hiddenIds] = await Promise.all([
    prisma.job.findMany({
      where: {
        OR: [{ publishedAt: { gte: subDays(new Date(), 7) } }, { firstSeenAt: { gte: subDays(new Date(), 7) } }],
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
        postedAt: job.publishedAt ?? job.firstSeenAt,
        applyUrl: job.applyUrl,
        matchScore: match.score,
        matchReason: match.reason,
        verificationTier: job.verificationTier,
        freshnessRank: Math.floor((new Date(job.publishedAt ?? job.firstSeenAt).getTime() - subDays(new Date(), 10).getTime()) / (1000 * 60 * 60)),
        verificationRank:
          job.verificationTier === VerificationTier.SOURCE_VERIFIED
            ? 3
            : job.verificationTier === VerificationTier.DOMAIN_VERIFIED
              ? 2
              : 1,
      };
    });

  const sorted = sortFeed(enriched);
  if (userId) {
    await logEvent({ eventType: "job_view", userId, metadata: { jobsShown: sorted.length } });
  }
  return NextResponse.json({ jobs: sorted });
}
