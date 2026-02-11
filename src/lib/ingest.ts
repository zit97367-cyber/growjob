import { AtsType, Prisma, VerificationTier } from "@prisma/client";
import { subDays } from "date-fns";
import { fetchJobsFromAts } from "@/lib/ats/connectors";
import { prisma } from "@/lib/prisma";
import { computeVerificationTier } from "@/lib/verification";
import { sha256 } from "@/lib/hash";

export type IngestStats = {
  companiesProcessed: number;
  jobsSeen: number;
  jobsUpserted: number;
};

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

export async function ingestCompany(company: {
  id: string;
  websiteDomain: string;
  atsType: AtsType;
  atsConfig: Prisma.JsonValue | null;
}) {
  if (company.atsType === AtsType.UNKNOWN) {
    return { jobsSeen: 0, jobsUpserted: 0 };
  }

  const jobs = await fetchJobsFromAts(company.atsType, (company.atsConfig ?? {}) as Record<string, string>);

  let upserted = 0;

  for (const job of jobs) {
    const publishedAt = job.publishedAt ?? undefined;
    const firstSeenAt = new Date();
    const freshnessDate = publishedAt ?? firstSeenAt;

    if (!withinFreshnessWindow(freshnessDate, 10)) {
      continue;
    }

    const dedupeKey = buildDedupeKey({
      companyId: company.id,
      title: job.title,
      location: job.location,
      applyUrl: job.applyUrl,
    });

    const verificationTier = computeVerificationTier(
      true,
      job.applyUrl,
      company.websiteDomain,
    );

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
        publishedAt,
        verificationTier,
        matchScoreSeed: verificationRank(verificationTier) * 10,
      },
      create: {
        companyId: company.id,
        title: job.title,
        location: job.location,
        isRemote: job.isRemote,
        description: job.description,
        applyUrl: job.applyUrl,
        sourceJobId: job.externalId,
        sourcePayload: job.sourcePayload as Prisma.InputJsonValue,
        publishedAt,
        firstSeenAt,
        verificationTier,
        matchScoreSeed: verificationRank(verificationTier) * 10,
        dedupeKey,
      },
    });

    upserted += 1;
  }

  return { jobsSeen: jobs.length, jobsUpserted: upserted };
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
    },
  });

  let jobsSeen = 0;
  let jobsUpserted = 0;

  for (const company of companies) {
    const result = await ingestCompany(company);
    jobsSeen += result.jobsSeen;
    jobsUpserted += result.jobsUpserted;
  }

  return {
    companiesProcessed: companies.length,
    jobsSeen,
    jobsUpserted,
  };
}
