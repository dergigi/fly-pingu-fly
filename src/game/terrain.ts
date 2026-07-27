import {
  assertValidTerrainConfig,
  type TerrainConfig,
} from "./config";

export type { TerrainConfig } from "./config";

export type RampSample = Readonly<{
  x: number;
  y: number;
  slope: number;
}>;

export type SurfaceSample = Readonly<{
  y: number;
  slope: number;
}>;

function assertFiniteCoordinate(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
}

export function sampleRamp(
  progress: number,
  config: TerrainConfig,
): RampSample {
  assertValidTerrainConfig(config);
  assertFiniteCoordinate("ramp progress", progress);

  const x = Math.max(config.startX, Math.min(config.lipX, progress));
  const takeoffY =
    config.lipY -
    (config.lipX - config.takeoffStartX) * config.lipSlope;

  if (x >= config.takeoffStartX) {
    return {
      x: progress,
      y: takeoffY + (x - config.takeoffStartX) * config.lipSlope,
      slope: config.lipSlope,
    };
  }

  const span = config.takeoffStartX - config.startX;
  const t = (x - config.startX) / span;
  const t2 = t * t;
  const t3 = t2 * t;
  const startTangent = config.rampStartSlope * span;
  const endTangent = config.lipSlope * span;
  const y =
    (2 * t3 - 3 * t2 + 1) * config.startY +
    (t3 - 2 * t2 + t) * startTangent +
    (-2 * t3 + 3 * t2) * takeoffY +
    (t3 - t2) * endTangent;
  const slope =
    ((6 * t2 - 6 * t) * config.startY +
      (3 * t2 - 4 * t + 1) * startTangent +
      (-6 * t2 + 6 * t) * takeoffY +
      (3 * t2 - 2 * t) * endTangent) /
    span;

  return {
    x: progress,
    y,
    slope,
  };
}

export function sampleRampCurve(
  config: TerrainConfig,
  step: number,
): readonly RampSample[] {
  assertValidTerrainConfig(config);
  if (!Number.isFinite(step) || step <= 0) {
    throw new RangeError("ramp curve step must be greater than zero");
  }

  const points: RampSample[] = [];
  for (let x = config.startX; x < config.lipX; x += step) {
    points.push(sampleRamp(x, config));
  }
  points.push(sampleRamp(config.lipX, config));
  return points;
}

export function sampleLanding(
  x: number,
  config: TerrainConfig,
): SurfaceSample {
  assertValidTerrainConfig(config);
  assertFiniteCoordinate("landing position", x);

  return {
    y:
      config.landingY +
      Math.max(0, x - config.landingStartX) * config.landingSlope,
    slope: config.landingSlope,
  };
}

export function crossingFraction(
  previousGap: number,
  nextGap: number,
): number {
  assertFiniteCoordinate("previous terrain gap", previousGap);
  assertFiniteCoordinate("next terrain gap", nextGap);

  const denominator = nextGap - previousGap;
  if (denominator === 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, -previousGap / denominator));
}
