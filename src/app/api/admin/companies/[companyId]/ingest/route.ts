import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { ingestCompany } from "@/lib/ingest";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ companyId: string }> }) {
  const session = await getAuthSession();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { companyId } = await params;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      websiteDomain: true,
      atsType: true,
      atsConfig: true,
      isConfigVerified: true,
    },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await ingestCompany(company);
  return NextResponse.json({ ok: true, stats });
}
