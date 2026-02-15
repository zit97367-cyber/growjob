import { hasCryptoSignal } from "@/lib/ingest/tags";
import { UnifiedJob } from "@/lib/ingest/types";
import { fetchJsonSafe } from "@/lib/ingest/sources/http";

type RemotiveJob = {
  id?: number;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  description?: string;
  url?: string;
  publication_date?: string;
};

export async function fetchRemotiveJobs(): Promise<UnifiedJob[]> {
  const payload = await fetchJsonSafe<{ jobs?: RemotiveJob[] }>("https://remotive.com/api/remote-jobs");
  if (!payload) return [];

  const mapped: UnifiedJob[] = (payload.jobs ?? []).map((job) => ({
    id: `remotive-${job.id ?? Buffer.from(job.url ?? job.title ?? "unknown").toString("base64url").slice(0, 18)}`,
    title: job.title ?? "",
    company: job.company_name ?? "Unknown",
    location: job.candidate_required_location ?? null,
    remote: true,
    description: job.description ?? null,
    applyUrl: job.url ?? "",
    postedAt: job.publication_date ? new Date(job.publication_date).toISOString() : null,
    firstSeenAt: new Date().toISOString(),
    source: "REMOTIVE",
    sourceName: "Remotive",
    sourceUrl: job.url ?? "https://remotive.com/api/remote-jobs",
  }));

  return mapped.filter((job) => hasCryptoSignal({ title: job.title, description: job.description }));
}
