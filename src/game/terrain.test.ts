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

  it("uses a knoll landing hill that rises then falls into the runout", () => {
    const start = sampleLanding(jumpConfig.landingStartX, jumpConfig);
    const climb = sampleLanding(
      (jumpConfig.landingStartX + jumpConfig.landingCrestX) / 2,
      jumpConfig,
    );
    const crest = sampleLanding(jumpConfig.landingCrestX, jumpConfig);
    const descent = sampleLanding(
      (jumpConfig.landingCrestX + jumpConfig.landingEndX) / 2,
      jumpConfig,
    );
    const end = sampleLanding(jumpConfig.landingEndX, jumpConfig);
    const climbOut = sampleLanding(
      (jumpConfig.landingEndX + jumpConfig.landingRunoutEndX) / 2,
      jumpConfig,
    );
    const runout = sampleLanding(jumpConfig.landingRunoutEndX, jumpConfig);
    const beyond = sampleLanding(jumpConfig.landingRunoutEndX + 100, jumpConfig);

    expect(start).toEqual({
      y: jumpConfig.landingY,
      slope: jumpConfig.landingSlope,
    });
    expect(climb.y).toBeLessThan(start.y);
    expect(climb.y).toBeGreaterThan(crest.y);
    expect(crest).toEqual({
      y: jumpConfig.landingCrestY,
      slope: jumpConfig.landingCrestSlope,
    });
    expect(descent.y).toBeGreaterThan(crest.y);
    expect(descent.y).toBeLessThan(end.y);
    expect(end).toEqual({
      y: jumpConfig.landingEndY,
      slope: jumpConfig.landingEndSlope,
    });
    expect(climbOut.y).toBeLessThan(end.y);
    expect(climbOut.y).toBeGreaterThan(runout.y);
    expect(runout).toEqual({
      y: jumpConfig.landingRunoutEndY,
      slope: jumpConfig.landingRunoutEndSlope,
    });
    expect(beyond.y).toBeCloseTo(
      jumpConfig.landingRunoutEndY +
        100 * jumpConfig.landingRunoutEndSlope,
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

  it("lands when the flight path crosses rising terrain", () => {
    const x = jumpConfig.landingCrestX - 120;
    const surface = sampleLanding(x, jumpConfig);
    const ahead = sampleLanding(x + 30, jumpConfig);
    expect(ahead.y).toBeLessThan(surface.y);

    const state: FlightState = {
      phase: "flight",
      x,
      y: surface.y - 0.5,
      vx: 30 / (1 / 120),
      vy: 0,
      speed: 0,
      elapsed: 1,
      airtime: 0.2,
      distance: Math.max(0, x - jumpConfig.lipX),
    };

    expect(stepJump(state, null, 1 / 120, jumpConfig).phase).toBe("crashed");
  });

  it("does not land while still clearly above the hill", () => {
    const surface = sampleLanding(jumpConfig.landingStartX, jumpConfig);
    const state: FlightState = {
      phase: "flight",
      x: jumpConfig.landingStartX,
      y: surface.y - 40,
      vx: 100,
      vy: -100,
      speed: 0,
      elapsed: 1,
      airtime: 0.5,
      distance: 0,
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
      distance: Math.max(0, jumpConfig.landingStartX - jumpConfig.lipX),
    };
    const nextY =
      state.y + state.vy * dt + 0.5 * jumpConfig.gravity * dt * dt;
    const fraction = crossingFraction(
      state.y - surface.y,
      nextY - surface.y,
    );
    const landed = stepJump(state, null, dt, jumpConfig);

    expect(landed.phase).toBe("crashed");
    expect(landed.y).toBe(surface.y);
    expect(landed.elapsed).toBeCloseTo(state.elapsed + dt * fraction, 12);
    expect(landed.airtime).toBeCloseTo(state.airtime + dt * fraction, 12);
  });

  it("slides when contacting past the crest", () => {
    const x = jumpConfig.landingCrestX + 40;
    const surface = sampleLanding(x, jumpConfig);
    const state: FlightState = {
      phase: "flight",
      x,
      y: surface.y - 1,
      vx: 120,
      vy: 180,
      speed: 0,
      elapsed: 1,
      airtime: 0.8,
      distance: Math.max(0, x - jumpConfig.lipX),
    };

    expect(stepJump(state, null, 1 / 120, jumpConfig).phase).toBe("slide");
  });
});
