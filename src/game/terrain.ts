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

function sampleHermite(
  x: number,
  startX: number,
  startY: number,
  startSlope: number,
  endX: number,
  endY: number,
  endSlope: number,
): SurfaceSample {
  const span = endX - startX;
  const t = (x - startX) / span;
  const t2 = t * t;
  const t3 = t2 * t;
  const startTangent = startSlope * span;
  const endTangent = endSlope * span;

  return {
    y:
      (2 * t3 - 3 * t2 + 1) * startY +
      (t3 - 2 * t2 + t) * startTangent +
      (-2 * t3 + 3 * t2) * endY +
      (t3 - t2) * endTangent,
    slope:
      ((6 * t2 - 6 * t) * startY +
        (3 * t2 - 4 * t + 1) * startTangent +
        (-6 * t2 + 6 * t) * endY +
        (3 * t2 - 2 * t) * endTangent) /
      span,
  };
}

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

  const curve = sampleHermite(
    x,
    config.startX,
    config.startY,
    config.rampStartSlope,
    config.takeoffStartX,
    takeoffY,
    config.lipSlope,
  );

  return {
    x: progress,
    ...curve,
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

  if (x <= config.landingStartX) {
    return { y: config.landingY, slope: config.landingSlope };
  }

  if (x < config.landingCrestX) {
    return sampleHermite(
      x,
      config.landingStartX,
      config.landingY,
      config.landingSlope,
      config.landingCrestX,
      config.landingCrestY,
      config.landingCrestSlope,
    );
  }

  if (x < config.landingEndX) {
    return sampleHermite(
      x,
      config.landingCrestX,
      config.landingCrestY,
      config.landingCrestSlope,
      config.landingEndX,
      config.landingEndY,
      config.landingEndSlope,
    );
  }

  return {
    y:
      config.landingEndY +
      (x - config.landingEndX) * config.landingEndSlope,
    slope: config.landingEndSlope,
  };
}

export function sampleLandingCurve(
  config: TerrainConfig,
  step: number,
  endX: number,
): readonly RampSample[] {
  assertValidTerrainConfig(config);
  if (!Number.isFinite(step) || step <= 0) {
    throw new RangeError("landing curve step must be greater than zero");
  }
  assertFiniteCoordinate("landing curve end", endX);
  if (endX < config.landingStartX) {
    throw new RangeError("landing curve end must follow landingStartX");
  }

  const points: RampSample[] = [];
  for (let x = config.landingStartX; x < endX; x += step) {
    points.push({ x, ...sampleLanding(x, config) });
  }
  points.push({ x: endX, ...sampleLanding(endX, config) });
  return points;
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
