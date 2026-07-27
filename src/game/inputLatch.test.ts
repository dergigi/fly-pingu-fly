import { describe, expect, it } from "vitest";

import { InputLatch } from "./inputLatch";

describe("InputLatch", () => {
  it("queues and consumes the first finite timestamp once", () => {
    const latch = new InputLatch();

    expect(latch.tryQueuePress(100)).toBe(true);
    expect(latch.consumeThrough(99)).toBeNull();
    expect(latch.consumeThrough(100)).toEqual({ pressedAtMs: 100 });
    expect(latch.consumeThrough(101)).toBeNull();
  });

  it("allows a second press after the start hop is consumed", () => {
    const latch = new InputLatch();

    expect(latch.tryQueuePress(100)).toBe(true);
    expect(latch.tryQueuePress(100)).toBe(false);
    expect(latch.consumeThrough(100)).toEqual({ pressedAtMs: 100 });
    expect(latch.tryQueuePress(200)).toBe(true);
    expect(latch.consumeThrough(200)).toEqual({ pressedAtMs: 200 });
  });

  it("rejects every later command after takeoff is sealed", () => {
    const latch = new InputLatch();

    expect(latch.tryQueuePress(100)).toBe(true);
    expect(latch.consumeThrough(100)).toEqual({ pressedAtMs: 100 });
    latch.seal();
    expect(latch.tryQueuePress(200)).toBe(false);
  });

  it("accepts a new press after reset", () => {
    const latch = new InputLatch();

    expect(latch.tryQueuePress(100)).toBe(true);
    latch.seal();
    latch.reset();
    expect(latch.tryQueuePress(200)).toBe(true);
    expect(latch.consumeThrough(200)).toEqual({ pressedAtMs: 200 });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite timestamp %s",
    (timestamp) => {
      const latch = new InputLatch();

      expect(latch.tryQueuePress(timestamp)).toBe(false);
      expect(latch.consumeThrough(Number.MAX_SAFE_INTEGER)).toBeNull();
    },
  );
});
