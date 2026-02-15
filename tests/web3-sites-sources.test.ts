import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWeb3SitesJobs } from "@/lib/ingest/sources/web3Sites";

describe("web3 sites source connectors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses RSS jobs when feed is available", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("cryptojobslist.com/feed")) {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <rss><channel>
            <item>
              <title>Solidity Engineer at ChainLabs</title>
              <link>https://cryptojobslist.com/jobs/solidity-engineer</link>
              <description><![CDATA[Build smart contracts]]></description>
              <pubDate>Mon, 10 Feb 2026 12:00:00 GMT</pubDate>
            </item>
          </channel></rss>`,
          { status: 200, headers: { "content-type": "application/rss+xml" } },
        );
      }
      return new Response("", { status: 404 });
    });

    const jobs = await fetchWeb3SitesJobs();
    const fromSource = jobs.filter((job) => job.source === "CRYPTOJOBSLIST");
    expect(fromSource.length).toBe(1);
    expect(fromSource[0]?.company).toBe("ChainLabs");
    expect(fromSource[0]?.sourceName).toBe("CryptoJobsList");
  });

  it("falls back to HTML parsing when feed is unavailable", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("base.hirechain.io/jobs")) {
        return new Response(
          `<html><body>
            <a href="/jobs/community-manager">Community Manager</a>
            <a href="/about">About</a>
          </body></html>`,
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }
      return new Response("", { status: 404 });
    });

    const jobs = await fetchWeb3SitesJobs();
    const fromBase = jobs.filter((job) => job.source === "BASE_HIRECHAIN");
    expect(fromBase.length).toBe(1);
    expect(fromBase[0]?.applyUrl).toContain("base.hirechain.io/jobs/community-manager");
  });
});
