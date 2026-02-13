import { UnifiedJob } from "@/lib/ingest/types";

export const CRYPTO_TAGS = [
  "crypto",
  "web3",
  "defi",
  "solana",
  "ethereum",
  "zk",
  "nft",
  "dao",
  "infra",
  "security",
  "ai",
] as const;

export function detectTags(job: Pick<UnifiedJob, "title" | "description">): string[] {
  const haystack = `${job.title} ${job.description ?? ""}`.toLowerCase();
  return CRYPTO_TAGS.filter((tag) => haystack.includes(tag));
}

export function hasCryptoSignal(job: Pick<UnifiedJob, "title" | "description">) {
  return detectTags(job).length > 0;
}
