import {
  assertValidJumpConfig,
  assertValidTakeoffConfig,
  type JumpConfig,
  type TakeoffConfig,
} from "./config";
import type { FlightState, RampState } from "./jump";

export type { TakeoffConfig } from "./config";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function takeoffQuality(
  x: number,
  config: TakeoffConfig,
): number {
  assertValidTakeoffConfig(config);
  if (!Number.isFinite(x)) {
    throw new RangeError("takeoff position must be finite");
  }

  const span = x <= config.lipX ? config.earlySpan : config.lateSpan;
  const normalized = clamp01(Math.abs(x - config.lipX) / span);
  const smoothstep = normalized * normalized * (3 - 2 * normalized);

  return (
    config.minimumQuality +
    (1 - config.minimumQuality) * (1 - smoothstep)
  );
}

export function launchFromQuality(
  state: RampState,
  quality: number,
  config: JumpConfig,
): FlightState {
  assertValidJumpConfig(config);
  if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
    throw new RangeError("launch quality must be finite and between zero and one");
  }

  return {
    ...state,
    phase: "flight",
    vx:
      config.minimumLaunchX +
      (config.maximumLaunchX - config.minimumLaunchX) * quality,
    vy: -(
      config.minimumLaunchY +
      (config.maximumLaunchY - config.minimumLaunchY) * quality
    ),
    speed: 0,
  };
}
