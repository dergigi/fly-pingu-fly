import { describe, expect, it } from "vitest";

import {
  beginTouchGesture,
  createIdleTouchGesture,
  endTouchGesture,
  isTouchCrouching,
  touchSwipeDefaults,
  updateTouchGesture,
} from "./touchInput";

describe("touch swipe gestures", () => {
  it("latches crouch on swipe down and clears on end", () => {
    let state = beginTouchGesture(1, 100, 100);
    const down = updateTouchGesture(state, 100, 100 + touchSwipeDefaults.swipePx, {
      ...touchSwipeDefaults,
    });
    state = down.state;
    expect(isTouchCrouching(state)).toBe(true);
    expect(down.jump).toBe(false);

    const ended = endTouchGesture(state, 100, 160);
    expect(isTouchCrouching(ended.state)).toBe(false);
    expect(ended.tap).toBe(false);
  });

  it("emits jump once on swipe up", () => {
    let state = beginTouchGesture(1, 100, 200);
    const first = updateTouchGesture(
      state,
      100,
      200 - touchSwipeDefaults.swipePx,
    );
    state = first.state;
    expect(first.jump).toBe(true);

    const second = updateTouchGesture(state, 100, 200 - touchSwipeDefaults.swipePx * 2);
    expect(second.jump).toBe(false);
  });

  it("allows swipe-up jump after crouch latch for crouch-jump", () => {
    let state = beginTouchGesture(1, 100, 200);
    state = updateTouchGesture(state, 100, 200 + touchSwipeDefaults.swipePx).state;
    expect(isTouchCrouching(state)).toBe(true);

    const jump = updateTouchGesture(state, 100, 200 - touchSwipeDefaults.swipePx);
    expect(jump.jump).toBe(true);
    expect(isTouchCrouching(jump.state)).toBe(true);
  });

  it("emits horizontal turn when sideways swipe dominates", () => {
    const state = beginTouchGesture(1, 100, 100);
    const right = updateTouchGesture(state, 100 + touchSwipeDefaults.swipePx, 102);
    expect(right.turn).toBe(1);

    const leftState = beginTouchGesture(2, 100, 100);
    const left = updateTouchGesture(leftState, 100 - touchSwipeDefaults.swipePx, 102);
    expect(left.turn).toBe(-1);
  });

  it("treats a short press as a tap", () => {
    const state = beginTouchGesture(1, 80, 40);
    const ended = endTouchGesture(state, 84, 44);
    expect(ended.tap).toBe(true);
    expect(ended.tapX).toBe(80);
  });

  it("does not tap after a crouch swipe", () => {
    let state = beginTouchGesture(1, 80, 40);
    state = updateTouchGesture(state, 80, 40 + touchSwipeDefaults.swipePx).state;
    const ended = endTouchGesture(state, 80, 80);
    expect(ended.tap).toBe(false);
  });

  it("ignores updates when idle", () => {
    const idle = createIdleTouchGesture();
    const update = updateTouchGesture(idle, 10, 10);
    expect(update.jump).toBe(false);
    expect(update.state.active).toBe(false);
  });
});
