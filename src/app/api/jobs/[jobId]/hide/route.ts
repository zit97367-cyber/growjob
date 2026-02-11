import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;

  await prisma.userJobAction.upsert({
    where: {
      userId_jobId_actionType: {
        userId: session.user.id,
        jobId,
        actionType: "HIDE",
      },
    },
    update: {},
    create: {
      userId: session.user.id,
      jobId,
      actionType: "HIDE",
    },
  });

  await logEvent({ eventType: "hide", userId: session.user.id, metadata: { jobId } });

  return NextResponse.json({ ok: true });
}
