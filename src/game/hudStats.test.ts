import { describe, expect, it } from "vitest";

import { formatJumpHud, jumpHudStats } from "./hudStats";

describe("jump HUD stats", () => {
  it("keeps distance at zero while waiting, hopping, or on the ramp", () => {
    expect(jumpHudStats({ x: 900, airtime: 0, phase: "ready" }, 980)).toEqual({
      distance: 0,
      airtime: 0,
    });
    expect(jumpHudStats({ x: 900, airtime: 0, phase: "drop" }, 980)).toEqual({
      distance: 0,
      airtime: 0,
    });
    expect(jumpHudStats({ x: 900, airtime: 0, phase: "ramp" }, 980)).toEqual({
      distance: 0,
      airtime: 0,
    });
  });

  it("measures distance from the lip after takeoff", () => {
    expect(
      jumpHudStats({ x: 1280, airtime: 1.24, phase: "flight" }, 980),
    ).toEqual({
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
