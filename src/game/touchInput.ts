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
  /** Last point where a swipe was recognized (or the press origin). */
  lastX: number;
  lastY: number;
  /** Current crouch while the finger is still down. */
  crouching: boolean;
  /** After a jump swipe, require a down swipe before jumping again. */
  canJump: boolean;
  /** Any swipe recognized this contact (blocks tap-on-release). */
  swiped: boolean;
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
  lastX: 0,
  lastY: 0,
  crouching: false,
  canJump: true,
  swiped: false,
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
    lastX: x,
    lastY: y,
    crouching: false,
    canJump: true,
    swiped: false,
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

  const dx = x - state.lastX;
  const dy = y - state.lastY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const verticalDominates = absY >= absX * config.dominantRatio;
  const horizontalDominates = absX > absY * config.dominantRatio;

  let crouching = state.crouching;
  let canJump = state.canJump;
  let swiped = state.swiped;
  let turnEmitted = state.turnEmitted;
  let lastX = state.lastX;
  let lastY = state.lastY;
  let jump = false;
  let turn: 0 | 1 | -1 = 0;

  if (verticalDominates && dy >= config.swipePx) {
    // Swipe down: crouch, and re-arm jump for a later up swipe.
    crouching = true;
    canJump = true;
    swiped = true;
    lastX = x;
    lastY = y;
  } else if (verticalDominates && dy <= -config.swipePx) {
    // Swipe up: stand up and jump (while still holding).
    crouching = false;
    swiped = true;
    if (canJump) {
      jump = true;
      canJump = false;
    }
    lastX = x;
    lastY = y;
  } else if (horizontalDominates && absX >= config.swipePx) {
    turn = dx > 0 ? 1 : -1;
    turnEmitted = turn;
    swiped = true;
    lastX = x;
    lastY = y;
  }

  return {
    state: {
      ...state,
      lastX,
      lastY,
      crouching,
      canJump,
      swiped,
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

  const moved = Math.hypot(x - state.startX, y - state.startY);
  const tap = !state.swiped && moved < config.swipePx;

  return {
    state: idleGesture,
    tap,
    tapX: state.startX,
  };
}

export function isTouchCrouching(state: TouchGestureState): boolean {
  return state.active && state.crouching;
}
