import { describe, expect, it } from "vitest";

import { jumpConfig } from "./config";
import { stepJump, type FlightState } from "./jump";
import {
  crossingFraction,
  sampleLanding,
  sampleLandingCurve,
  sampleRamp,
  sampleRampCurve,
} from "./terrain";

describe("terrain sampling", () => {
  it("ends the rounded ramp at the exact takeoff lip", () => {
    const ramp = sampleRamp(jumpConfig.lipX, jumpConfig);
    expect(ramp).toEqual({
      x: jumpConfig.lipX,
      y: jumpConfig.lipY,
      slope: jumpConfig.lipSlope,
    });
  });

  it("uses a smooth rounded downhill profile and clear takeoff section", () => {
    const start = sampleRamp(jumpConfig.startX, jumpConfig);
    const middle = sampleRamp(
      (jumpConfig.startX + jumpConfig.takeoffStartX) / 2,
      jumpConfig,
    );
    const takeoff = sampleRamp(jumpConfig.takeoffStartX, jumpConfig);
    const lip = sampleRamp(jumpConfig.lipX, jumpConfig);

    expect(start.slope).toBeCloseTo(jumpConfig.rampStartSlope, 12);
    expect(start.slope).toBeGreaterThan(middle.slope);
    expect(middle.slope).toBeGreaterThan(takeoff.slope);
    expect(takeoff.slope).toBeCloseTo(jumpConfig.lipSlope, 12);
    expect(lip.slope).toBeCloseTo(jumpConfig.lipSlope, 12);
    expect(lip.y).toBeLessThan(takeoff.y);
  });

  it("keeps the rendered curve on the authoritative terrain query", () => {
    const points = sampleRampCurve(jumpConfig, 8);
    expect(points.at(0)).toEqual(sampleRamp(jumpConfig.startX, jumpConfig));
    expect(points.at(-1)).toEqual(sampleRamp(jumpConfig.lipX, jumpConfig));

    for (const point of points) {
      expect(point).toEqual(sampleRamp(point.x, jumpConfig));
    }

    const seam = jumpConfig.takeoffStartX;
    const epsilon = 1e-4;
    expect(sampleRamp(seam - epsilon, jumpConfig).y).toBeCloseTo(
      sampleRamp(seam + epsilon, jumpConfig).y,
      3,
    );
    expect(sampleRamp(seam - epsilon, jumpConfig).slope).toBeCloseTo(
      sampleRamp(seam + epsilon, jumpConfig).slope,
      3,
    );
  });

  it("uses a rounded landing hill that eases into a shallow runout", () => {
    const start = sampleLanding(jumpConfig.landingStartX, jumpConfig);
    const middle = sampleLanding(
      (jumpConfig.landingStartX + jumpConfig.landingEndX) / 2,
      jumpConfig,
    );
    const end = sampleLanding(jumpConfig.landingEndX, jumpConfig);
    const runout = sampleLanding(jumpConfig.landingEndX + 100, jumpConfig);

    expect(start).toEqual({
      y: jumpConfig.landingY,
      slope: jumpConfig.landingSlope,
    });
    expect(middle.y).toBeGreaterThan(start.y);
    expect(middle.y).toBeLessThan(end.y);
    expect(middle.slope).toBeLessThan(start.slope);
    expect(middle.slope).toBeGreaterThan(end.slope);
    expect(end).toEqual({
      y: jumpConfig.landingEndY,
      slope: jumpConfig.landingEndSlope,
    });
    expect(runout.y).toBeCloseTo(
      jumpConfig.landingEndY + 100 * jumpConfig.landingEndSlope,
      12,
    );
  });

  it("keeps the rendered landing curve on the collision surface", () => {
    const points = sampleLandingCurve(jumpConfig, 10, 3000);
    for (const point of points) {
      expect(point).toEqual({
        x: point.x,
        ...sampleLanding(point.x, jumpConfig),
      });
    }
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
