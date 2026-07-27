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
import { canConsumePress } from "./takeoffWindow";
import { sampleLanding, sampleRamp } from "./terrain";

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
  ["ideal", 1_800],
  ["late", 2_000],
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

      const dueCommand = canConsumePress(state, jumpConfig.takeoffStartX)
        ? latch.consumeThrough(simulationTimeMs)
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
      if (
        previousPhase === "flight" &&
        (nextPhase === "slide" || nextPhase === "crashed")
      ) {
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
      if (nextPhase === "crashed") {
        latch.seal();
      }

      accumulator -= FIXED_STEP;
    }

    if (
      state.phase === "resting" ||
      (state.phase === "crashed" && state.speed === 0)
    ) {
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
    expect(Object.values(first).filter(Number.isFinite)).toHaveLength(8);

    const waiting = stepJump(first, null, FIXED_STEP, jumpConfig);
    expect(waiting).toEqual(first);

    const hopping = stepJump(first, { pressedAtMs: 0 }, FIXED_STEP, jumpConfig);
    expect(hopping.phase).toBe("drop");
    expect(hopping.vx).toBe(jumpConfig.startHopVx);
    expect(hopping.vy).toBe(jumpConfig.startHopVy);
  });

  it("carries hop speed onto the ramp without slowing down", () => {
    let state = createInitialJumpState(jumpConfig);
    state = stepJump(state, { pressedAtMs: 0 }, FIXED_STEP, jumpConfig);
    expect(state.phase).toBe("drop");

    const hopSpeed = state.vx;
    for (let step = 0; step < 240 && state.phase === "drop"; step += 1) {
      state = stepJump(state, null, FIXED_STEP, jumpConfig);
    }

    expect(state.phase).toBe("ramp");
    expect(state.speed).toBeGreaterThanOrEqual(hopSpeed);
  });

  it("moves one start press and one takeoff press through the full jump", () => {
    const result = trace(60, 1_800);

    expect(result.phases[0]).toBe("ready");
    expect(result.phases).toContain("flight");
    expect(["slide", "crashed"]).toContain(result.phases.at(-2) ?? "");
    expect(["resting", "crashed"]).toContain(result.resting.phase);
    expect(result.takeoffVelocity.vx).toBeGreaterThan(0);
    expect(result.takeoffVelocity.vy).toBeLessThan(0);
    expect(result.firstContact.airtime).toBeGreaterThan(0);
  });

  it("freezes jump distance at landing instead of counting the slide", () => {
    const result = trace(60, 1_800);

    expect(result.firstContact.x - jumpConfig.lipX).toBeCloseTo(
      result.resting.distance,
      8,
    );
    expect(result.resting.airtime).toBe(result.firstContact.airtime);
    if (result.resting.phase === "resting") {
      expect(result.resting.distance).toBeLessThan(
        result.resting.x - jumpConfig.lipX,
      );
    }
  });

  it("stops on the uphill runout instead of sliding forever", () => {
    const result = trace(60, 1_800);

    expect(["resting", "crashed"]).toContain(result.resting.phase);
    expect(result.resting.speed).toBe(0);
    expect(result.resting.x).toBeLessThan(jumpConfig.landingRunoutEndX + 200);
  });

  it("accelerates faster down the ramp while crouching", () => {
    const initial = {
      ...createInitialJumpState(jumpConfig),
      phase: "ramp",
      x: jumpConfig.startX,
      y: jumpConfig.startY,
      speed: jumpConfig.initialSpeed,
      distance: 0,
    } as RampState;

    const upright = stepJump(initial, null, FIXED_STEP, jumpConfig, false);
    const crouched = stepJump(initial, null, FIXED_STEP, jumpConfig, true);

    expect(upright.phase).toBe("ramp");
    expect(crouched.phase).toBe("ramp");
    expect(crouched.speed).toBeGreaterThan(upright.speed);
    expect(crouched.x).toBeGreaterThan(upright.x);
    expect(crouched.speed - upright.speed).toBeCloseTo(
      (jumpConfig.crouchRampAcceleration - jumpConfig.rampAcceleration) *
        FIXED_STEP,
      8,
    );
  });

  it("gains speed on the landing hill while crouching", () => {
    const initial = {
      ...createInitialJumpState(jumpConfig),
      phase: "slide" as const,
      x: jumpConfig.landingCrestX + 80,
      y: jumpConfig.landingCrestY + 40,
      vx: 120,
      vy: 20,
      speed: 140,
      elapsed: 2,
      airtime: 1.1,
      distance: 12,
    };

    const upright = stepJump(initial, null, FIXED_STEP, jumpConfig, false);
    const crouched = stepJump(initial, null, FIXED_STEP, jumpConfig, true);

    expect(upright.phase).toBe("slide");
    expect(crouched.phase).toBe("slide");
    expect(crouched.speed).toBeGreaterThan(upright.speed);
    expect(crouched.speed).toBeGreaterThan(initial.speed);
  });

  it("ends the climb when squeezing on ascent, and glides only after the peak", () => {
    const climbing = {
      ...createInitialJumpState(jumpConfig),
      phase: "flight",
      x: jumpConfig.lipX + 40,
      y: jumpConfig.lipY - 80,
      vx: 700,
      vy: -200,
      speed: 0,
      elapsed: 1,
      airtime: 0.2,
      distance: 40,
    } as FlightState;

    const openClimb = stepJump(climbing, null, FIXED_STEP, jumpConfig, false);
    const tuckedClimb = stepJump(climbing, null, FIXED_STEP, jumpConfig, true);
    expect(openClimb.phase).toBe("flight");
    expect(tuckedClimb.phase).toBe("flight");
    expect(tuckedClimb.vy - climbing.vy).toBeCloseTo(
      jumpConfig.gravity * jumpConfig.flightCrouchAscentGravityScale * FIXED_STEP,
      8,
    );
    expect(tuckedClimb.vy).toBeGreaterThan(openClimb.vy);
    expect(tuckedClimb.y).toBeGreaterThan(openClimb.y);

    const falling = { ...climbing, vy: 200 } as FlightState;
    const openFall = stepJump(falling, null, FIXED_STEP, jumpConfig, false);
    const tuckedFall = stepJump(falling, null, FIXED_STEP, jumpConfig, true);
    expect(tuckedFall.vy - falling.vy).toBeCloseTo(
      jumpConfig.gravity * jumpConfig.flightCrouchGravityScale * FIXED_STEP,
      8,
    );
    expect(Math.abs(tuckedFall.vy - falling.vy)).toBeLessThan(
      Math.abs(openFall.vy - falling.vy),
    );
    expect(tuckedFall.y).toBeLessThan(openFall.y);
  });

  it("launches from the lip while crouching instead of parking there", () => {
    const initial = {
      ...createInitialJumpState(jumpConfig),
      phase: "ramp",
      x: jumpConfig.lateBoundaryX - 1,
      y: sampleRamp(jumpConfig.lateBoundaryX - 1, jumpConfig).y,
      speed: 400,
      distance: 0,
    } as RampState;

    const crouched = stepJump(initial, null, FIXED_STEP, jumpConfig, true);
    expect(crouched.phase).toBe("flight");
    expect(crouched.vx).toBeGreaterThan(0);
    expect(crouched.vy).toBeLessThan(0);

    const missed = stepJump(initial, null, FIXED_STEP, jumpConfig, false);
    expect(missed.phase).toBe("flight");
    expect(missed.vx).toBeLessThan(crouched.vx);
  });

  it("ignores takeoff presses before the takeoff zone", () => {
    const initial = {
      ...createInitialJumpState(jumpConfig),
      phase: "ramp",
      x: jumpConfig.startX,
      y: jumpConfig.startY,
      speed: jumpConfig.initialSpeed,
      distance: 0,
    } as RampState;
    const stillSliding = stepJump(
      initial,
      { pressedAtMs: 0 },
      FIXED_STEP,
      jumpConfig,
    );

    expect(stillSliding.phase).toBe("ramp");
    expect(stillSliding.x).toBeGreaterThan(initial.x);
  });

  it("accepts a takeoff press once inside the takeoff zone", () => {
    const initial = {
      ...createInitialJumpState(jumpConfig),
      phase: "ramp",
      x: jumpConfig.takeoffStartX,
      y: sampleRamp(jumpConfig.takeoffStartX, jumpConfig).y,
      speed: jumpConfig.initialSpeed,
      distance: 0,
    } as RampState;
    const launched = stepJump(
      initial,
      { pressedAtMs: 0 },
      FIXED_STEP,
      jumpConfig,
    ) as FlightState;

    expect(launched.phase).toBe("flight");
    expect(launched).toEqual(
      launchFromQuality(
        initial,
        takeoffQuality(initial.x, jumpConfig),
        jumpConfig,
      ),
    );
  });

  it("uses the shared weak launch when no takeoff command arrives", () => {
    const result = trace(60, null);

    expect(result.phases).toContain("flight");
    expect(result.firstContact.airtime).toBeGreaterThan(0);
    expect(["resting", "crashed"]).toContain(result.resting.phase);
  });

  it("crashes when hitting the landing hill before the crest", () => {
    const x = (jumpConfig.landingStartX + jumpConfig.landingCrestX) / 2;
    const surface = sampleLanding(x, jumpConfig);
    const state: FlightState = {
      phase: "flight",
      x,
      y: surface.y - 1,
      vx: 200,
      vy: 200,
      speed: 0,
      elapsed: 1,
      airtime: 0.4,
      distance: Math.max(0, x - jumpConfig.lipX),
    };

    const crashed = stepJump(state, null, FIXED_STEP, jumpConfig);
    expect(crashed.phase).toBe("crashed");
    expect(crashed.x).toBeLessThan(jumpConfig.landingCrestX);
    expect(crashed.y).toBe(sampleLanding(crashed.x, jumpConfig).y);
  });

  it("does not tunnel through the knoll on a long flight step", () => {
    const startX = jumpConfig.landingCrestX - 200;
    const endX = jumpConfig.landingCrestX + 200;
    const startSurface = sampleLanding(startX, jumpConfig);
    const state: FlightState = {
      phase: "flight",
      x: startX,
      y: startSurface.y - 8,
      vx: (endX - startX) / FIXED_STEP,
      vy: 0,
      speed: 0,
      elapsed: 1,
      airtime: 0.5,
      distance: Math.max(0, startX - jumpConfig.lipX),
    };

    const next = stepJump(state, null, FIXED_STEP, jumpConfig);
    expect(["slide", "crashed"]).toContain(next.phase);
    expect(next.x).toBeLessThan(endX);
    expect(next.y).toBeCloseTo(sampleLanding(next.x, jumpConfig).y, 8);
  });

  it.each(launchCases)("%s input reaches rest without another command", (_, at) => {
    const result = trace(60, at);

    expect(["resting", "crashed"]).toContain(result.resting.phase);
    if (result.resting.phase === "resting") {
      expect(result.phases).toEqual([
        "ready",
        "drop",
        "ramp",
        "flight",
        "slide",
        "resting",
      ]);
      expect(result.restingTransitions).toBe(1);
    } else {
      expect(result.phases).toEqual([
        "ready",
        "drop",
        "ramp",
        "flight",
        "crashed",
      ]);
      expect(result.resting.speed).toBe(0);
    }
    expect(result.slideSpeeds.every((speed) => speed >= 0)).toBe(true);
  });

  it("keeps presentation settings outside simulation outcomes", () => {
    const compact = trace(60, 1_800, {
      viewport: { width: 640, height: 360 },
      cameraLead: 200,
    });
    const wide = trace(60, 1_800, {
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
      expect(result.resting.phase).toBe(reference.resting.phase);
      expect(result.resting.x).toBeCloseTo(reference.resting.x, 8);
      expect(result.resting.y).toBeCloseTo(reference.resting.y, 8);
      expect(result.resting.distance).toBeCloseTo(reference.resting.distance, 8);
      expect(result.resting.airtime).toBeCloseTo(reference.resting.airtime, 8);
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
        expect(result.resting.phase).toBe(reference.resting.phase);
        expect(result.resting.x).toBeCloseTo(reference.resting.x, 6);
        expect(result.resting.y).toBeCloseTo(reference.resting.y, 6);
        expect(result.resting.distance).toBeCloseTo(
          reference.resting.distance,
          6,
        );
        expect(result.resting.airtime).toBeCloseTo(reference.resting.airtime, 6);
      }
    },
  );
});
