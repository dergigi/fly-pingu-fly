import { describe, expect, it } from "vitest";

import {
  formatAirtimeHud,
  formatDistanceHud,
  formatJumpHud,
  jumpHudStats,
  worldDistanceToMeters,
} from "./hudStats";

describe("jump HUD stats", () => {
  it("converts world distance into display meters", () => {
    expect(worldDistanceToMeters(271)).toBeCloseTo(5.42, 8);
    expect(jumpHudStats({ distance: 0, airtime: 0 })).toEqual({
      distance: 0,
      airtime: 0,
    });
    expect(jumpHudStats({ distance: 300, airtime: 1.24 })).toEqual({
      distance: 6,
      airtime: 1.24,
    });
  });

  it("formats short distances with two decimals", () => {
    const stats = { distance: 3.126, airtime: 1.24 };
    expect(formatDistanceHud(stats)).toBe("3.13 m");
    expect(formatAirtimeHud(stats)).toBe("1.2 s");
    expect(formatJumpHud(stats)).toBe("3.13 m\n1.2 s");
  });
});
