import { describe, it, expect } from "vitest";
import { gradeSm2, initSm2 } from "@/lib/sm2";

describe("sm2", () => {
  it("advances on good answer", () => {
    const card = initSm2();
    const next = gradeSm2(card, 4);
    expect(next.interval).toBeGreaterThanOrEqual(1);
    expect(next.repetition).toBeGreaterThan(0);
  });

  it("resets on poor answer", () => {
    const card = initSm2();
    const next = gradeSm2(card, 1);
    expect(next.repetition).toBe(0);
    expect(next.interval).toBe(1);
  });
});
