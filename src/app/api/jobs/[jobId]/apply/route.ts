import { NextRequest, NextResponse } from "next/server";
import { refundApplyToken, trySpendApplyToken } from "@/lib/applyTokens";
import { getAuthSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";

async function isUrlReachable(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (head.status < 500) return true;
  } catch {
    // Fall through to GET check.
  } finally {
    clearTimeout(timer);
  }

  const fallbackController = new AbortController();
  const fallbackTimer = setTimeout(() => fallbackController.abort(), 4500);
  try {
    const get = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: fallbackController.signal,
    });
    return get.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(fallbackTimer);
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(job.applyUrl);
  } catch {
    return NextResponse.json({ error: "Invalid apply link", errorCode: "broken_apply_url", tokenRefunded: false }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Invalid apply link", errorCode: "broken_apply_url", tokenRefunded: false }, { status: 400 });
  }

  await logEvent({ eventType: "apply_attempt", userId: session.user.id, metadata: { jobId } });

  const tokenResult = await trySpendApplyToken(session.user.id, session.user.isPremium);
  if (!tokenResult.ok) {
    await logEvent({ eventType: "paywall_view", userId: session.user.id, metadata: { jobId } });
    return NextResponse.json({ error: "Apply tokens exhausted", paywall: true }, { status: 402 });
  }

  const reachable = await isUrlReachable(job.applyUrl);
  if (!reachable) {
    const refund = await refundApplyToken(session.user.id);
    return NextResponse.json(
      {
        error: "Apply link is unavailable right now",
        errorCode: "broken_apply_url",
        tokenRefunded: Boolean(refund.refunded),
      },
      { status: 400 },
    );
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
