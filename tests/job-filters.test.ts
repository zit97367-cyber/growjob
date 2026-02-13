import { describe, expect, it } from "vitest";
import { classifyJobCategory, expandSelectedCategories, filterJobsByTags } from "@/lib/jobFilters";

describe("job filters and taxonomy", () => {
  const jobs = [
    {
      title: "Marketing Manager",
      company: "LayerX",
      location: "Remote",
      isRemote: true,
      matchReason: "strong marketing fit",
      description: "Growth, content, social media",
    },
    {
      title: "Solidity Engineer",
      company: "ChainLab",
      location: "New York",
      isRemote: false,
      matchReason: "smart contract match",
      description: "EVM and protocol development",
    },
  ];

  it("expands non tech into multiple category aliases", () => {
    const categories = expandSelectedCategories(["non tech"]);
    expect(categories).toContain("NON_TECH");
    expect(categories).toContain("MARKETING");
  });

  it("applies OR semantics over selected categories", () => {
    const filtered = filterJobsByTags(jobs, ["marketing", "crypto"], false);
    expect(filtered).toHaveLength(2);
  });

  it("keeps remote-only gate", () => {
    const filtered = filterJobsByTags(jobs, ["crypto"], true);
    expect(filtered).toHaveLength(0);
  });

  it("maps non tech selection to marketing job", () => {
    const filtered = filterJobsByTags(jobs, ["non tech"], false);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toContain("Marketing");
  });

  it("classifies marketing role into MARKETING main category", () => {
    const category = classifyJobCategory(jobs[0]);
    expect(category).toBe("MARKETING");
  });
});
