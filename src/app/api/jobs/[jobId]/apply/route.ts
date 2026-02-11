import { NextRequest, NextResponse } from "next/server";
import { trySpendApplyToken } from "@/lib/applyTokens";
import { getAuthSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  await logEvent({ eventType: "apply_attempt", userId: session.user.id, metadata: { jobId } });

  const tokenResult = await trySpendApplyToken(session.user.id, session.user.isPremium);
  if (!tokenResult.ok) {
    await logEvent({ eventType: "paywall_view", userId: session.user.id, metadata: { jobId } });
    return NextResponse.json({ error: "Apply tokens exhausted", paywall: true }, { status: 402 });
  }

  await prisma.userJobAction.upsert({
    where: {
      userId_jobId_actionType: {
        userId: session.user.id,
        jobId,
        actionType: "APPLY",
      },
    },
    update: {},
    create: {
      userId: session.user.id,
      jobId,
      actionType: "APPLY",
    },
  });

  await logEvent({ eventType: "apply_success", userId: session.user.id, metadata: { jobId } });

  return NextResponse.json({ ok: true, redirectUrl: job.applyUrl, tokensLeft: tokenResult.tokensLeft });
}
