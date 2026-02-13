import { describe, expect, it } from "vitest";
import { dedupeJobs, filterByFreshness } from "@/lib/ingest/pipeline";

describe("jobs pipeline", () => {
  it("dedupes by company/title/location/applyUrl and keeps newest", () => {
    const jobs = dedupeJobs([
      {
        id: "a",
        title: "Backend Engineer",
        company: "Acme",
        location: "Remote",
        remote: true,
        description: null,
        applyUrl: "https://jobs.example/1",
        postedAt: "2026-02-01T00:00:00.000Z",
        firstSeenAt: "2026-02-01T00:00:00.000Z",
        source: "GREENHOUSE",
      },
      {
        id: "b",
        title: "Backend Engineer",
        company: "Acme",
        location: "Remote",
        remote: true,
        description: null,
        applyUrl: "https://jobs.example/1",
        postedAt: "2026-02-05T00:00:00.000Z",
        firstSeenAt: "2026-02-05T00:00:00.000Z",
        source: "LEVER",
      },
    ]);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.postedAt).toBe("2026-02-05T00:00:00.000Z");
  });

  it("keeps only jobs inside freshness window", () => {
    const now = new Date();
    const fresh = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const stale = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();

    const filtered = filterByFreshness(
      [
        {
          id: "fresh",
          title: "Fresh",
          company: "Acme",
          location: null,
          remote: true,
          description: null,
          applyUrl: "https://a.com/1",
          postedAt: fresh,
          firstSeenAt: fresh,
          source: "GREENHOUSE",
        },
        {
          id: "stale",
          title: "Stale",
          company: "Acme",
          location: null,
          remote: true,
          description: null,
          applyUrl: "https://a.com/2",
          postedAt: stale,
          firstSeenAt: stale,
          source: "LEVER",
        },
      ],
      10,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("fresh");
  });
});
