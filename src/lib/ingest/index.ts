import { readJobsCache, writeJobsCache } from "@/lib/ingest/cache";
import { readCompanyDirectory } from "@/lib/ingest/companyDirectory";
import { dedupeJobs, filterByFreshness, mergeFirstSeenAt, normalizeAndFilter, sortJobs } from "@/lib/ingest/pipeline";
import { fetchGreenhouseJobs } from "@/lib/ingest/sources/greenhouse";
import { fetchLeverJobs } from "@/lib/ingest/sources/lever";
import { fetchRemotiveJobs } from "@/lib/ingest/sources/remotive";
import { IngestStats, JobsCache, UnifiedJob } from "@/lib/ingest/types";

let ingestInFlight: Promise<{ cache: JobsCache; stats: IngestStats }> | null = null;

export async function ingestAndCacheJobs(force = false): Promise<{ cache: JobsCache; stats: IngestStats }> {
  if (!force && ingestInFlight) {
    return ingestInFlight;
  }

  ingestInFlight = (async () => {
    const directory = await readCompanyDirectory();

    const [greenhouse, lever, remotive, existingCache] = await Promise.all([
      fetchGreenhouseJobs(directory.greenhouseBoards),
      fetchLeverJobs(directory.leverCompanies),
      fetchRemotiveJobs(),
      readJobsCache(),
    ]);

    const seen = greenhouse.length + lever.length + remotive.length;

    let merged: UnifiedJob[] = normalizeAndFilter([...greenhouse, ...lever, ...remotive]);
    merged = mergeFirstSeenAt(existingCache?.jobs ?? [], merged);

    const freshness = filterByFreshness(merged, 14);
    const deduped = dedupeJobs(freshness);
    const sorted = sortJobs(deduped);

    const generatedAt = new Date().toISOString();
    const cache: JobsCache = {
      generatedAt,
      jobs: sorted,
    };

    await writeJobsCache(cache);

    const stats: IngestStats = {
      generatedAt,
      jobsSeen: seen,
      jobsKept: sorted.length,
      jobsDeduped: Math.max(0, freshness.length - deduped.length),
      sourceBreakdown: [
        { source: "GREENHOUSE", seen: greenhouse.length, kept: greenhouse.length },
        { source: "LEVER", seen: lever.length, kept: lever.length },
        { source: "REMOTIVE", seen: remotive.length, kept: remotive.length },
      ],
    };

    return { cache, stats };
  })();

  try {
    return await ingestInFlight;
  } finally {
    ingestInFlight = null;
  }
}

export async function getJobsCacheOrRefresh() {
  const existing = await readJobsCache();
  if (!existing) {
    const fresh = await ingestAndCacheJobs(true);
    return fresh.cache;
  }

  const ageMs = Date.now() - new Date(existing.generatedAt).getTime();
  const staleMs = 6 * 60 * 60 * 1000;
  if (ageMs > staleMs) {
    void ingestAndCacheJobs().catch(() => {
      // stale-while-revalidate: serve stale cache while refresh happens in background.
    });
  }

  return existing;
}
