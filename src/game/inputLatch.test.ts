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

  it("rejects repeats, extra pointers, and every later command", () => {
    const latch = new InputLatch();

    expect(latch.tryQueuePress(100)).toBe(true);
    expect(latch.tryQueuePress(100)).toBe(false);
    expect(latch.tryQueuePress(101)).toBe(false);
    expect(latch.consumeThrough(100)).toEqual({ pressedAtMs: 100 });
    expect(latch.tryQueuePress(200)).toBe(false);
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
