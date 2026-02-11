import { describe, expect, it } from "vitest";
import { getUtcWeekStart } from "../src/lib/time";

describe("weekly token reset boundaries", () => {
  it("returns monday 00:00 UTC for mid-week date", () => {
    const input = new Date("2026-02-11T13:22:00.000Z"); // Wednesday
    const start = getUtcWeekStart(input);
    expect(start.toISOString()).toBe("2026-02-09T00:00:00.000Z");
  });

  it("resets when crossing into new UTC week", () => {
    const sunday = getUtcWeekStart(new Date("2026-02-15T23:59:59.000Z"));
    const monday = getUtcWeekStart(new Date("2026-02-16T00:00:00.000Z"));
    expect(sunday.toISOString()).toBe("2026-02-09T00:00:00.000Z");
    expect(monday.toISOString()).toBe("2026-02-16T00:00:00.000Z");
  });
});
