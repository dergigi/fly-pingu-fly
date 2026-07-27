import { describe, expect, it } from "vitest";

import { FIXED_STEP, jumpConfig } from "./config";
import {
  createInitialJumpState,
  stepJump,
  type FlightState,
  type RampState,
  type JumpState,
} from "./jump";
import { InputLatch } from "./inputLatch";
import { launchFromQuality, takeoffQuality } from "./takeoff";

type PresentationVariant = {
  viewport: { width: number; height: number };
  cameraLead: number;
};

type TraceResult = {
  takeoffVelocity: { vx: number; vy: number };
  firstContact: { x: number; y: number; airtime: number };
  resting: JumpState;
  phases: JumpState["phase"][];
  slideSpeeds: number[];
  restingTransitions: number;
};

const launchCases = [
  ["early", 200],
  ["ideal", 2_200],
  ["late", 2_800],
  ["no-input", null],
] as const;

function trace(
  renderHz: number,
  takeoffDelayMs: number | null,
  _presentation?: PresentationVariant,
): TraceResult {
  let state = createInitialJumpState(jumpConfig);
  let accumulator = 0;
  let simulationTimeMs = 0;
  const latch = new InputLatch();
  latch.tryQueuePress(0);
  let rampEnteredAtMs: number | null = null;
  let takeoffQueued = false;
  let takeoffVelocity: TraceResult["takeoffVelocity"] | null = null;
  let firstContact: TraceResult["firstContact"] | null = null;
  const phases: JumpState["phase"][] = [state.phase];
  const slideSpeeds: number[] = [];
  let restingTransitions = 0;

  for (let frame = 0; frame < renderHz * 40; frame += 1) {
    accumulator += 1 / renderHz;

    while (accumulator + Number.EPSILON >= FIXED_STEP) {
      simulationTimeMs += FIXED_STEP * 1000;
      if (
        rampEnteredAtMs !== null &&
        takeoffDelayMs !== null &&
        !takeoffQueued &&
        simulationTimeMs >= rampEnteredAtMs + takeoffDelayMs
      ) {
        latch.tryQueuePress(simulationTimeMs);
        takeoffQueued = true;
      }

      const dueCommand = latch.consumeThrough(simulationTimeMs);
      const previousPhase = state.phase;
      const nextState: JumpState = stepJump(
        state,
        dueCommand,
        FIXED_STEP,
        jumpConfig,
      );
      const nextPhase: JumpState["phase"] = nextState.phase;
      state = nextState;

      if (nextPhase !== previousPhase) {
        phases.push(nextPhase);
      }
      if (previousPhase !== "ramp" && nextPhase === "ramp") {
        rampEnteredAtMs = simulationTimeMs;
      }
      if (previousPhase === "ramp" && nextPhase === "flight") {
        takeoffVelocity = { vx: state.vx, vy: state.vy };
        latch.seal();
      }
      if (previousPhase === "flight" && nextPhase === "slide") {
        firstContact = {
          x: state.x,
          y: state.y,
          airtime: state.airtime,
        };
      }
      if (nextPhase === "slide") {
        slideSpeeds.push(state.speed);
      }
      if (previousPhase === "slide" && nextPhase === "resting") {
        restingTransitions += 1;
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

  return {
    takeoffVelocity,
    firstContact,
    resting: state,
    phases,
    slideSpeeds,
    restingTransitions,
  };
}

describe("jump tracer", () => {
  it("starts ready on the log until the first press", () => {
    const first = createInitialJumpState(jumpConfig);
    const second = createInitialJumpState(jumpConfig);

    expect(first).toEqual(second);
    expect(first.phase).toBe("ready");
    expect(first.x).toBe(jumpConfig.readyX);
    expect(first.y).toBe(jumpConfig.readyY);
    expect(Object.values(first).filter(Number.isFinite)).toHaveLength(7);

    const waiting = stepJump(first, null, FIXED_STEP, jumpConfig);
    expect(waiting).toEqual(first);

    const hopping = stepJump(first, { pressedAtMs: 0 }, FIXED_STEP, jumpConfig);
    expect(hopping.phase).toBe("drop");
    expect(hopping.vx).toBe(jumpConfig.startHopVx);
    expect(hopping.vy).toBe(jumpConfig.startHopVy);
  });

  it("moves one start press and one takeoff press through the full jump", () => {
    const result = trace(60, 1_200);

    expect(result.phases).toEqual([
      "ready",
      "drop",
      "ramp",
      "flight",
      "slide",
      "resting",
    ]);
    expect(result.resting.phase).toBe("resting");
    expect(result.takeoffVelocity.vx).toBeGreaterThan(0);
    expect(result.takeoffVelocity.vy).toBeLessThan(0);
    expect(result.firstContact.airtime).toBeGreaterThan(0);
  });

  it("accepts an early press immediately at minimum quality", () => {
    const initial = {
      ...createInitialJumpState(jumpConfig),
      phase: "ramp",
      x: jumpConfig.startX,
      y: jumpConfig.startY,
      speed: jumpConfig.initialSpeed,
    } as RampState;
    const launched = stepJump(
      initial,
      { pressedAtMs: 0 },
      FIXED_STEP,
      jumpConfig,
    ) as FlightState;

    expect(launched.phase).toBe("flight");
    expect(takeoffQuality(initial.x, jumpConfig)).toBe(
      jumpConfig.minimumQuality,
    );
    expect(launched).toEqual(
      launchFromQuality(initial, jumpConfig.minimumQuality, jumpConfig),
    );
  });

  it("uses the shared weak launch when no takeoff command arrives", () => {
    const result = trace(60, null);

    expect(result.phases).toEqual([
      "ready",
      "drop",
      "ramp",
      "flight",
      "slide",
      "resting",
    ]);
    expect(result.firstContact.airtime).toBeGreaterThan(0);
    expect(result.resting.phase).toBe("resting");
  });

  it.each(launchCases)("%s input reaches rest without another command", (_, at) => {
    const result = trace(60, at);

    expect(result.phases).toEqual([
      "ready",
      "drop",
      "ramp",
      "flight",
      "slide",
      "resting",
    ]);
    expect(result.resting.phase).toBe("resting");
    expect(result.restingTransitions).toBe(1);
    expect(result.slideSpeeds.every((speed) => speed >= 0)).toBe(true);
    for (let index = 1; index < result.slideSpeeds.length; index += 1) {
      expect(result.slideSpeeds[index]!).toBeLessThanOrEqual(
        result.slideSpeeds[index - 1]!,
      );
    }
  });

  it("keeps presentation settings outside simulation outcomes", () => {
    const compact = trace(60, 2_200, {
      viewport: { width: 640, height: 360 },
      cameraLead: 200,
    });
    const wide = trace(60, 2_200, {
      viewport: { width: 1920, height: 1080 },
      cameraLead: 600,
    });

    expect(wide).toEqual(compact);
    expect("viewport" in jumpConfig).toBe(false);
    expect("cameraLead" in jumpConfig).toBe(false);
  });

  it("rejects malformed config before simulation starts", () => {
    expect(() =>
      createInitialJumpState({ ...jumpConfig, gravity: Number.NaN }),
    ).toThrow(RangeError);
    expect(() =>
      stepJump(
        createInitialJumpState(jumpConfig),
        null,
        FIXED_STEP,
        { ...jumpConfig, earlySpan: 0 },
      ),
    ).toThrow(RangeError);
  });

  it.each([30, 60, 120, 144])(
    "is cadence-independent at %i Hz",
    (renderHz) => {
      const reference = trace(120, 1_200);
      const result = trace(renderHz, 1_200);

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

  it.each(launchCases)(
    "keeps %s input equal across every render schedule",
    (_, at) => {
      const reference = trace(120, at);
      for (const renderHz of [30, 60, 120, 144]) {
        const result = trace(renderHz, at);
        expect(result.takeoffVelocity.vx).toBeCloseTo(
          reference.takeoffVelocity.vx,
          9,
        );
        expect(result.takeoffVelocity.vy).toBeCloseTo(
          reference.takeoffVelocity.vy,
          9,
        );
        expect(result.firstContact.x).toBeCloseTo(reference.firstContact.x, 9);
        expect(result.firstContact.y).toBeCloseTo(reference.firstContact.y, 9);
        expect(result.firstContact.airtime).toBeCloseTo(
          reference.firstContact.airtime,
          9,
        );
        expect(result.resting).toEqual(reference.resting);
      }
    },
  );
});
