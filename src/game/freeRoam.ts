export type FreeRoamState = Readonly<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
}>;

export type FreeRoamConfig = Readonly<{
  gravity: number;
  jumpVy: number;
  jumpVx: number;
  crouchJumpVx: number;
  slideFriction: number;
  crouchSlideFriction: number;
  stopSpeed: number;
  margin: number;
  minX: number;
  maxX: number;
}>;

export type GroundSample = Readonly<{
  y: number;
  slope: number;
}>;

export const freeRoamDefaults = Object.freeze({
  gravity: 1400,
  jumpVy: -380,
  jumpVx: 300,
  crouchJumpVx: 380,
  slideFriction: 280,
  crouchSlideFriction: 140,
  stopSpeed: 12,
  margin: 36,
}) satisfies Omit<FreeRoamConfig, "minX" | "maxX">;

export function createFreeRoamState(
  x: number,
  y: number,
  facing: 1 | -1 = 1,
): FreeRoamState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    facing,
    grounded: true,
  };
}

export function setFreeRoamFacing(
  state: FreeRoamState,
  facing: 1 | -1,
): FreeRoamState {
  return { ...state, facing };
}

export function tryFreeRoamJump(
  state: FreeRoamState,
  config: Pick<FreeRoamConfig, "jumpVy" | "jumpVx" | "crouchJumpVx">,
  crouching = false,
): FreeRoamState {
  if (!state.grounded) {
    return state;
  }
  const jumpVx = crouching ? config.crouchJumpVx : config.jumpVx;
  return {
    ...state,
    grounded: false,
    vy: config.jumpVy,
    vx: state.facing * jumpVx,
  };
}

function applySlideFriction(
  vx: number,
  dt: number,
  friction: number,
  stopSpeed: number,
): number {
  if (Math.abs(vx) <= stopSpeed) {
    return 0;
  }
  const sign = Math.sign(vx);
  const next = vx - sign * friction * dt;
  return Math.sign(next) !== sign ? 0 : next;
}

export function stepFreeRoam(
  state: FreeRoamState,
  dt: number,
  config: FreeRoamConfig,
  groundAt: (x: number) => GroundSample,
  crouching = false,
): FreeRoamState {
  if (!Number.isFinite(dt) || dt <= 0) {
    return state;
  }

  let { x, y, vx, vy, facing, grounded } = state;
  const minX = config.minX + config.margin;
  const maxX = Math.max(minX, config.maxX - config.margin);
  const friction = crouching
    ? config.crouchSlideFriction
    : config.slideFriction;

  x += vx * dt;

  if (x < minX) {
    x = minX;
    vx = Math.abs(vx) * 0.35;
    facing = 1;
  } else if (x > maxX) {
    x = maxX;
    vx = -Math.abs(vx) * 0.35;
    facing = -1;
  }

  if (grounded) {
    // Stick to the surface so downhill runs do not pop airborne for a frame.
    const ground = groundAt(x);
    y = ground.y;
    vy = 0;
    vx = applySlideFriction(vx, dt, friction, config.stopSpeed);
    return { x, y, vx, vy, facing, grounded: true };
  }

  vy += config.gravity * dt;
  y += vy * dt;

  const ground = groundAt(x);
  if (y >= ground.y) {
    y = ground.y;
    vy = 0;
    grounded = true;
    vx = applySlideFriction(vx, dt, friction, config.stopSpeed);
  }

  return { x, y, vx, vy, facing, grounded };
}

export type FreeRoamPose = "ready" | "takeoff" | "flight";

export function poseForFreeRoam(
  state: FreeRoamState,
  stopSpeed = freeRoamDefaults.stopSpeed,
): FreeRoamPose {
  if (!state.grounded) {
    return state.vy < 0 ? "takeoff" : "flight";
  }
  // Match the scored jump: keep the flight pose while skimming the snow.
  if (Math.abs(state.vx) > stopSpeed) {
    return "flight";
  }
  return "ready";
}
