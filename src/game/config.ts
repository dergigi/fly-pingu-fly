export const FIXED_STEP = 1 / 120;
export const MAX_CATCH_UP_STEPS = 12;
export const MAX_FRAME_DELTA = 0.1;

export type TakeoffConfig = Readonly<{
  lipX: number;
  earlySpan: number;
  lateSpan: number;
  minimumQuality: number;
}>;

export type TerrainConfig = Readonly<{
  startX: number;
  startY: number;
  rampStartSlope: number;
  takeoffStartX: number;
  lipX: number;
  lipY: number;
  lipSlope: number;
  landingStartX: number;
  landingY: number;
  landingSlope: number;
}>;

export type JumpConfig = Readonly<
  TakeoffConfig &
    TerrainConfig & {
  initialSpeed: number;
  rampAcceleration: number;
  lateBoundaryX: number;
  minimumLaunchX: number;
  maximumLaunchX: number;
  minimumLaunchY: number;
  maximumLaunchY: number;
  gravity: number;
  slideDeceleration: number;
  stopSpeed: number;
    }
>;

export const jumpConfig: JumpConfig = Object.freeze({
  startX: 120,
  startY: 150,
  initialSpeed: 70,
  rampAcceleration: 80,
  rampStartSlope: 1,
  takeoffStartX: 460,
  lipX: 520,
  lipY: 364,
  lipSlope: -0.1,
  lateBoundaryX: 520,
  minimumQuality: 0.35,
  earlySpan: 180,
  lateSpan: 60,
  minimumLaunchX: 420,
  maximumLaunchX: 600,
  minimumLaunchY: 300,
  maximumLaunchY: 460,
  gravity: 700,
  landingStartX: 560,
  landingY: 430,
  landingSlope: 0.18,
  slideDeceleration: 95,
  stopSpeed: 1,
});

const finiteFields = ["lateBoundaryX"] as const satisfies readonly (keyof JumpConfig)[];

const positiveFields = [
  "initialSpeed",
  "rampAcceleration",
  "minimumLaunchX",
  "maximumLaunchX",
  "minimumLaunchY",
  "maximumLaunchY",
  "gravity",
  "slideDeceleration",
  "stopSpeed",
] as const satisfies readonly (keyof JumpConfig)[];

function assertFinite(field: keyof JumpConfig, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${field} must be finite`);
  }
}

export function assertValidTakeoffConfig(config: TakeoffConfig): void {
  assertFinite("lipX", config.lipX);
  for (const field of ["earlySpan", "lateSpan"] as const) {
    assertFinite(field, config[field]);
    if (config[field] <= 0) {
      throw new RangeError(`${field} must be greater than zero`);
    }
  }
  assertFinite("minimumQuality", config.minimumQuality);
  if (config.minimumQuality < 0 || config.minimumQuality > 1) {
    throw new RangeError("minimumQuality must be between zero and one");
  }
}

export function assertValidTerrainConfig(config: TerrainConfig): void {
  for (const field of [
    "startX",
    "startY",
    "rampStartSlope",
    "takeoffStartX",
    "lipY",
    "lipSlope",
    "landingStartX",
    "landingY",
    "landingSlope",
  ] as const) {
    assertFinite(field, config[field]);
  }

  if (
    config.takeoffStartX <= config.startX ||
    config.takeoffStartX >= config.lipX
  ) {
    throw new RangeError("takeoffStartX must lie inside the ramp");
  }
}

export function assertValidJumpConfig(config: JumpConfig): void {
  assertValidTakeoffConfig(config);
  assertValidTerrainConfig(config);
  for (const field of finiteFields) {
    assertFinite(field, config[field]);
  }

  for (const field of positiveFields) {
    const value = config[field];
    assertFinite(field, value);
    if (value <= 0) {
      throw new RangeError(`${field} must be greater than zero`);
    }
  }

  if (config.maximumLaunchX < config.minimumLaunchX) {
    throw new RangeError("maximumLaunchX must not be below minimumLaunchX");
  }
  if (config.maximumLaunchY < config.minimumLaunchY) {
    throw new RangeError("maximumLaunchY must not be below minimumLaunchY");
  }
  if (config.lateBoundaryX < config.lipX) {
    throw new RangeError("lateBoundaryX must not be before lipX");
  }
}
