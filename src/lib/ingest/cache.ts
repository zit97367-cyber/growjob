import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { JobsCache } from "@/lib/ingest/types";

const PRIMARY_CACHE_PATH = path.join(process.cwd(), "data", "cache", "jobs_cache.json");
const FALLBACK_CACHE_PATH = "/tmp/growjob_jobs_cache.json";

async function readJson(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as JobsCache;
}

export async function readJobsCache(): Promise<JobsCache | null> {
  try {
    return await readJson(PRIMARY_CACHE_PATH);
  } catch {
    try {
      return await readJson(FALLBACK_CACHE_PATH);
    } catch {
      return null;
    }
  }
}

async function writeJson(filePath: string, payload: JobsCache) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function writeJobsCache(payload: JobsCache) {
  try {
    await writeJson(PRIMARY_CACHE_PATH, payload);
    return PRIMARY_CACHE_PATH;
  } catch {
    await writeJson(FALLBACK_CACHE_PATH, payload);
    return FALLBACK_CACHE_PATH;
  }
}
