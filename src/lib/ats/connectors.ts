import { AtsType } from "@prisma/client";
import { AtsConfig, NormalizedJob } from "@/lib/ats/types";

type Fetcher = (config: AtsConfig) => Promise<NormalizedJob[]>;

const defaultHeaders = {
  "Content-Type": "application/json",
  "User-Agent": "GrowJobBot/1.0",
};

type LooseObj = Record<string, unknown>;

const greenhouseFetcher: Fetcher = async (config) => {
  if (!config.boardToken) return [];
  const url = `https://boards-api.greenhouse.io/v1/boards/${config.boardToken}/jobs?content=true`;
  const res = await fetch(url, { headers: defaultHeaders, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.jobs ?? []).map((job: LooseObj) => ({
    externalId: String(job.id ?? ""),
    title: String(job.title ?? ""),
    location: ((job.location as LooseObj | undefined)?.name as string | undefined) ?? undefined,
    isRemote:
      /remote/i.test(String((job.location as LooseObj | undefined)?.name ?? "")) ||
      /remote/i.test(String(job.title ?? "")),
    description: (job.content as string | undefined) ?? undefined,
    applyUrl: String(job.absolute_url ?? ""),
    publishedAt: job.updated_at ? new Date(String(job.updated_at)) : undefined,
    sourcePayload: job,
    atsType: AtsType.GREENHOUSE,
  }));
};

const leverFetcher: Fetcher = async (config) => {
  if (!config.handle) return [];
  const url = `https://api.lever.co/v0/postings/${config.handle}?mode=json`;
  const res = await fetch(url, { headers: defaultHeaders, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data ?? []).map((job: LooseObj) => ({
    externalId: String(job.id ?? ""),
    title: String(job.text ?? ""),
    location: ((job.categories as LooseObj | undefined)?.location as string | undefined) ?? undefined,
    isRemote:
      /remote/i.test(String((job.categories as LooseObj | undefined)?.location ?? "")) ||
      /remote/i.test(String(job.text ?? "")),
    description: (job.descriptionPlain as string | undefined) ?? undefined,
    applyUrl: String(job.hostedUrl ?? ""),
    publishedAt: job.createdAt ? new Date(String(job.createdAt)) : undefined,
    sourcePayload: job,
    atsType: AtsType.LEVER,
  }));
};

const ashbyFetcher: Fetcher = async (config) => {
  if (!config.orgSlug) return [];
  const url = `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`; 
  const res = await fetch(url, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({
      query:
        "query ApiJobBoardWithTeams($organizationHostedJobsPageName:String!){jobBoardWithTeams(organizationHostedJobsPageName:$organizationHostedJobsPageName){jobPostings{id title locationId locationName isRemote descriptionHtml applyUrl publishedDate}}}",
      variables: { organizationHostedJobsPageName: config.orgSlug },
    }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  const postings = data?.data?.jobBoardWithTeams?.jobPostings ?? [];
  return postings.map((job: LooseObj) => ({
    externalId: String(job.id ?? ""),
    title: String(job.title ?? ""),
    location: (job.locationName as string | undefined) ?? undefined,
    isRemote: Boolean(job.isRemote),
    description: (job.descriptionHtml as string | undefined) ?? undefined,
    applyUrl: String(job.applyUrl ?? ""),
    publishedAt: job.publishedDate ? new Date(String(job.publishedDate)) : undefined,
    sourcePayload: job,
    atsType: AtsType.ASHBY,
  }));
};

const smartRecruitersFetcher: Fetcher = async (config) => {
  if (!config.companyIdentifier) return [];
  const url = `https://api.smartrecruiters.com/v1/companies/${config.companyIdentifier}/postings`;
  const res = await fetch(url, { headers: defaultHeaders, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.content ?? []).map((job: LooseObj) => ({
    externalId: String(job.id ?? ""),
    title: String(job.name ?? ""),
    location: `${String((job.location as LooseObj | undefined)?.city ?? "")}${(job.location as LooseObj | undefined)?.country ? `, ${String((job.location as LooseObj | undefined)?.country ?? "")}` : ""}`,
    isRemote:
      /remote/i.test(String((job.location as LooseObj | undefined)?.city ?? "")) ||
      /remote/i.test(String(job.name ?? "")),
    description: (job.ref as string | undefined) ?? undefined,
    applyUrl: String(job.ref ?? ""),
    publishedAt: job.releasedDate ? new Date(String(job.releasedDate)) : undefined,
    sourcePayload: job,
    atsType: AtsType.SMARTRECRUITERS,
  }));
};

export async function fetchJobsFromAts(atsType: AtsType, config: AtsConfig): Promise<NormalizedJob[]> {
  switch (atsType) {
    case AtsType.GREENHOUSE:
      return greenhouseFetcher(config);
    case AtsType.LEVER:
      return leverFetcher(config);
    case AtsType.ASHBY:
      return ashbyFetcher(config);
    case AtsType.SMARTRECRUITERS:
      return smartRecruitersFetcher(config);
    default:
      return [];
  }
}
