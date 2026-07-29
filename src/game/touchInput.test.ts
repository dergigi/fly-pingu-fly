import { describe, expect, it } from "vitest";

import {
  beginTouchGesture,
  createIdleTouchGesture,
  endTouchGesture,
  isTouchCrouching,
  touchSwipeDefaults,
  updateTouchGesture,
} from "./touchInput";

const { swipePx } = touchSwipeDefaults;

describe("touch swipe gestures", () => {
  it("crouches on swipe down and clears crouch when the finger lifts", () => {
    let state = beginTouchGesture(1, 100, 100);
    const down = updateTouchGesture(state, 100, 100 + swipePx);
    state = down.state;
    expect(isTouchCrouching(state)).toBe(true);
    expect(down.jump).toBe(false);

    const ended = endTouchGesture(state, 100, 160);
    expect(isTouchCrouching(ended.state)).toBe(false);
    expect(ended.tap).toBe(false);
  });

  it("swipe up jumps and stops crouch while still holding", () => {
    let state = beginTouchGesture(1, 100, 200);
    state = updateTouchGesture(state, 100, 200 + swipePx).state;
    expect(isTouchCrouching(state)).toBe(true);

    const up = updateTouchGesture(state, 100, 200);
    expect(up.jump).toBe(true);
    expect(isTouchCrouching(up.state)).toBe(false);
    expect(up.state.active).toBe(true);
  });

  it("supports hold → down crouch → up jump → down crouch again", () => {
    let state = beginTouchGesture(1, 100, 200);

    state = updateTouchGesture(state, 100, 200 + swipePx).state;
    expect(isTouchCrouching(state)).toBe(true);

    const jump = updateTouchGesture(state, 100, 200);
    expect(jump.jump).toBe(true);
    state = jump.state;
    expect(isTouchCrouching(state)).toBe(false);

    state = updateTouchGesture(state, 100, 200 + swipePx).state;
    expect(isTouchCrouching(state)).toBe(true);
  });

  it("emits only one jump per up swipe until a down swipe re-arms", () => {
    let state = beginTouchGesture(1, 100, 200);
    const first = updateTouchGesture(state, 100, 200 - swipePx);
    state = first.state;
    expect(first.jump).toBe(true);

    const second = updateTouchGesture(state, 100, 200 - swipePx * 2);
    expect(second.jump).toBe(false);

    state = updateTouchGesture(second.state, 100, 200 - swipePx).state;
    expect(isTouchCrouching(state)).toBe(true);

    const third = updateTouchGesture(state, 100, 200 - swipePx * 2);
    expect(third.jump).toBe(true);
  });

  it("emits horizontal turn when sideways swipe dominates", () => {
    const state = beginTouchGesture(1, 100, 100);
    const right = updateTouchGesture(state, 100 + swipePx, 102);
    expect(right.turn).toBe(1);

    const leftState = beginTouchGesture(2, 100, 100);
    const left = updateTouchGesture(leftState, 100 - swipePx, 102);
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
    state = updateTouchGesture(state, 80, 40 + swipePx).state;
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
