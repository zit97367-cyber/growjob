import { NextRequest, NextResponse } from "next/server";
import { detectAtsFromUrl } from "@/lib/ats/detect";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ companyId: string }> }) {
  const session = await getAuthSession();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { companyId } = await params;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const detected = detectAtsFromUrl(company.careersUrl);

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      atsType: detected.atsType,
      atsConfig: detected.atsConfig,
      isConfigVerified: false,
      lastVerifiedAt: null,
    },
  });

  return NextResponse.json({ company: updated });
}
