import { NextRequest, NextResponse } from "next/server";
import { ingestAllCompanies } from "@/lib/ingest";
import { assertCronSecret } from "@/lib/security";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!assertCronSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await ingestAllCompanies();
  return NextResponse.json({ ok: true, stats });
}
