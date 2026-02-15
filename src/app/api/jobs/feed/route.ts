import { JobCategory, VerificationTier } from "@prisma/client";
import { subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { computeMatch, sortFeed } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/jobFilters";
import { salaryLabel } from "@/lib/salary";

function toBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

const ROLE_CATEGORY_MAP: Record<string, JobCategory[]> = {
  engineering: [JobCategory.AI, JobCategory.BACKEND, JobCategory.FRONT_END, JobCategory.CRYPTO],
  marketing: [JobCategory.MARKETING],
  design: [JobCategory.DESIGN],
  data: [JobCategory.DATA_SCIENCE],
  product: [JobCategory.NON_TECH],
  sales: [JobCategory.NON_TECH, JobCategory.MARKETING],
  operations: [JobCategory.NON_TECH],
  community: [JobCategory.NON_TECH, JobCategory.MARKETING],
  other: [JobCategory.OTHER],
};

function detectRegion(location: string | null | undefined) {
  const value = normalizeText(location ?? "");
  if (!value) return null;
  if (/\b(us|usa|united states|new york|san francisco|austin|chicago|seattle)\b/.test(value)) return "us";
  if (/\b(europe|eu|uk|germany|france|spain|italy|netherlands|portugal|poland)\b/.test(value)) return "europe";
  if (/\b(apac|asia|india|singapore|japan|korea|australia|new zealand)\b/.test(value)) return "apac";
  if (/\b(middle east|uae|dubai|abu dhabi|saudi|qatar|bahrain|oman)\b/.test(value)) return "middle east";
  if (/\b(africa|nigeria|kenya|south africa|egypt|morocco)\b/.test(value)) return "africa";
  return null;
}

function inferWorkStyle(job: { isRemote: boolean; location: string | null }) {
  if (job.isRemote) return "remote";
  const value = normalizeText(job.location ?? "");
  if (/\bhybrid\b/.test(value)) return "hybrid";
  if (/\bonsite\b|\bon-site\b|\bin office\b/.test(value)) return "on-site";
  return "on-site";
}

function sectionLabelForCategory(category: JobCategory | null) {
  if (!category) return "Other";
  if (
    category === JobCategory.AI ||
    category === JobCategory.BACKEND ||
    category === JobCategory.FRONT_END ||
    category === JobCategory.CRYPTO
  ) {
    return "Engineering";
  }
  if (category === JobCategory.MARKETING) return "Marketing";
  if (category === JobCategory.DESIGN) return "Design";
  if (category === JobCategory.DATA_SCIENCE) return "Data";
  if (category === JobCategory.NON_TECH) return "Operations";
  return "Other";
}

function hasValidApplyUrl(applyUrl: string) {
  try {
    const parsed = new URL(applyUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const searchParams = req.nextUrl.searchParams;

  const category = searchParams.get("category") as JobCategory | null;
  const q = normalizeText(searchParams.get("q") ?? "");
  const location = normalizeText(searchParams.get("location") ?? "");
  const roles = (searchParams.get("roles") ?? "")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
  const regions = (searchParams.get("regions") ?? "")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
  const workStyles = (searchParams.get("workStyles") ?? "")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
  const salaryFloorK = Number(searchParams.get("salaryFloorK") ?? "10");
  const salaryFloorUsd = Number.isFinite(salaryFloorK) ? Math.max(10, salaryFloorK) * 1000 : 10000;
  const remoteOnly = searchParams.get("remoteOnly") === "true";
  const limit = toBoundedInt(searchParams.get("limit"), 30, 1, 60);
  const offset = toBoundedInt(searchParams.get("offset"), 0, 0, 500);

  const dbStartedAt = Date.now();
  const [jobs, profile, hiddenIds] = await Promise.all([
    prisma.job.findMany({
      where: {
        AND: [
          { OR: [{ publishedAt: { gte: subDays(new Date(), 7) } }, { firstSeenAt: { gte: subDays(new Date(), 7) } }] },
          {
            OR: [
              { salaryMinUsd: { gte: salaryFloorUsd } },
              { salaryMaxUsd: { gte: salaryFloorUsd } },
              { salaryMinUsd: null },
            ],
          },
        ],
        ...(category && Object.values(JobCategory).includes(category) ? { jobCategory: category } : {}),
        ...(remoteOnly ? { isRemote: true } : {}),
      },
      select: {
        id: true,
        title: true,
        location: true,
        isRemote: true,
        description: true,
        applyUrl: true,
        publishedAt: true,
        firstSeenAt: true,
        verificationTier: true,
        sourceReliability: true,
        salaryMinUsd: true,
        salaryMaxUsd: true,
        salaryInferred: true,
        jobCategory: true,
        company: { select: { name: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { firstSeenAt: "desc" }],
      take: 200,
    }),
    userId ? prisma.userProfile.findUnique({ where: { userId } }) : Promise.resolve(null),
    userId
      ? prisma.userJobAction.findMany({ where: { userId, actionType: "HIDE" }, select: { jobId: true } })
      : Promise.resolve([]),
  ]);
  const dbElapsedMs = Date.now() - dbStartedAt;

  const hidden = new Set((hiddenIds ?? []).map((item) => item.jobId));

  const enrichStartedAt = Date.now();
  const enriched = jobs
    .filter((job) => hasValidApplyUrl(job.applyUrl))
    .filter((job) => !hidden.has(job.id))
    .map((job) => {
      const match = computeMatch(profile, job);
      return {
        id: job.id,
        title: job.title,
        company: job.company.name,
        location: job.location,
        isRemote: job.isRemote,
        postedAt: job.publishedAt ?? job.firstSeenAt,
        applyUrl: job.applyUrl,
        matchScore: match.score,
        matchReason: match.reason,
        salaryMinUsd: job.salaryMinUsd,
        salaryMaxUsd: job.salaryMaxUsd,
        salaryInferred: job.salaryInferred,
        verificationTier: job.verificationTier,
        sourceReliability: job.sourceReliability,
        jobCategory: job.jobCategory,
        freshnessRank: Math.floor((new Date(job.publishedAt ?? job.firstSeenAt).getTime() - subDays(new Date(), 10).getTime()) / (1000 * 60 * 60)),
        verificationRank:
          job.verificationTier === VerificationTier.SOURCE_VERIFIED
            ? 3
            : job.verificationTier === VerificationTier.DOMAIN_VERIFIED
              ? 2
              : 1,
        sectionLabel: sectionLabelForCategory(job.jobCategory),
        displaySalary:
          job.salaryMinUsd || job.salaryMaxUsd
            ? salaryLabel(job.salaryMinUsd, job.salaryMaxUsd, Boolean(job.salaryInferred))
            : "Competitive Salary",
        riskLevel:
          job.verificationTier === VerificationTier.SOURCE_VERIFIED
            ? "LOW"
            : job.verificationTier === VerificationTier.DOMAIN_VERIFIED
              ? "MEDIUM"
              : "HIGH",
      };
    })
    .filter((job) => {
      if (!q) return true;
      const haystack = normalizeText(`${job.title} ${job.company} ${job.location ?? ""} ${job.matchReason}`);
      return haystack.includes(q);
    })
    .filter((job) => {
      if (!location) return true;
      const haystack = normalizeText(`${job.location ?? ""} ${job.title} ${job.company}`);
      return haystack.includes(location);
    })
    .filter((job) => {
      if (roles.length === 0) return true;
      const mappedCategories = roles.flatMap((role) => ROLE_CATEGORY_MAP[role] ?? []);
      const byCategory = mappedCategories.length > 0 && job.jobCategory ? mappedCategories.includes(job.jobCategory) : false;
      const haystack = normalizeText(`${job.title} ${job.matchReason}`);
      const byKeyword = roles.some((role) => haystack.includes(role));
      return byCategory || byKeyword;
    })
    .filter((job) => {
      if (regions.length === 0) return true;
      const region = detectRegion(job.location);
      return region ? regions.includes(region) : false;
    })
    .filter((job) => {
      if (workStyles.length === 0) return true;
      const style = inferWorkStyle(job);
      return workStyles.includes(style);
    });

  const sorted = sortFeed(enriched).slice(offset, offset + limit);
  const enrichElapsedMs = Date.now() - enrichStartedAt;
  const totalElapsedMs = Date.now() - startedAt;
  if (userId) {
    void logEvent({
      eventType: "job_view",
      userId,
      metadata: {
        jobsShown: sorted.length,
        category: category ?? null,
        salaryFloorK: salaryFloorK ?? 10,
        q,
        location,
        roles,
        regions,
        workStyles,
        limit,
        offset,
      },
    }).catch(() => {
      // Keep feed path resilient even if analytics logging fails.
    });
  }

  const response = {
    jobs: sorted,
    meta: {
      limit,
      offset,
      totalApprox: enriched.length,
      source: "PERSONALIZED" as const,
      timingsMs: {
        db: dbElapsedMs,
        enrichSort: enrichElapsedMs,
        total: totalElapsedMs,
      },
    },
  };

  return NextResponse.json(response);
}
