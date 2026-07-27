import { describe, expect, it } from "vitest";

import {
  assertValidJumpConfig,
  jumpConfig,
  type JumpConfig,
} from "./config";
import {
  launchFromQuality,
  takeoffQuality,
  type TakeoffConfig,
} from "./takeoff";
import { createInitialJumpState, type RampState } from "./jump";

type Invariant = "finite" | "positive" | "bounded";
type NumericField = {
  [Key in keyof JumpConfig]: JumpConfig[Key] extends number ? Key : never;
}[keyof JumpConfig];

const fieldInvariants = {
  readyX: "finite",
  readyY: "finite",
  startHopVx: "finite",
  startHopVy: "finite",
  startX: "finite",
  startY: "finite",
  initialSpeed: "positive",
  rampAcceleration: "positive",
  crouchRampAcceleration: "positive",
  rampStartSlope: "finite",
  takeoffStartX: "finite",
  lipX: "finite",
  lipY: "finite",
  lipSlope: "finite",
  lateBoundaryX: "finite",
  minimumQuality: "bounded",
  earlySpan: "positive",
  lateSpan: "positive",
  minimumLaunchX: "positive",
  maximumLaunchX: "positive",
  minimumLaunchY: "positive",
  maximumLaunchY: "positive",
  gravity: "positive",
  flightCrouchGravityScale: "finite",
  flightCrouchAscentGravityScale: "finite",
  landingStartX: "finite",
  landingY: "finite",
  landingSlope: "finite",
  landingCrestX: "finite",
  landingCrestY: "finite",
  landingCrestSlope: "finite",
  landingEndX: "finite",
  landingEndY: "finite",
  landingEndSlope: "finite",
  landingRunoutEndX: "finite",
  landingRunoutEndY: "finite",
  landingRunoutEndSlope: "finite",
  slideDeceleration: "positive",
  stopSpeed: "positive",
} satisfies Record<NumericField, Invariant>;

function withField(field: NumericField, value: number): JumpConfig {
  return { ...jumpConfig, [field]: value };
}

describe("takeoff quality", () => {
  const config: TakeoffConfig = jumpConfig;

  it("peaks at the lip and remains continuous and bounded", () => {
    expect(takeoffQuality(config.lipX, config)).toBe(1);
    expect(takeoffQuality(config.lipX - 1e-6, config)).toBeCloseTo(1, 12);
    expect(takeoffQuality(config.lipX + 1e-6, config)).toBeCloseTo(1, 12);

    for (let x = config.lipX - 500; x <= config.lipX + 500; x += 1) {
      expect(takeoffQuality(x, config)).toBeGreaterThanOrEqual(
        config.minimumQuality,
      );
      expect(takeoffQuality(x, config)).toBeLessThanOrEqual(1);
    }
  });

  it("falls monotonically over broad early and short late spans", () => {
    expect(config.earlySpan).toBe(220);
    expect(config.lateSpan).toBe(70);

    const early = Array.from({ length: config.earlySpan + 1 }, (_, offset) =>
      takeoffQuality(config.lipX - offset, config),
    );
    const late = Array.from({ length: config.lateSpan + 1 }, (_, offset) =>
      takeoffQuality(config.lipX + offset, config),
    );

    for (const side of [early, late]) {
      for (let index = 1; index < side.length; index += 1) {
        expect(side[index]!).toBeLessThanOrEqual(side[index - 1]!);
      }
    }
    expect(early.at(-1)).toBe(config.minimumQuality);
    expect(late.at(-1)).toBe(config.minimumQuality);
  });

  it.each([0, 0.35, 1])(
    "maps quality %s to a safe finite launch",
    (quality) => {
      const state = createInitialJumpState(jumpConfig) as RampState;
      const flight = launchFromQuality(state, quality, jumpConfig);

      expect(flight.phase).toBe("flight");
      expect(flight.vx).toBeGreaterThan(0);
      expect(flight.vy).toBeLessThan(0);
      expect(
        Object.values(flight)
          .filter((value): value is number => typeof value === "number")
          .every(Number.isFinite),
      ).toBe(true);
    },
  );
});

describe("jump config validation", () => {
  it.each(Object.keys(fieldInvariants) as NumericField[])(
    "rejects every non-finite %s",
    (field) => {
      for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        expect(() => assertValidJumpConfig(withField(field, value))).toThrow(
          RangeError,
        );
      }
    },
  );

  it.each(
    Object.entries(fieldInvariants)
      .filter(([, invariant]) => invariant === "positive")
      .map(([field]) => field as NumericField),
  )("rejects non-positive %s", (field) => {
    expect(() => assertValidJumpConfig(withField(field, 0))).toThrow(RangeError);
    expect(() => assertValidJumpConfig(withField(field, -1))).toThrow(
      RangeError,
    );
  });

  it("accepts inclusive quality bounds and rejects values outside them", () => {
    expect(() =>
      assertValidJumpConfig(withField("minimumQuality", 0)),
    ).not.toThrow();
    expect(() =>
      assertValidJumpConfig(withField("minimumQuality", 1)),
    ).not.toThrow();
    expect(() =>
      assertValidJumpConfig(withField("minimumQuality", -Number.EPSILON)),
    ).toThrow(RangeError);
    expect(() =>
      assertValidJumpConfig(withField("minimumQuality", 1 + Number.EPSILON)),
    ).toThrow(RangeError);
  });

  it("requires flight crouch gravity scale in (0, 1]", () => {
    expect(() =>
      assertValidJumpConfig(withField("flightCrouchGravityScale", 1)),
    ).not.toThrow();
    expect(() =>
      assertValidJumpConfig(withField("flightCrouchGravityScale", 0.55)),
    ).not.toThrow();
    expect(() =>
      assertValidJumpConfig(withField("flightCrouchGravityScale", 0)),
    ).toThrow(RangeError);
    expect(() =>
      assertValidJumpConfig(withField("flightCrouchGravityScale", 1.01)),
    ).toThrow(RangeError);
  });

  it("requires flight crouch ascent gravity scale of at least one", () => {
    expect(() =>
      assertValidJumpConfig(withField("flightCrouchAscentGravityScale", 1)),
    ).not.toThrow();
    expect(() =>
      assertValidJumpConfig(withField("flightCrouchAscentGravityScale", 1.85)),
    ).not.toThrow();
    expect(() =>
      assertValidJumpConfig(withField("flightCrouchAscentGravityScale", 0.99)),
    ).toThrow(RangeError);
  });

  it("rejects reversed launch bounds", () => {
    expect(() =>
      assertValidJumpConfig({
        ...jumpConfig,
        maximumLaunchX: jumpConfig.minimumLaunchX - 1,
      }),
    ).toThrow(RangeError);
    expect(() =>
      assertValidJumpConfig({
        ...jumpConfig,
        maximumLaunchY: jumpConfig.minimumLaunchY - 1,
      }),
    ).toThrow(RangeError);
  });
});
