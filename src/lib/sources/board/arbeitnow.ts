import { AtsType } from "@prisma/client";
import { NormalizedJob } from "@/lib/ats/types";

const WEB3_KEYWORDS = [
  "web3",
  "blockchain",
  "crypto",
  "defi",
  "solidity",
  "smart contract",
  "dao",
  "evm",
  "ethereum",
  "bitcoin",
  "layer 2",
  "zk",
  "nft",
];

type ArbeitJob = {
  slug?: string;
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  created_at?: string;
};

function isWeb3Job(job: ArbeitJob) {
  const haystack = `${job.title ?? ""} ${job.description ?? ""} ${job.company_name ?? ""}`.toLowerCase();
  return WEB3_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export async function fetchArbeitnowJobs(): Promise<NormalizedJob[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", { cache: "no-store" });
  if (!res.ok) return [];

  const payload = (await res.json()) as { data?: ArbeitJob[] };
  const jobs = payload.data ?? [];

  return jobs.filter(isWeb3Job).map((job) => ({
    externalId: job.slug,
    title: job.title ?? "",
    location: job.location ?? "Remote",
    isRemote: Boolean(job.remote),
    description: job.description,
    applyUrl: job.url ?? "",
    publishedAt: job.created_at ? new Date(job.created_at) : undefined,
    sourcePayload: job,
    atsType: AtsType.UNKNOWN,
    sourceType: "BOARD_API",
    sourceProvider: "ARBEITNOW",
    sourceReliability: 70,
  }));
}
