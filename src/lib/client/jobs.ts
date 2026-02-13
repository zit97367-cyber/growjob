export type FetchJobsParams = {
  days?: number;
  verifiedOnly?: boolean;
  remoteOnly?: boolean;
  tag?: string;
  q?: string;
};

export async function fetchJobs(params: FetchJobsParams = {}) {
  const query = new URLSearchParams();

  if (params.days) query.set("days", String(params.days));
  if (typeof params.verifiedOnly === "boolean") query.set("verifiedOnly", String(params.verifiedOnly));
  if (typeof params.remoteOnly === "boolean") query.set("remoteOnly", String(params.remoteOnly));
  if (params.tag) query.set("tag", params.tag);
  if (params.q) query.set("q", params.q);

  const res = await fetch(`/api/jobs?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch jobs: ${res.status}`);
  }

  return (await res.json()) as {
    generatedAt: string;
    count: number;
    jobs: Array<Record<string, unknown>>;
  };
}
