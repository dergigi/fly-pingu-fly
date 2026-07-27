import { describe, expect, it } from "vitest";

import { formatJumpHud, jumpHudStats } from "./hudStats";

describe("jump HUD stats", () => {
  it("reads the frozen jump distance and airtime from state", () => {
    expect(jumpHudStats({ distance: 0, airtime: 0 })).toEqual({
      distance: 0,
      airtime: 0,
    });
    expect(jumpHudStats({ distance: 300, airtime: 1.24 })).toEqual({
      distance: 300,
      airtime: 1.24,
    });
  });

  it("formats large kid-readable values", () => {
    expect(formatJumpHud({ distance: 312.6, airtime: 1.24 })).toBe(
      "313 m\n1.2 s",
    );
  });
});
