import { LeverDirectoryCompany, UnifiedJob } from "@/lib/ingest/types";

type LeverPosting = {
  id?: string;
  text?: string;
  createdAt?: number;
  hostedUrl?: string;
  descriptionPlain?: string;
  categories?: {
    location?: string;
  };
};

export async function fetchLeverJobs(companies: LeverDirectoryCompany[]): Promise<UnifiedJob[]> {
  const jobs: UnifiedJob[] = [];

  await Promise.all(
    companies.map(async (company) => {
      const slug = company.companySlug?.trim();
      if (!slug) return;

      const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as LeverPosting[];

        for (const item of payload ?? []) {
          const applyUrl = item.hostedUrl ?? "";
          if (!applyUrl) continue;

          jobs.push({
            id: `lever-${slug}-${item.id ?? applyUrl}`,
            title: item.text ?? "",
            company: company.name,
            location: item.categories?.location ?? null,
            remote: /remote/i.test(`${item.text ?? ""} ${item.categories?.location ?? ""}`),
            description: item.descriptionPlain ?? null,
            applyUrl,
            postedAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
            firstSeenAt: new Date().toISOString(),
            source: "LEVER",
            websiteDomain: company.websiteDomain,
          });
        }
      } catch {
        return;
      }
    }),
  );

  return jobs;
}
