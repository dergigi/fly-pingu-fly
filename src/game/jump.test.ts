import { describe, expect, it } from "vitest";

import { FIXED_STEP, jumpConfig } from "./config";
import {
  createInitialJumpState,
  stepJump,
  type JumpState,
  type PressCommand,
} from "./jump";

type TraceResult = {
  takeoffVelocity: { vx: number; vy: number };
  firstContact: { x: number; y: number; airtime: number };
  resting: JumpState;
  phases: JumpState["phase"][];
};

function trace(renderHz: number, commandAtMs: number | null): TraceResult {
  let state = createInitialJumpState(jumpConfig);
  let accumulator = 0;
  let simulationTimeMs = 0;
  let command: PressCommand =
    commandAtMs === null ? null : { pressedAtMs: commandAtMs };
  let takeoffVelocity: TraceResult["takeoffVelocity"] | null = null;
  let firstContact: TraceResult["firstContact"] | null = null;
  const phases: JumpState["phase"][] = [state.phase];

  for (let frame = 0; frame < renderHz * 30; frame += 1) {
    accumulator += 1 / renderHz;

    while (accumulator + Number.EPSILON >= FIXED_STEP) {
      simulationTimeMs += FIXED_STEP * 1000;
      const dueCommand =
        command !== null && command.pressedAtMs <= simulationTimeMs
          ? command
          : null;
      const previousPhase = state.phase;
      const nextState: JumpState = stepJump(
        state,
        dueCommand,
        FIXED_STEP,
        jumpConfig,
      );
      const nextPhase: JumpState["phase"] = nextState.phase;
      state = nextState;

      if (dueCommand !== null) {
        command = null;
      }
      if (nextPhase !== previousPhase) {
        phases.push(nextPhase);
      }
      if (previousPhase === "ramp" && nextPhase === "flight") {
        takeoffVelocity = { vx: state.vx, vy: state.vy };
      }
      if (previousPhase === "flight" && nextPhase === "slide") {
        firstContact = {
          x: state.x,
          y: state.y,
          airtime: state.airtime,
        };
      }

      accumulator -= FIXED_STEP;
    }

    if (state.phase === "resting") {
      break;
    }
  }

  if (takeoffVelocity === null || firstContact === null) {
    throw new Error("Trace did not complete launch and contact");
  }

  return { takeoffVelocity, firstContact, resting: state, phases };
}

describe("jump tracer", () => {
  it("creates an identical finite ramp state every time", () => {
    const first = createInitialJumpState(jumpConfig);
    const second = createInitialJumpState(jumpConfig);

    expect(first).toEqual(second);
    expect(first.phase).toBe("ramp");
    expect(Object.values(first).filter(Number.isFinite)).toHaveLength(7);

    const advanced = stepJump(first, null, FIXED_STEP, jumpConfig);
    expect(advanced.phase).toBe("ramp");
    expect(advanced.x).toBeGreaterThan(first.x);
    expect(advanced.speed).toBeGreaterThan(first.speed);
  });

  it("moves one timestamped press through flight, slide, and rest", () => {
    const result = trace(60, 1_650);

    expect(result.phases).toEqual(["ramp", "flight", "slide", "resting"]);
    expect(result.resting.phase).toBe("resting");
    expect(result.takeoffVelocity.vx).toBeGreaterThan(0);
    expect(result.takeoffVelocity.vy).toBeLessThan(0);
    expect(result.firstContact.airtime).toBeGreaterThan(0);
  });

  it("uses the shared weak launch when no command arrives", () => {
    const result = trace(60, null);

    expect(result.phases).toEqual(["ramp", "flight", "slide", "resting"]);
    expect(result.firstContact.airtime).toBeGreaterThan(0);
    expect(result.resting.phase).toBe("resting");
  });

  it.each([30, 60, 120, 144])(
    "is cadence-independent at %i Hz",
    (renderHz) => {
      const reference = trace(120, 1_650);
      const result = trace(renderHz, 1_650);

      expect(result.takeoffVelocity.vx).toBeCloseTo(
        reference.takeoffVelocity.vx,
        12,
      );
      expect(result.takeoffVelocity.vy).toBeCloseTo(
        reference.takeoffVelocity.vy,
        12,
      );
      expect(result.firstContact.x).toBeCloseTo(reference.firstContact.x, 12);
      expect(result.firstContact.y).toBeCloseTo(reference.firstContact.y, 12);
      expect(result.resting).toEqual(reference.resting);
    },
  );
});
