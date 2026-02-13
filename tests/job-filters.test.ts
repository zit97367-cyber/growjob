import { describe, expect, it } from "vitest";
import { classifyJobCategory, filterJobsByTags } from "@/lib/jobFilters";

describe("filterJobsByTags", () => {
  const jobs = [
    {
      title: "Marketing Manager",
      company: "LayerX",
      location: "Remote",
      isRemote: true,
      matchReason: "strong marketing fit",
    },
    {
      title: "Solidity Engineer",
      company: "ChainLab",
      location: "New York",
      isRemote: false,
      matchReason: "smart contract match",
    },
  ];

  it("returns matching jobs by selected tags (OR semantics)", () => {
    const filtered = filterJobsByTags(jobs, ["marketing", "solidity"], false);
    expect(filtered).toHaveLength(2);
  });

  it("applies remote-only toggle", () => {
    const filtered = filterJobsByTags(jobs, ["solidity"], true);
    expect(filtered).toHaveLength(0);
  });

  it("returns all jobs when no tags are selected", () => {
    const filtered = filterJobsByTags(jobs, [], false);
    expect(filtered).toHaveLength(2);
  });

  it("maps non tech tag to non-technical domains", () => {
    const filtered = filterJobsByTags(jobs, ["non tech"], false);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toContain("Marketing");
  });

  it("classifies non-tech category from marketing title", () => {
    const category = classifyJobCategory(jobs[0]);
    expect(category).toBe("NON_TECH");
  });
});
