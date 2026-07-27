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
  takeoffStartY: number;
  takeoffEntrySlope: number;
  lipX: number;
  lipY: number;
  lipSlope: number;
  landingStartX: number;
  landingY: number;
  landingSlope: number;
  landingCrestX: number;
  landingCrestY: number;
  landingCrestSlope: number;
  landingEndX: number;
  landingEndY: number;
  landingEndSlope: number;
  landingRunoutEndX: number;
  landingRunoutEndY: number;
  landingRunoutEndSlope: number;
}>;

export type JumpConfig = Readonly<
  TakeoffConfig &
    TerrainConfig & {
  readyX: number;
  readyY: number;
  startHopVx: number;
  startHopVy: number;
  initialSpeed: number;
  rampAcceleration: number;
  crouchRampAcceleration: number;
  lateBoundaryX: number;
  minimumLaunchX: number;
  maximumLaunchX: number;
  minimumLaunchY: number;
  maximumLaunchY: number;
  gravity: number;
  flightCrouchGravityScale: number;
  flightCrouchAscentGravityScale: number;
  slideDeceleration: number;
  stopSpeed: number;
    }
>;

export const jumpConfig: JumpConfig = Object.freeze({
  readyX: 48,
  readyY: 18,
  startHopVx: 90,
  startHopVy: -85,
  startX: 72,
  startY: 36,
  initialSpeed: 170,
  rampAcceleration: 250,
  crouchRampAcceleration: 520,
  rampStartSlope: 2.75,
  takeoffStartX: 700,
  takeoffStartY: 600,
  takeoffEntrySlope: 0.5,
  lipX: 900,
  lipY: 625,
  lipSlope: 0.06,
  lateBoundaryX: 900,
  minimumQuality: 0.22,
  earlySpan: 220,
  lateSpan: 70,
  minimumLaunchX: 400,
  maximumLaunchX: 900,
  minimumLaunchY: 220,
  maximumLaunchY: 1020,
  gravity: 640,
  flightCrouchGravityScale: 0.55,
  flightCrouchAscentGravityScale: 1.85,
  landingStartX: 980,
  landingY: 690,
  landingSlope: -0.45,
  landingCrestX: 1550,
  landingCrestY: 380,
  landingCrestSlope: 0.02,
  landingEndX: 4900,
  landingEndY: 1720,
  landingEndSlope: 0.12,
  landingRunoutEndX: 8200,
  landingRunoutEndY: 1450,
  landingRunoutEndSlope: -0.07,
  slideDeceleration: 250,
  stopSpeed: 1,
});

const finiteFields = [
  "readyX",
  "readyY",
  "startHopVx",
  "startHopVy",
  "lateBoundaryX",
] as const satisfies readonly (keyof JumpConfig)[];

const positiveFields = [
  "initialSpeed",
  "rampAcceleration",
  "crouchRampAcceleration",
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
    "takeoffStartY",
    "takeoffEntrySlope",
    "lipY",
    "lipSlope",
    "landingStartX",
    "landingY",
    "landingSlope",
    "landingCrestX",
    "landingCrestY",
    "landingCrestSlope",
    "landingEndX",
    "landingEndY",
    "landingEndSlope",
    "landingRunoutEndX",
    "landingRunoutEndY",
    "landingRunoutEndSlope",
  ] as const) {
    assertFinite(field, config[field]);
  }

  if (
    config.takeoffStartX <= config.startX ||
    config.takeoffStartX >= config.lipX
  ) {
    throw new RangeError("takeoffStartX must lie inside the ramp");
  }
  if (config.landingStartX <= config.lipX) {
    throw new RangeError("landingStartX must be beyond the takeoff lip");
  }
  if (
    config.landingCrestX <= config.landingStartX ||
    config.landingCrestX >= config.landingEndX
  ) {
    throw new RangeError("landingCrestX must lie inside the landing hill");
  }
  if (config.landingEndX <= config.landingStartX) {
    throw new RangeError("landingEndX must be beyond landingStartX");
  }
  if (config.landingRunoutEndX <= config.landingEndX) {
    throw new RangeError("landingRunoutEndX must be beyond landingEndX");
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
  assertFinite("flightCrouchGravityScale", config.flightCrouchGravityScale);
  if (
    config.flightCrouchGravityScale <= 0 ||
    config.flightCrouchGravityScale > 1
  ) {
    throw new RangeError(
      "flightCrouchGravityScale must be greater than zero and at most one",
    );
  }
  assertFinite(
    "flightCrouchAscentGravityScale",
    config.flightCrouchAscentGravityScale,
  );
  if (config.flightCrouchAscentGravityScale < 1) {
    throw new RangeError(
      "flightCrouchAscentGravityScale must be at least one",
    );
  }
}
