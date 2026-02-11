import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const session = await getAuthSession();
  if (session?.user?.role !== "ADMIN") return forbidden();

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ companies });
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
