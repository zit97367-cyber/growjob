import { GreenhouseDirectoryCompany, UnifiedJob } from "@/lib/ingest/types";
import { fetchJsonSafe } from "@/lib/ingest/sources/http";

type GreenhouseResponse = {
  jobs?: Array<{
    id: number;
    title: string;
    location?: { name?: string };
    updated_at?: string;
    absolute_url?: string;
    content?: string;
  }>;
};

export async function fetchGreenhouseJobs(companies: GreenhouseDirectoryCompany[]): Promise<UnifiedJob[]> {
  const jobs: UnifiedJob[] = [];

  await Promise.all(
    companies.map(async (company) => {
      const token = company.boardToken?.trim();
      if (!token) return;

      const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
      const payload = await fetchJsonSafe<GreenhouseResponse>(url);
      if (!payload) return;

      for (const item of payload.jobs ?? []) {
        const applyUrl = item.absolute_url ?? "";
        if (!applyUrl) continue;

        jobs.push({
          id: `gh-${token}-${item.id}`,
          title: item.title,
          company: company.name,
          location: item.location?.name ?? null,
          remote: /remote/i.test(`${item.title} ${item.location?.name ?? ""}`),
          description: item.content ?? null,
          applyUrl,
          postedAt: item.updated_at ? new Date(item.updated_at).toISOString() : null,
          firstSeenAt: new Date().toISOString(),
          source: "GREENHOUSE",
          websiteDomain: company.websiteDomain,
        });
      }
    }),
  );

  return jobs;
}
