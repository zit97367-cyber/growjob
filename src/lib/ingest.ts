import { AtsType, Prisma, SourceType, VerificationTier } from "@prisma/client";
import { subDays } from "date-fns";
import { fetchJobsFromAts } from "@/lib/ats/connectors";
import { NormalizedJob } from "@/lib/ats/types";
import { classifyJobCategory } from "@/lib/jobFilters";
import { prisma } from "@/lib/prisma";
import { parseSalaryToUsd } from "@/lib/salary";
import { fetchArbeitnowJobs } from "@/lib/sources/board/arbeitnow";
import { fetchRemotiveJobs } from "@/lib/sources/board/remotive";
import { computeVerificationTier } from "@/lib/verification";
import { sha256 } from "@/lib/hash";

export type SourceBreakdown = {
  sourceName: string;
  seen: number;
  upserted: number;
  failed: number;
  durationMs: number;
};

export type IngestStats = {
  companiesProcessed: number;
  jobsSeen: number;
  jobsUpserted: number;
  sourceBreakdown: SourceBreakdown[];
};

const ATS_TIMEOUT_MS = 8000;
const ATS_RETRIES = 2;

function aggregateSourceBreakdown(rows: SourceBreakdown[]): SourceBreakdown[] {
  const bySource = new Map<string, SourceBreakdown>();

  for (const row of rows) {
    const current = bySource.get(row.sourceName);
    if (!current) {
      bySource.set(row.sourceName, { ...row });
      continue;
    }
    current.seen += row.seen;
    current.upserted += row.upserted;
    current.failed += row.failed;
    current.durationMs += row.durationMs;
  }

  return [...bySource.values()].sort((a, b) => a.sourceName.localeCompare(b.sourceName));
}

export function buildDedupeKey(input: {
  companyId: string;
  title: string;
  location?: string | null;
  applyUrl: string;
}) {
  return sha256(
    [
      input.companyId,
      input.title.trim().toLowerCase(),
      (input.location ?? "").trim().toLowerCase(),
      input.applyUrl.trim().toLowerCase(),
    ].join("|"),
  );
}

export function withinFreshnessWindow(date: Date, maxDays = 10): boolean {
  return date >= subDays(new Date(), maxDays);
}

function verificationRank(tier: VerificationTier): number {
  if (tier === VerificationTier.SOURCE_VERIFIED) return 3;
  if (tier === VerificationTier.DOMAIN_VERIFIED) return 2;
  return 1;
}

async function withRetries<T>(fn: () => Promise<T>, retries = ATS_RETRIES): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      const backoff = 250 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      attempt += 1;
    }
  }
}

async function withTimeout<T>(fn: () => Promise<T>, timeoutMs = ATS_TIMEOUT_MS): Promise<T> {
  return await Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

export async function verifyCompanyAtsConfig(company: {
  id: string;
  atsType: AtsType;
  atsConfig: Prisma.JsonValue | null;
}) {
  if (company.atsType === AtsType.UNKNOWN) {
    await prisma.company.update({
      where: { id: company.id },
      data: { isConfigVerified: false, lastVerifiedAt: new Date() },
    });
    return false;
  }

  try {
    const jobs = await withTimeout(
      async () =>
        await withRetries(async () => {
          return await fetchJobsFromAts(company.atsType, (company.atsConfig ?? {}) as Record<string, string>);
        }),
    );

    const valid = jobs.length > 0;
    await prisma.company.update({
      where: { id: company.id },
      data: {
        isConfigVerified: valid,
        lastVerifiedAt: new Date(),
      },
    });
    return valid;
  } catch {
    await prisma.company.update({
      where: { id: company.id },
      data: {
        isConfigVerified: false,
        lastVerifiedAt: new Date(),
      },
    });
    return false;
  }
}

async function resolveBoardCompanyId(applyUrl: string) {
  let host = "web3boardjobs.com";
  try {
    host = new URL(applyUrl).hostname.replace(/^www\./, "");
  } catch {
    host = "web3boardjobs.com";
  }
  const direct = await prisma.company.findFirst({
    where: {
      OR: [{ websiteDomain: host }, { websiteDomain: { contains: host.split(".")[0] } }],
    },
    select: { id: true },
  });
  if (direct?.id) return direct.id;

  const fallback = await prisma.company.upsert({
    where: { websiteDomain: "web3boardjobs.com" },
    update: {},
    create: {
      name: "Web3 Board Jobs",
      websiteDomain: "web3boardjobs.com",
      careersUrl: "https://remotive.com/api/remote-jobs",
      atsType: AtsType.UNKNOWN,
      isConfigVerified: true,
      lastVerifiedAt: new Date(),
    },
    select: { id: true },
  });
  return fallback.id;
}

async function upsertNormalizedJob(companyId: string, companyDomain: string, job: NormalizedJob) {
  const publishedAt = job.publishedAt ?? undefined;
  const firstSeenAt = new Date();
  const freshnessDate = publishedAt ?? firstSeenAt;

  if (!withinFreshnessWindow(freshnessDate, 10)) {
    return false;
  }

  const dedupeKey = buildDedupeKey({
    companyId,
    title: job.title,
    location: job.location,
    applyUrl: job.applyUrl,
  });

  const verificationTier = computeVerificationTier(job.sourceType !== "BOARD_API", job.applyUrl, companyDomain);
  const salary = parseSalaryToUsd(`${job.title} ${job.description ?? ""}`);
  const jobCategory = classifyJobCategory({
    title: job.title,
    company: companyDomain,
    location: job.location,
    isRemote: job.isRemote,
    matchReason: "",
    description: job.description,
  });

  await prisma.job.upsert({
    where: { dedupeKey },
    update: {
      title: job.title,
      location: job.location,
      isRemote: job.isRemote,
      description: job.description,
      applyUrl: job.applyUrl,
      sourceJobId: job.externalId,
      sourcePayload: job.sourcePayload as Prisma.InputJsonValue,
      sourceType: (job.sourceType ?? "ATS") as SourceType,
      sourceProvider: job.sourceProvider ?? "UNKNOWN",
      sourceReliability: job.sourceReliability ?? (job.sourceType === "BOARD_API" ? 70 : 100),
      salaryMinUsd: salary.salaryMinUsd,
      salaryMaxUsd: salary.salaryMaxUsd,
      salaryInferred: salary.salaryInferred,
      jobCategory,
      publishedAt,
      verificationTier,
      matchScoreSeed: verificationRank(verificationTier) * 10,
    },
    create: {
      companyId,
      title: job.title,
      location: job.location,
      isRemote: job.isRemote,
      description: job.description,
      applyUrl: job.applyUrl,
      sourceJobId: job.externalId,
      sourcePayload: job.sourcePayload as Prisma.InputJsonValue,
      sourceType: (job.sourceType ?? "ATS") as SourceType,
      sourceProvider: job.sourceProvider ?? "UNKNOWN",
      sourceReliability: job.sourceReliability ?? (job.sourceType === "BOARD_API" ? 70 : 100),
      salaryMinUsd: salary.salaryMinUsd,
      salaryMaxUsd: salary.salaryMaxUsd,
      salaryInferred: salary.salaryInferred,
      jobCategory,
      publishedAt,
      firstSeenAt,
      verificationTier,
      matchScoreSeed: verificationRank(verificationTier) * 10,
      dedupeKey,
    },
  });

  return true;
}

export async function ingestCompany(company: {
  id: string;
  websiteDomain: string;
  atsType: AtsType;
  atsConfig: Prisma.JsonValue | null;
  isConfigVerified?: boolean;
}) {
  if (company.atsType === AtsType.UNKNOWN) {
    return { jobsSeen: 0, jobsUpserted: 0 };
  }

  const verified = company.isConfigVerified
    ? true
    : await verifyCompanyAtsConfig({ id: company.id, atsType: company.atsType, atsConfig: company.atsConfig });

  if (!verified) {
    return { jobsSeen: 0, jobsUpserted: 0 };
  }

  const jobs = await withTimeout(
    async () =>
      await withRetries(async () => {
        return await fetchJobsFromAts(company.atsType, (company.atsConfig ?? {}) as Record<string, string>);
      }),
  );

  let upserted = 0;
  for (const job of jobs) {
    if (!job.applyUrl || !job.title) continue;
    const ok = await upsertNormalizedJob(company.id, company.websiteDomain, {
      ...job,
      sourceType: "ATS",
      sourceProvider: job.sourceProvider ?? String(company.atsType),
      sourceReliability: 100,
    });
    if (ok) upserted += 1;
  }

  return { jobsSeen: jobs.length, jobsUpserted: upserted };
}

async function ingestBoardSources(): Promise<SourceBreakdown[]> {
  if (process.env.ENABLE_BOARD_APIS !== "true") {
    return [];
  }

  const jobsBySource: Array<{ sourceName: string; jobs: NormalizedJob[] }> = [];

  const remotiveStart = Date.now();
  try {
    const jobs = await withTimeout(() => fetchRemotiveJobs());
    jobsBySource.push({ sourceName: "REMOTIVE", jobs });
  } catch {
    jobsBySource.push({ sourceName: "REMOTIVE_ERROR", jobs: [] });
  }
  const remotiveDuration = Date.now() - remotiveStart;

  const arbeitStart = Date.now();
  try {
    const jobs = await withTimeout(() => fetchArbeitnowJobs());
    jobsBySource.push({ sourceName: "ARBEITNOW", jobs });
  } catch {
    jobsBySource.push({ sourceName: "ARBEITNOW_ERROR", jobs: [] });
  }
  const arbeitDuration = Date.now() - arbeitStart;

  const sourceBreakdown: SourceBreakdown[] = [];

  for (const source of jobsBySource) {
    const isError = source.sourceName.endsWith("_ERROR");
    if (isError) {
      sourceBreakdown.push({
        sourceName: source.sourceName.replace("_ERROR", ""),
        seen: 0,
        upserted: 0,
        failed: 1,
        durationMs: source.sourceName.startsWith("REMOTIVE") ? remotiveDuration : arbeitDuration,
      });
      continue;
    }

    let upserted = 0;
    for (const job of source.jobs) {
      if (!job.applyUrl || !job.title) continue;
      const companyId = await resolveBoardCompanyId(job.applyUrl);
      const company = await prisma.company.findUnique({ where: { id: companyId }, select: { websiteDomain: true } });
      const ok = await upsertNormalizedJob(companyId, company?.websiteDomain ?? "", {
        ...job,
        sourceType: "BOARD_API",
        sourceProvider: source.sourceName,
        sourceReliability: 70,
      });
      if (ok) upserted += 1;
    }

    sourceBreakdown.push({
      sourceName: source.sourceName,
      seen: source.jobs.length,
      upserted,
      failed: 0,
      durationMs: source.sourceName === "REMOTIVE" ? remotiveDuration : arbeitDuration,
    });
  }

  return sourceBreakdown;
}

export async function verifyAllCompanyConfigs() {
  const companies = await prisma.company.findMany({
    where: { atsType: { not: AtsType.UNKNOWN } },
    select: { id: true, atsType: true, atsConfig: true },
  });

  let verified = 0;
  for (const company of companies) {
    const ok = await verifyCompanyAtsConfig(company);
    if (ok) verified += 1;
  }

  return { checked: companies.length, verified };
}

export async function ingestAllCompanies(): Promise<IngestStats> {
  const companies = await prisma.company.findMany({
    where: {
      atsType: { not: AtsType.UNKNOWN },
    },
    select: {
      id: true,
      websiteDomain: true,
      atsType: true,
      atsConfig: true,
      isConfigVerified: true,
    },
  });

  let jobsSeen = 0;
  let jobsUpserted = 0;
  const sourceBreakdown: SourceBreakdown[] = [];

  for (const company of companies) {
    const startedAt = Date.now();
    try {
      const result = await ingestCompany(company);
      jobsSeen += result.jobsSeen;
      jobsUpserted += result.jobsUpserted;

      sourceBreakdown.push({
        sourceName: String(company.atsType),
        seen: result.jobsSeen,
        upserted: result.jobsUpserted,
        failed: 0,
        durationMs: Date.now() - startedAt,
      });
    } catch {
      sourceBreakdown.push({
        sourceName: String(company.atsType),
        seen: 0,
        upserted: 0,
        failed: 1,
        durationMs: Date.now() - startedAt,
      });
    }
  }

  const boardStats = await ingestBoardSources();
  for (const row of boardStats) {
    jobsSeen += row.seen;
    jobsUpserted += row.upserted;
    sourceBreakdown.push(row);
  }

  const aggregated = aggregateSourceBreakdown(sourceBreakdown);

  const run = await prisma.ingestRun.create({
    data: {
      companiesProcessed: companies.length,
      jobsSeen,
      jobsUpserted,
    },
    select: { id: true },
  });

  if (aggregated.length > 0) {
    await prisma.ingestSourceRun.createMany({
      data: aggregated.map((item) => ({
        ingestRunId: run.id,
        sourceName: item.sourceName,
        seen: item.seen,
        upserted: item.upserted,
        failed: item.failed,
        durationMs: item.durationMs,
      })),
    });
  }

  return {
    companiesProcessed: companies.length,
    jobsSeen,
    jobsUpserted,
    sourceBreakdown: aggregated,
  };
}
