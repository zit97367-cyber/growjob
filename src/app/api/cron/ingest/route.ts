import { NextRequest, NextResponse } from "next/server";
import { ingestAndCacheJobs } from "@/lib/ingest/index";
import { assertIngestSecret } from "@/lib/security";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-ingest-secret") ?? req.headers.get("x-cron-secret");
  if (!assertIngestSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stats } = await ingestAndCacheJobs(true);
  return NextResponse.json({ ok: true, stats });
}
