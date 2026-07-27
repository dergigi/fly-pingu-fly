import { assertValidJumpConfig, type JumpConfig } from "./config";
import { launchFromQuality, takeoffQuality } from "./takeoff";
import { crossingFraction, sampleLanding, sampleRamp } from "./terrain";

export type JumpPhase =
  | "ready"
  | "drop"
  | "ramp"
  | "flight"
  | "slide"
  | "crashed"
  | "resting";
export type PressCommand = { pressedAtMs: number } | null;

type MotionState = Readonly<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  elapsed: number;
  airtime: number;
  distance: number;
}>;

export type ReadyState = MotionState & { phase: "ready" };
export type DropState = MotionState & { phase: "drop" };
export type RampState = MotionState & { phase: "ramp" };
export type FlightState = MotionState & { phase: "flight" };
export type SlideState = MotionState & { phase: "slide" };
export type CrashedState = MotionState & { phase: "crashed" };
export type RestingState = MotionState & { phase: "resting" };
export type JumpState =
  | ReadyState
  | DropState
  | RampState
  | FlightState
  | SlideState
  | CrashedState
  | RestingState;

const FLIGHT_CONTACT_STEP = 6;
const CRASH_DECELERATION = 420;

export function createInitialJumpState(config: JumpConfig): JumpState {
  assertValidJumpConfig(config);
  return {
    phase: "ready",
    x: config.readyX,
    y: config.readyY,
    vx: 0,
    vy: 0,
    speed: 0,
    elapsed: 0,
    airtime: 0,
    distance: 0,
  };
}

export function stepJump(
  state: JumpState,
  command: PressCommand,
  dt: number,
  config: JumpConfig,
  crouching = false,
): JumpState {
  assertValidJumpConfig(config);
  if (!Number.isFinite(dt) || dt <= 0) {
    return state;
  }

  switch (state.phase) {
    case "ready":
      return stepReady(state, command, config);
    case "drop":
      return stepDrop(state, dt, config);
    case "ramp":
      return stepRamp(state, command, dt, config, crouching);
    case "flight":
      return stepFlight(state, dt, config, crouching);
    case "slide":
      return stepSlide(state, dt, config);
    case "crashed":
      return stepCrashed(state, dt, config);
    case "resting":
      return state;
  }
}

function stepReady(
  state: ReadyState,
  command: PressCommand,
  config: JumpConfig,
): JumpState {
  if (command === null || !Number.isFinite(command.pressedAtMs)) {
    return state;
  }

  return {
    ...state,
    phase: "drop",
    vx: config.startHopVx,
    vy: config.startHopVy,
    speed: 0,
  };
}

function stepDrop(
  state: DropState,
  dt: number,
  config: JumpConfig,
): JumpState {
  const nextVy = state.vy + config.gravity * dt;
  const nextX = state.x + state.vx * dt;
  const nextY = state.y + state.vy * dt + 0.5 * config.gravity * dt * dt;

  if (nextVy > 0 && nextX >= config.startX && nextX <= config.lipX) {
    const previousSurface = sampleRamp(state.x, config);
    const nextSurface = sampleRamp(nextX, config);
    const previousGap = state.y - previousSurface.y;
    const nextGap = nextY - nextSurface.y;

    if (previousGap <= 0 && nextGap >= 0) {
      const fraction = crossingFraction(previousGap, nextGap);
      const contactX = state.x + (nextX - state.x) * fraction;
      const contact = sampleRamp(contactX, config);
      const tangentLength = Math.hypot(1, contact.slope);
      const rampSpeed = Math.max(config.initialSpeed, state.vx);

      return {
        phase: "ramp",
        x: contactX,
        y: contact.y,
        vx: rampSpeed / tangentLength,
        vy: (rampSpeed * contact.slope) / tangentLength,
        speed: rampSpeed,
        elapsed: state.elapsed + dt * fraction,
        airtime: 0,
        distance: 0,
      };
    }
  }

  return {
    ...state,
    x: nextX,
    y: nextY,
    vy: nextVy,
    elapsed: state.elapsed + dt,
  };
}

function stepRamp(
  state: JumpState & { phase: "ramp" },
  command: PressCommand,
  dt: number,
  config: JumpConfig,
  crouching: boolean,
): JumpState {
  if (
    command !== null &&
    Number.isFinite(command.pressedAtMs) &&
    state.x >= config.takeoffStartX
  ) {
    return launchFromQuality(state, takeoffQuality(state.x, config), config);
  }

  const acceleration = crouching
    ? config.crouchRampAcceleration
    : config.rampAcceleration;
  const speed = state.speed + acceleration * dt;
  const x = Math.min(state.x + speed * dt, config.lateBoundaryX);
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

  if (
    command !== null &&
    Number.isFinite(command.pressedAtMs) &&
    next.x >= config.takeoffStartX
  ) {
    return launchFromQuality(next, takeoffQuality(next.x, config), config);
  }

  if (x >= config.lateBoundaryX) {
    if (crouching) {
      const lip = sampleRamp(config.lateBoundaryX, config);
      const lipTangent = Math.hypot(1, lip.slope);
      return {
        ...next,
        x: config.lateBoundaryX,
        y: lip.y,
        vx: speed / lipTangent,
        vy: (speed * lip.slope) / lipTangent,
      };
    }
    return launchFromQuality(next, config.minimumQuality, config);
  }

  return next;
}

function stepFlight(
  state: JumpState & { phase: "flight" },
  dt: number,
  config: JumpConfig,
  crouching: boolean,
): JumpState {
  const gravity = crouching
    ? config.gravity * config.flightCrouchGravityScale
    : config.gravity;
  const nextVy = state.vy + gravity * dt;
  const nextX = state.x + state.vx * dt;
  const nextY = state.y + state.vy * dt + 0.5 * gravity * dt * dt;
  const contact = findLandingContact(state, nextX, nextY, dt, config, gravity);
  if (contact !== null) {
    return contact;
  }

  return {
    ...state,
    x: nextX,
    y: nextY,
    vy: nextVy,
    elapsed: state.elapsed + dt,
    airtime: state.airtime + dt,
    distance: Math.max(0, nextX - config.lipX),
  };
}

function findLandingContact(
  state: FlightState,
  nextX: number,
  nextY: number,
  dt: number,
  config: JumpConfig,
  gravity: number,
): JumpState | null {
  const travel = Math.hypot(nextX - state.x, nextY - state.y);
  const samples = Math.max(1, Math.ceil(travel / FLIGHT_CONTACT_STEP));
  let previousGap = state.y - sampleLanding(state.x, config).y;

  if (previousGap > 0) {
    return settleOnLanding(state, state.x, 0, dt, config, gravity);
  }

  for (let index = 1; index <= samples; index += 1) {
    const endT = index / samples;
    const x = state.x + (nextX - state.x) * endT;
    const y = state.y + (nextY - state.y) * endT;
    const gap = y - sampleLanding(x, config).y;

    if (previousGap <= 0 && gap >= 0) {
      const startT = (index - 1) / samples;
      const local = crossingFraction(previousGap, gap);
      const fraction = startT + (endT - startT) * local;
      const contactX = state.x + (nextX - state.x) * fraction;
      return settleOnLanding(state, contactX, fraction, dt, config, gravity);
    }

    previousGap = gap;
  }

  return null;
}

function settleOnLanding(
  state: FlightState,
  contactX: number,
  fraction: number,
  dt: number,
  config: JumpConfig,
  gravity: number,
): JumpState {
  const contact = sampleLanding(contactX, config);
  const contactVy = state.vy + gravity * dt * fraction;
  const tangentLength = Math.hypot(1, contact.slope);
  const alongTrack = (state.vx + contactVy * contact.slope) / tangentLength;
  const distance = Math.max(0, contactX - config.lipX);
  const airtime = state.airtime + dt * fraction;
  const elapsed = state.elapsed + dt * fraction;

  if (contactX < config.landingCrestX) {
    const crashSpeed = Math.max(0, Math.min(220, Math.abs(alongTrack) * 0.45));
    return {
      phase: "crashed",
      x: contactX,
      y: contact.y,
      vx: crashSpeed / tangentLength,
      vy: (crashSpeed * contact.slope) / tangentLength,
      speed: crashSpeed,
      elapsed,
      airtime,
      distance,
    };
  }

  const slideSpeed = Math.max(0, alongTrack);
  return {
    phase: "slide",
    x: contactX,
    y: contact.y,
    vx: slideSpeed / tangentLength,
    vy: (slideSpeed * contact.slope) / tangentLength,
    speed: slideSpeed,
    elapsed,
    airtime,
    distance,
  };
}

function stepSlide(
  state: JumpState & { phase: "slide" },
  dt: number,
  config: JumpConfig,
): JumpState {
  const surface = sampleLanding(state.x, config);
  const tangentLength = Math.hypot(1, surface.slope);
  const slopeAcceleration =
    (config.gravity * surface.slope) / tangentLength;
  const speed = Math.max(
    0,
    state.speed + (slopeAcceleration - config.slideDeceleration) * dt,
  );
  const averageSpeed = (state.speed + speed) / 2;
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
    distance: state.distance,
  };
}

function stepCrashed(
  state: CrashedState,
  dt: number,
  config: JumpConfig,
): JumpState {
  const surface = sampleLanding(state.x, config);
  const tangentLength = Math.hypot(1, surface.slope);
  const speed = Math.max(0, state.speed - CRASH_DECELERATION * dt);
  const averageSpeed = (state.speed + speed) / 2;
  const x = state.x + (averageSpeed / tangentLength) * dt;
  const nextSurface = sampleLanding(x, config);

  return {
    phase: "crashed",
    x,
    y: nextSurface.y,
    vx: speed <= config.stopSpeed ? 0 : speed / tangentLength,
    vy:
      speed <= config.stopSpeed ? 0 : (speed * nextSurface.slope) / tangentLength,
    speed: speed <= config.stopSpeed ? 0 : speed,
    elapsed: state.elapsed + dt,
    airtime: state.airtime,
    distance: state.distance,
  };
}
