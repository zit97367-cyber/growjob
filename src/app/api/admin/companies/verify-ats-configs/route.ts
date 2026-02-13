import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { verifyAllCompanyConfigs } from "@/lib/ingest";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST() {
  const session = await getAuthSession();
  if (session?.user?.role !== "ADMIN") return forbidden();

  const result = await verifyAllCompanyConfigs();
  return NextResponse.json({ ok: true, result });
}
