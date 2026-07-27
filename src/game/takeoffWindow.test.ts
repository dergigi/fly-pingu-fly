import { describe, expect, it } from "vitest";

import { jumpConfig } from "./config";
import {
  canAcceptStartPress,
  canAcceptTakeoffPress,
  canConsumePress,
} from "./takeoffWindow";

describe("takeoff window", () => {
  it("only starts from the ready pose", () => {
    expect(canAcceptStartPress({ phase: "ready" })).toBe(true);
    expect(canAcceptStartPress({ phase: "ramp" })).toBe(false);
  });

  it("only takes off from the takeoff section of the ramp", () => {
    expect(
      canAcceptTakeoffPress(
        { phase: "ramp", x: jumpConfig.startX },
        jumpConfig.takeoffStartX,
      ),
    ).toBe(false);
    expect(
      canAcceptTakeoffPress(
        { phase: "ramp", x: jumpConfig.takeoffStartX },
        jumpConfig.takeoffStartX,
      ),
    ).toBe(true);
    expect(
      canConsumePress(
        { phase: "drop", x: jumpConfig.takeoffStartX },
        jumpConfig.takeoffStartX,
      ),
    ).toBe(false);
  });
});
