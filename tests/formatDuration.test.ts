import { describe, it, expect } from "vitest";
import { formatMs } from "@/lib/formatDuration";

describe("formatMs", () => {
  it("renders zero as 0s", () => {
    expect(formatMs(0)).toBe("0s");
  });

  it("renders sub-minute durations as seconds", () => {
    expect(formatMs(12_000)).toBe("12s");
  });

  it("rounds sub-second remainders down", () => {
    expect(formatMs(12_900)).toBe("12s");
  });

  it("renders minute-and-second durations", () => {
    expect(formatMs(72_000)).toBe("1m 12s");
  });

  it("omits leading zero components for sub-hour durations", () => {
    expect(formatMs(60_000)).toBe("1m 0s");
  });

  it("renders multi-hour durations", () => {
    expect(formatMs(3_725_000)).toBe("1h 2m 5s");
  });

  it("clamps negative inputs to 0s", () => {
    expect(formatMs(-500)).toBe("0s");
  });
});
