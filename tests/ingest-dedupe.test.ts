import { describe, expect, it } from "vitest";
import { buildDedupeKey } from "../src/lib/ingest";

describe("ingestion dedupe key", () => {
  it("produces same key for normalized duplicates", () => {
    const a = buildDedupeKey({
      companyId: "c1",
      title: "Senior Solidity Engineer",
      location: "Remote",
      applyUrl: "https://jobs.example.com/role-1",
    });

    const b = buildDedupeKey({
      companyId: "c1",
      title: " senior solidity engineer ",
      location: "remote",
      applyUrl: "https://jobs.example.com/role-1",
    });

    expect(a).toBe(b);
  });

  it("changes key for different company", () => {
    const a = buildDedupeKey({
      companyId: "c1",
      title: "Senior Solidity Engineer",
      location: "Remote",
      applyUrl: "https://jobs.example.com/role-1",
    });

    const b = buildDedupeKey({
      companyId: "c2",
      title: "Senior Solidity Engineer",
      location: "Remote",
      applyUrl: "https://jobs.example.com/role-1",
    });

    expect(a).not.toBe(b);
  });
});
