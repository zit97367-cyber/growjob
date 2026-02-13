import { NextRequest, NextResponse } from "next/server";
import { awardCredit } from "@/lib/credits";
import { runMockAtsScan } from "@/lib/atsResume";
import { getAuthSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { computeMatchProbability } from "@/lib/matchProbability";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const resume = await prisma.resume.findFirst({
    where: { id: body.resumeId, userId: session.user.id },
  });
  if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

  const profile = await prisma.userProfile.findUnique({ where: { userId: session.user.id } });
  const job = body.jobId ? await prisma.job.findUnique({ where: { id: body.jobId } }) : null;
  if (!job && !body.jobDescription) {
    return NextResponse.json(
      { error: "Provide jobId or jobDescription to compute match probability" },
      { status: 400 },
    );
  }

  const result = runMockAtsScan({
    resumeText: resume.content ?? "",
    targetRoles: profile?.preferredRoles ?? ["Web3 Engineer"],
    jobDescription: job?.description ?? body.jobDescription,
  });
  const probability = computeMatchProbability({
    resumeText: resume.content ?? "",
    jobTitle: job?.title ?? String(body.jobTitle ?? "Target Job"),
    jobDescription: job?.description ?? body.jobDescription,
    jobLocation: job?.location,
    isRemote: job?.isRemote,
    profile,
  });

  const scan = await prisma.atsScan.create({
    data: {
      userId: session.user.id,
      jobId: job?.id,
      resumeId: resume.id,
      score: result.score,
      matchProbability: probability.probability,
      matchReason: probability.reason,
      improvements: result.improvements,
      missingKeywords: result.missingKeywords,
      detailedSuggestions: probability.suggestions,
      tailoredOutput: session.user.isPremium ? result.tailoredOutput : null,
    },
  });

  await awardCredit(session.user.id, "ATS_SCAN");
  await logEvent({
    eventType: "ats_scan",
    userId: session.user.id,
    metadata: {
      scanId: scan.id,
      jobId: job?.id ?? null,
      matchProbability: probability.probability,
      isPremiumView: Boolean(session.user.isPremium),
    },
  });

  return NextResponse.json({
    scan: {
      ...scan,
      detailedSuggestions: session.user.isPremium ? scan.detailedSuggestions : [],
      tailoredOutput: session.user.isPremium ? scan.tailoredOutput : null,
    },
  });
}
