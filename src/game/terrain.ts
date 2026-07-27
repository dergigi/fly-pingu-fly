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

  return {
    x: progress,
    y: config.startY + (progress - config.startX) * config.rampSlope,
    slope: config.rampSlope,
  };
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
