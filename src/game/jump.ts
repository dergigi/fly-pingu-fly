import type { JumpConfig } from "./config";

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

export type JumpState =
  | (MotionState & { phase: "ramp" })
  | (MotionState & { phase: "flight" })
  | (MotionState & { phase: "slide" })
  | (MotionState & { phase: "resting" });

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

function rampY(x: number, config: JumpConfig): number {
  return config.startY + (x - config.startX) * config.rampSlope;
}

function landingY(x: number, config: JumpConfig): number {
  return (
    config.landingY +
    Math.max(0, x - config.landingStartX) * config.landingSlope
  );
}

function takeoffQuality(x: number, config: JumpConfig): number {
  const span = x <= config.lipX ? config.earlySpan : config.lateSpan;
  const normalized = clamp01(Math.abs(x - config.lipX) / span);
  const smoothstep = normalized * normalized * (3 - 2 * normalized);

  return (
    config.minimumQuality +
    (1 - config.minimumQuality) * (1 - smoothstep)
  );
}

function launch(
  state: JumpState & { phase: "ramp" },
  quality: number,
  config: JumpConfig,
): JumpState {
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

export function createInitialJumpState(config: JumpConfig): JumpState {
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
    return launch(state, takeoffQuality(state.x, config), config);
  }

  const speed = state.speed + config.rampAcceleration * dt;
  const x = state.x + speed * dt;
  const next: JumpState & { phase: "ramp" } = {
    ...state,
    x,
    y: rampY(x, config),
    speed,
    vx: speed / Math.hypot(1, config.rampSlope),
    vy: (speed * config.rampSlope) / Math.hypot(1, config.rampSlope),
    elapsed: state.elapsed + dt,
  };

  if (x >= config.lateBoundaryX) {
    return launch(next, config.minimumQuality, config);
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
    const previousGap = state.y - landingY(state.x, config);
    const nextGap = nextY - landingY(nextX, config);

    if (previousGap <= 0 && nextGap >= 0) {
      const denominator = nextGap - previousGap;
      const fraction =
        denominator === 0 ? 0 : clamp01(-previousGap / denominator);
      const contactX = state.x + (nextX - state.x) * fraction;
      const contactY = landingY(contactX, config);
      const contactVy = state.vy + config.gravity * dt * fraction;
      const tangentLength = Math.hypot(1, config.landingSlope);
      const slideSpeed = Math.max(
        0,
        (state.vx + contactVy * config.landingSlope) / tangentLength,
      );

      return {
        phase: "slide",
        x: contactX,
        y: contactY,
        vx: slideSpeed / tangentLength,
        vy: (slideSpeed * config.landingSlope) / tangentLength,
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
  const tangentLength = Math.hypot(1, config.landingSlope);
  const x = state.x + (averageSpeed / tangentLength) * dt;
  const resting = speed <= config.stopSpeed;

  return {
    phase: resting ? "resting" : "slide",
    x,
    y: landingY(x, config),
    vx: resting ? 0 : speed / tangentLength,
    vy: resting ? 0 : (speed * config.landingSlope) / tangentLength,
    speed: resting ? 0 : speed,
    elapsed: state.elapsed + dt,
    airtime: state.airtime,
  };
}
