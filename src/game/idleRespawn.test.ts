import { describe, expect, it } from "vitest";

import {
  createIdleRespawnState,
  idleRespawnDefaults,
  stepIdleRespawn,
  type IdleRespawnSample,
} from "./idleRespawn";

function stillSample(
  overrides: Partial<IdleRespawnSample> = {},
): IdleRespawnSample {
  return {
    eligible: true,
    grounded: true,
    speed: 0,
    x: 100,
    y: 400,
    ...overrides,
  };
}

describe("idle respawn", () => {
  it("accumulates idleMs while grounded and still", () => {
    let state = createIdleRespawnState(100, 400);
    const result = stepIdleRespawn(state, stillSample(), 1000);
    expect(result.state.idleMs).toBe(1000);
    expect(result.shouldRespawn).toBe(false);
    expect(result.warnProgress).toBe(0);

    state = result.state;
    const next = stepIdleRespawn(state, stillSample(), 500);
    expect(next.state.idleMs).toBe(1500);
  });

  it("resets idleMs when speed exceeds epsilon", () => {
    let state = createIdleRespawnState(100, 400);
    state = stepIdleRespawn(state, stillSample(), 2000).state;
    const result = stepIdleRespawn(
      state,
      stillSample({ speed: idleRespawnDefaults.speedEpsilon + 1 }),
      16,
    );
    expect(result.state.idleMs).toBe(0);
    expect(result.shouldRespawn).toBe(false);
    expect(result.warnProgress).toBe(0);
  });

  it("resets idleMs when position moves past epsilon", () => {
    let state = createIdleRespawnState(100, 400);
    state = stepIdleRespawn(state, stillSample(), 2000).state;
    const result = stepIdleRespawn(
      state,
      stillSample({ x: 100 + idleRespawnDefaults.positionEpsilon + 1 }),
      16,
    );
    expect(result.state.idleMs).toBe(0);
    expect(result.state.lastX).toBe(100 + idleRespawnDefaults.positionEpsilon + 1);
  });

  it("resets idleMs when not grounded", () => {
    let state = createIdleRespawnState(100, 400);
    state = stepIdleRespawn(state, stillSample(), 2000).state;
    const result = stepIdleRespawn(
      state,
      stillSample({ grounded: false }),
      16,
    );
    expect(result.state.idleMs).toBe(0);
  });

  it("resets idleMs when not eligible", () => {
    let state = createIdleRespawnState(100, 400);
    state = stepIdleRespawn(state, stillSample(), 2000).state;
    const result = stepIdleRespawn(
      state,
      stillSample({ eligible: false }),
      16,
    );
    expect(result.state.idleMs).toBe(0);
  });

  it("shouldRespawn when idleMs reaches timeout", () => {
    let state = createIdleRespawnState(100, 400);
    const result = stepIdleRespawn(
      state,
      stillSample(),
      idleRespawnDefaults.timeoutMs,
    );
    expect(result.state.idleMs).toBe(idleRespawnDefaults.timeoutMs);
    expect(result.shouldRespawn).toBe(true);
    expect(result.warnProgress).toBe(1);
  });

  it("warnProgress rises only in the final warn window", () => {
    let state = createIdleRespawnState(100, 400);
    const beforeWarn = idleRespawnDefaults.timeoutMs - idleRespawnDefaults.warnMs;
    let result = stepIdleRespawn(state, stillSample(), beforeWarn);
    expect(result.warnProgress).toBe(0);

    state = result.state;
    result = stepIdleRespawn(state, stillSample(), idleRespawnDefaults.warnMs / 2);
    expect(result.warnProgress).toBeCloseTo(0.5, 5);

    state = result.state;
    result = stepIdleRespawn(state, stillSample(), idleRespawnDefaults.warnMs / 2);
    expect(result.warnProgress).toBe(1);
    expect(result.shouldRespawn).toBe(true);
  });

  it("leaves state unchanged when dtMs is not positive", () => {
    const state = createIdleRespawnState(100, 400);
    const advanced = stepIdleRespawn(state, stillSample(), 1000).state;
    const zero = stepIdleRespawn(advanced, stillSample(), 0);
    expect(zero.state).toEqual(advanced);
    expect(zero.shouldRespawn).toBe(false);

    const negative = stepIdleRespawn(advanced, stillSample(), -10);
    expect(negative.state).toEqual(advanced);
    expect(negative.shouldRespawn).toBe(false);
  });
});
