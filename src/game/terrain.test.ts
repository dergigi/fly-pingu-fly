import { describe, expect, it } from "vitest";

import { jumpConfig } from "./config";
import { stepJump, type FlightState } from "./jump";
import { crossingFraction, sampleLanding, sampleRamp } from "./terrain";

describe("terrain sampling", () => {
  it("samples ramp and landing surfaces in world units", () => {
    const ramp = sampleRamp(jumpConfig.lipX, jumpConfig);
    expect(ramp).toEqual({
      x: jumpConfig.lipX,
      y:
        jumpConfig.startY +
        (jumpConfig.lipX - jumpConfig.startX) * jumpConfig.rampSlope,
      slope: jumpConfig.rampSlope,
    });

    const landing = sampleLanding(
      jumpConfig.landingStartX + 100,
      jumpConfig,
    );
    expect(landing).toEqual({
      y: jumpConfig.landingY + 100 * jumpConfig.landingSlope,
      slope: jumpConfig.landingSlope,
    });
  });

  it("interpolates the first above-to-below crossing", () => {
    expect(crossingFraction(-8, 2)).toBe(0.8);
    expect(crossingFraction(-2, 8)).toBe(0.2);
    expect(crossingFraction(-1, -0.5)).toBe(1);
    expect(crossingFraction(1, 2)).toBe(0);
  });

  it("does not land while moving upward", () => {
    const surface = sampleLanding(jumpConfig.landingStartX, jumpConfig);
    const state: FlightState = {
      phase: "flight",
      x: jumpConfig.landingStartX,
      y: surface.y + 1,
      vx: 100,
      vy: -100,
      speed: 0,
      elapsed: 1,
      airtime: 0.5,
    };

    expect(stepJump(state, null, 1 / 120, jumpConfig).phase).toBe("flight");
  });

  it("clamps descending motion to the first terrain contact", () => {
    const dt = 1 / 120;
    const surface = sampleLanding(jumpConfig.landingStartX, jumpConfig);
    const state: FlightState = {
      phase: "flight",
      x: jumpConfig.landingStartX,
      y: surface.y - 1,
      vx: 0,
      vy: 240,
      speed: 0,
      elapsed: 1,
      airtime: 0.5,
    };
    const nextY =
      state.y + state.vy * dt + 0.5 * jumpConfig.gravity * dt * dt;
    const fraction = crossingFraction(
      state.y - surface.y,
      nextY - surface.y,
    );
    const landed = stepJump(state, null, dt, jumpConfig);

    expect(landed.phase).toBe("slide");
    expect(landed.y).toBe(surface.y);
    expect(landed.elapsed).toBeCloseTo(state.elapsed + dt * fraction, 12);
    expect(landed.airtime).toBeCloseTo(state.airtime + dt * fraction, 12);
  });
});
