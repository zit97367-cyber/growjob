import { describe, expect, it } from "vitest";
import { filterJobsByTags } from "@/lib/jobFilters";

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
});
