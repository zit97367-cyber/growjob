import { NextRequest, NextResponse } from "next/server";
import { awardCredit } from "@/lib/credits";
import { runMockAtsScan } from "@/lib/atsResume";
import { getAuthSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
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

  const result = runMockAtsScan({
    resumeText: resume.content ?? "",
    targetRoles: profile?.preferredRoles ?? ["Web3 Engineer"],
    jobDescription: job?.description ?? body.jobDescription,
  });

  const scan = await prisma.atsScan.create({
    data: {
      userId: session.user.id,
      jobId: job?.id,
      resumeId: resume.id,
      score: result.score,
      improvements: result.improvements,
      missingKeywords: result.missingKeywords,
      tailoredOutput: session.user.isPremium ? result.tailoredOutput : null,
    },
  });

  await awardCredit(session.user.id, "ATS_SCAN");
  await logEvent({ eventType: "ats_scan", userId: session.user.id, metadata: { scanId: scan.id } });

  return NextResponse.json({ scan });
}
