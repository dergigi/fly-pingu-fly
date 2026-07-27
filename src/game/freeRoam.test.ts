import { describe, expect, it } from "vitest";

import {
  createFreeRoamState,
  freeRoamDefaults,
  poseForFreeRoam,
  setFreeRoamFacing,
  stepFreeRoam,
  tryFreeRoamJump,
  type FreeRoamConfig,
} from "./freeRoam";

const config: FreeRoamConfig = {
  ...freeRoamDefaults,
  minX: 0,
  maxX: 800,
};

const flatGround = () => ({ y: 400, slope: 0 });

describe("free roam hop/slide", () => {
  it("turns without walking", () => {
    const idle = createFreeRoamState(200, 400, 1);
    const left = setFreeRoamFacing(idle, -1);
    expect(left.facing).toBe(-1);
    expect(left.x).toBe(idle.x);
    expect(left.vx).toBe(0);
  });

  it("jumps and slides in the facing direction", () => {
    const grounded = createFreeRoamState(200, 400, 1);
    const jumped = tryFreeRoamJump(grounded, config);
    expect(jumped.grounded).toBe(false);
    expect(jumped.vy).toBe(config.jumpVy);
    expect(jumped.vx).toBe(config.jumpVx);

    let state = jumped;
    for (let i = 0; i < 180; i += 1) {
      state = stepFreeRoam(state, 1 / 60, config, flatGround);
    }
    expect(state.grounded).toBe(true);
    expect(state.x).toBeGreaterThan(grounded.x);
  });

  it("ignores jump while airborne", () => {
    const airborne = tryFreeRoamJump(createFreeRoamState(200, 400, 1), config);
    const again = tryFreeRoamJump(airborne, config);
    expect(again).toEqual(airborne);
  });

  it("picks poses for idle, hop, and slide", () => {
    expect(poseForFreeRoam(createFreeRoamState(0, 0, 1))).toBe("ready");
    expect(
      poseForFreeRoam({
        ...createFreeRoamState(0, 0, 1),
        grounded: false,
        vy: -10,
      }),
    ).toBe("takeoff");
    expect(
      poseForFreeRoam({
        ...createFreeRoamState(0, 0, 1),
        grounded: false,
        vy: 10,
      }),
    ).toBe("flight");
    expect(
      poseForFreeRoam({
        ...createFreeRoamState(0, 0, 1),
        vx: 80,
      }),
    ).toBe("slide");
  });
});
