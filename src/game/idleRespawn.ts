import { freeRoamDefaults } from "./freeRoam";

export type IdleRespawnSample = Readonly<{
  eligible: boolean;
  grounded: boolean;
  speed: number;
  x: number;
  y: number;
}>;

export type IdleRespawnState = Readonly<{
  idleMs: number;
  lastX: number;
  lastY: number;
}>;

export type IdleRespawnConfig = Readonly<{
  timeoutMs: number;
  warnMs: number;
  speedEpsilon: number;
  positionEpsilon: number;
}>;

export type IdleRespawnStepResult = Readonly<{
  state: IdleRespawnState;
  shouldRespawn: boolean;
  warnProgress: number;
}>;

export const idleRespawnDefaults = Object.freeze({
  timeoutMs: 5000,
  warnMs: 2000,
  speedEpsilon: freeRoamDefaults.stopSpeed,
  positionEpsilon: 0.5,
}) satisfies IdleRespawnConfig;

export function createIdleRespawnState(x: number, y: number): IdleRespawnState {
  return {
    idleMs: 0,
    lastX: x,
    lastY: y,
  };
}

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function warnProgressFor(
  idleMs: number,
  config: IdleRespawnConfig,
): number {
  const warnStart = config.timeoutMs - config.warnMs;
  return clamp01((idleMs - warnStart) / config.warnMs);
}

export function stepIdleRespawn(
  state: IdleRespawnState,
  sample: IdleRespawnSample,
  dtMs: number,
  config: IdleRespawnConfig = idleRespawnDefaults,
): IdleRespawnStepResult {
  if (!Number.isFinite(dtMs) || dtMs <= 0) {
    return {
      state,
      shouldRespawn: false,
      warnProgress: warnProgressFor(state.idleMs, config),
    };
  }

  const dx = sample.x - state.lastX;
  const dy = sample.y - state.lastY;
  const positionDelta = Math.hypot(dx, dy);
  const still =
    sample.eligible &&
    sample.grounded &&
    sample.speed <= config.speedEpsilon &&
    positionDelta <= config.positionEpsilon;

  if (!still) {
    return {
      state: {
        idleMs: 0,
        lastX: sample.x,
        lastY: sample.y,
      },
      shouldRespawn: false,
      warnProgress: 0,
    };
  }

  const idleMs = state.idleMs + dtMs;
  return {
    state: {
      idleMs,
      lastX: sample.x,
      lastY: sample.y,
    },
    shouldRespawn: idleMs >= config.timeoutMs,
    warnProgress: warnProgressFor(idleMs, config),
  };
}
