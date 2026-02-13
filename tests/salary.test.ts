import { describe, expect, it } from "vitest";
import { parseSalaryToUsd } from "@/lib/salary";

describe("salary parsing", () => {
  it("parses USD ranges", () => {
    const parsed = parseSalaryToUsd("Compensation $120k - $180k + bonus");
    expect(parsed.salaryMinUsd).toBe(120000);
    expect(parsed.salaryMaxUsd).toBe(180000);
    expect(parsed.salaryInferred).toBe(false);
  });

  it("normalizes EUR to USD estimate", () => {
    const parsed = parseSalaryToUsd("Salary: €90k");
    expect(parsed.salaryMinUsd).toBe(99000);
    expect(parsed.salaryInferred).toBe(false);
  });

  it("falls back to conservative minimum when unknown", () => {
    const parsed = parseSalaryToUsd("Competitive salary");
    expect(parsed.salaryMinUsd).toBe(10000);
    expect(parsed.salaryInferred).toBe(true);
  });
});
