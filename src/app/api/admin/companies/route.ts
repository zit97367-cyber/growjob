import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const session = await getAuthSession();
  if (session?.user?.role !== "ADMIN") return forbidden();

  const [companies, latestIngestRun] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.ingestRun.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, jobsSeen: true, jobsUpserted: true },
    }),
  ]);

  let latestSourceBreakdown: Array<{ sourceName: string; seen: number; upserted: number; failed: number }> = [];
  if (latestIngestRun) {
    latestSourceBreakdown = await prisma.ingestSourceRun.findMany({
      where: { ingestRunId: latestIngestRun.id },
      select: { sourceName: true, seen: true, upserted: true, failed: true },
      orderBy: { sourceName: "asc" },
      take: 12,
    });
  }

  return NextResponse.json({ companies, latestIngestRun, latestSourceBreakdown });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (session?.user?.role !== "ADMIN") return forbidden();

  const body = await req.json();
  const company = await prisma.company.create({
    data: {
      name: body.name,
      websiteDomain: body.websiteDomain,
      careersUrl: body.careersUrl,
    },
  });

  return NextResponse.json({ company });
}
