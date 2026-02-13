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

type RemotiveJob = {
  id?: number;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  description?: string;
  url?: string;
  publication_date?: string;
};

function isWeb3Job(job: RemotiveJob) {
  const haystack = `${job.title ?? ""} ${job.description ?? ""} ${job.company_name ?? ""}`.toLowerCase();
  return WEB3_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export async function fetchRemotiveJobs(): Promise<NormalizedJob[]> {
  const res = await fetch("https://remotive.com/api/remote-jobs", { cache: "no-store" });
  if (!res.ok) return [];

  const payload = (await res.json()) as { jobs?: RemotiveJob[] };
  const jobs = payload.jobs ?? [];

  return jobs.filter(isWeb3Job).map((job) => ({
    externalId: job.id ? String(job.id) : undefined,
    title: job.title ?? "",
    location: job.candidate_required_location ?? "Remote",
    isRemote: true,
    description: job.description,
    applyUrl: job.url ?? "",
    publishedAt: job.publication_date ? new Date(job.publication_date) : undefined,
    sourcePayload: job,
    atsType: AtsType.UNKNOWN,
    sourceType: "BOARD_API",
    sourceProvider: "REMOTIVE",
    sourceReliability: 70,
  }));
}
