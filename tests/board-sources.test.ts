import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchArbeitnowJobs } from "@/lib/sources/board/arbeitnow";
import { fetchRemotiveJobs } from "@/lib/sources/board/remotive";

describe("board source normalizers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("filters remotive jobs to web3 keywords", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [
          {
            id: 1,
            title: "Web3 Marketing Manager",
            company_name: "ChainCo",
            candidate_required_location: "Remote",
            description: "Lead web3 growth",
            url: "https://remotive.com/1",
            publication_date: "2026-01-01T00:00:00.000Z",
          },
          {
            id: 2,
            title: "Nurse",
            company_name: "HealthCo",
            description: "Hospital role",
            url: "https://remotive.com/2",
          },
        ],
      }),
    } as Response);

    const jobs = await fetchRemotiveJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.sourceProvider).toBe("REMOTIVE");
  });

  it("filters arbeitnow jobs to web3 keywords", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            slug: "web3-designer",
            title: "Web3 Product Designer",
            company_name: "DesignDAO",
            location: "Remote",
            description: "Build blockchain UX",
            remote: true,
            url: "https://arbeitnow.com/1",
            created_at: "2026-01-01T00:00:00.000Z",
          },
          {
            slug: "chef",
            title: "Chef",
            company_name: "FoodCo",
            description: "Kitchen role",
            remote: false,
            url: "https://arbeitnow.com/2",
          },
        ],
      }),
    } as Response);

    const jobs = await fetchArbeitnowJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.sourceProvider).toBe("ARBEITNOW");
  });
});
