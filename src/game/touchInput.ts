export type TouchSwipeConfig = Readonly<{
  /** Minimum travel in px before a swipe counts. */
  swipePx: number;
  /** Vertical/horizontal must beat the other axis by this ratio. */
  dominantRatio: number;
}>;

export const touchSwipeDefaults = Object.freeze({
  swipePx: 28,
  dominantRatio: 1.1,
}) satisfies TouchSwipeConfig;

export type TouchGestureState = Readonly<{
  active: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  /** Sticky crouch after a downward swipe until the finger lifts. */
  crouchLatched: boolean;
  jumpEmitted: boolean;
  turnEmitted: 0 | 1 | -1;
}>;

export type TouchGestureUpdate = Readonly<{
  state: TouchGestureState;
  jump: boolean;
  turn: 0 | 1 | -1;
}>;

export type TouchGestureEnd = Readonly<{
  state: TouchGestureState;
  /** True when the contact barely moved — use for zone taps. */
  tap: boolean;
  tapX: number;
}>;

const idleGesture = Object.freeze({
  active: false,
  pointerId: -1,
  startX: 0,
  startY: 0,
  crouchLatched: false,
  jumpEmitted: false,
  turnEmitted: 0 as const,
}) satisfies TouchGestureState;

export function createIdleTouchGesture(): TouchGestureState {
  return idleGesture;
}

export function beginTouchGesture(
  pointerId: number,
  x: number,
  y: number,
): TouchGestureState {
  return {
    active: true,
    pointerId,
    startX: x,
    startY: y,
    crouchLatched: false,
    jumpEmitted: false,
    turnEmitted: 0,
  };
}

export function updateTouchGesture(
  state: TouchGestureState,
  x: number,
  y: number,
  config: TouchSwipeConfig = touchSwipeDefaults,
): TouchGestureUpdate {
  if (!state.active) {
    return { state, jump: false, turn: 0 };
  }

  const dx = x - state.startX;
  const dy = y - state.startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  let crouchLatched = state.crouchLatched;
  let jumpEmitted = state.jumpEmitted;
  let turnEmitted = state.turnEmitted;
  let jump = false;
  let turn: 0 | 1 | -1 = 0;

  const verticalDominates = absY >= absX * config.dominantRatio;
  const horizontalDominates = absX > absY * config.dominantRatio;

  if (!crouchLatched && verticalDominates && dy >= config.swipePx) {
    crouchLatched = true;
  }

  if (!jumpEmitted && verticalDominates && dy <= -config.swipePx) {
    jumpEmitted = true;
    jump = true;
  }

  if (turnEmitted === 0 && horizontalDominates && absX >= config.swipePx) {
    turn = dx > 0 ? 1 : -1;
    turnEmitted = turn;
  }

  return {
    state: {
      ...state,
      crouchLatched,
      jumpEmitted,
      turnEmitted,
    },
    jump,
    turn,
  };
}

export function endTouchGesture(
  state: TouchGestureState,
  x: number,
  y: number,
  config: TouchSwipeConfig = touchSwipeDefaults,
): TouchGestureEnd {
  if (!state.active) {
    return { state: idleGesture, tap: false, tapX: x };
  }

  const dx = x - state.startX;
  const dy = y - state.startY;
  const moved = Math.hypot(dx, dy);
  const tap =
    !state.jumpEmitted &&
    !state.crouchLatched &&
    state.turnEmitted === 0 &&
    moved < config.swipePx;

  return {
    state: idleGesture,
    tap,
    tapX: state.startX,
  };
}

export function isTouchCrouching(state: TouchGestureState): boolean {
  return state.active && state.crouchLatched;
}
