import { assertValidJumpConfig, type JumpConfig } from "./config";
import { launchFromQuality, takeoffQuality } from "./takeoff";
import { crossingFraction, sampleLanding, sampleRamp } from "./terrain";

export type JumpPhase = "ramp" | "flight" | "slide" | "resting";
export type PressCommand = { pressedAtMs: number } | null;

type MotionState = Readonly<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  elapsed: number;
  airtime: number;
}>;

export type RampState = MotionState & { phase: "ramp" };
export type FlightState = MotionState & { phase: "flight" };
export type SlideState = MotionState & { phase: "slide" };
export type RestingState = MotionState & { phase: "resting" };
export type JumpState = RampState | FlightState | SlideState | RestingState;

export function createInitialJumpState(config: JumpConfig): JumpState {
  assertValidJumpConfig(config);
  return {
    phase: "ramp",
    x: config.startX,
    y: config.startY,
    vx: 0,
    vy: 0,
    speed: config.initialSpeed,
    elapsed: 0,
    airtime: 0,
  };
}

export function stepJump(
  state: JumpState,
  command: PressCommand,
  dt: number,
  config: JumpConfig,
): JumpState {
  assertValidJumpConfig(config);
  if (!Number.isFinite(dt) || dt <= 0) {
    return state;
  }

  switch (state.phase) {
    case "ramp":
      return stepRamp(state, command, dt, config);
    case "flight":
      return stepFlight(state, dt, config);
    case "slide":
      return stepSlide(state, dt, config);
    case "resting":
      return state;
  }
}

function stepRamp(
  state: JumpState & { phase: "ramp" },
  command: PressCommand,
  dt: number,
  config: JumpConfig,
): JumpState {
  if (command !== null && Number.isFinite(command.pressedAtMs)) {
    return launchFromQuality(state, takeoffQuality(state.x, config), config);
  }

  const speed = state.speed + config.rampAcceleration * dt;
  const x = state.x + speed * dt;
  const ramp = sampleRamp(x, config);
  const tangentLength = Math.hypot(1, ramp.slope);
  const next: JumpState & { phase: "ramp" } = {
    ...state,
    x,
    y: ramp.y,
    speed,
    vx: speed / tangentLength,
    vy: (speed * ramp.slope) / tangentLength,
    elapsed: state.elapsed + dt,
  };

  if (x >= config.lateBoundaryX) {
    return launchFromQuality(next, config.minimumQuality, config);
  }

  return next;
}

function stepFlight(
  state: JumpState & { phase: "flight" },
  dt: number,
  config: JumpConfig,
): JumpState {
  const nextVy = state.vy + config.gravity * dt;
  const nextX = state.x + state.vx * dt;
  const nextY = state.y + state.vy * dt + 0.5 * config.gravity * dt * dt;
  const nextAirtime = state.airtime + dt;

  if (nextVy > 0) {
    const previousSurface = sampleLanding(state.x, config);
    const nextSurface = sampleLanding(nextX, config);
    const previousGap = state.y - previousSurface.y;
    const nextGap = nextY - nextSurface.y;

    if (previousGap <= 0 && nextGap >= 0) {
      const fraction = crossingFraction(previousGap, nextGap);
      const contactX = state.x + (nextX - state.x) * fraction;
      const contact = sampleLanding(contactX, config);
      const contactVy = state.vy + config.gravity * dt * fraction;
      const tangentLength = Math.hypot(1, contact.slope);
      const slideSpeed = Math.max(
        0,
        (state.vx + contactVy * contact.slope) / tangentLength,
      );

      return {
        phase: "slide",
        x: contactX,
        y: contact.y,
        vx: slideSpeed / tangentLength,
        vy: (slideSpeed * contact.slope) / tangentLength,
        speed: slideSpeed,
        elapsed: state.elapsed + dt * fraction,
        airtime: state.airtime + dt * fraction,
      };
    }
  }

  return {
    ...state,
    x: nextX,
    y: nextY,
    vy: nextVy,
    elapsed: state.elapsed + dt,
    airtime: nextAirtime,
  };
}

function stepSlide(
  state: JumpState & { phase: "slide" },
  dt: number,
  config: JumpConfig,
): JumpState {
  const speed = Math.max(0, state.speed - config.slideDeceleration * dt);
  const averageSpeed = (state.speed + speed) / 2;
  const surface = sampleLanding(state.x, config);
  const tangentLength = Math.hypot(1, surface.slope);
  const x = state.x + (averageSpeed / tangentLength) * dt;
  const nextSurface = sampleLanding(x, config);
  const resting = speed <= config.stopSpeed;

  return {
    phase: resting ? "resting" : "slide",
    x,
    y: nextSurface.y,
    vx: resting ? 0 : speed / tangentLength,
    vy: resting ? 0 : (speed * nextSurface.slope) / tangentLength,
    speed: resting ? 0 : speed,
    elapsed: state.elapsed + dt,
    airtime: state.airtime,
  };
}
