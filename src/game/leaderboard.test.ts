import { describe, expect, it } from "vitest";

import {
  formatLeaderboard,
  LEADERBOARD_LIMIT,
  LEADERBOARD_STORAGE_KEY,
  normalizeDistance,
  rankDistance,
  readLeaderboard,
  recordDistance,
  submitDistance,
  writeLeaderboard,
} from "./leaderboard";

function memoryStore(initial: Record<string, string> = {}): Storage {
  const data = { ...initial };
  return {
    get length() {
      return Object.keys(data).length;
    },
    clear() {
      for (const key of Object.keys(data)) {
        delete data[key];
      }
    },
    getItem(key: string) {
      return Object.hasOwn(data, key) ? data[key]! : null;
    },
    key() {
      return null;
    },
    removeItem(key: string) {
      delete data[key];
    },
    setItem(key: string, value: string) {
      data[key] = String(value);
    },
  };
}

describe("distance leaderboard", () => {
  it("keeps only the top ten distances, highest first", () => {
    const seed = [1.0, 4.0, 3.0, 2.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 1.5, 0.5];
    const result = submitDistance(seed, 4.5);

    expect(result.entries).toHaveLength(LEADERBOARD_LIMIT);
    expect(result.entries[0]).toBe(10);
    expect(result.entries).toEqual([10, 9, 8, 7, 6, 5, 4.5, 4, 3, 2]);
    expect(result.accepted).toBe(true);
    expect(result.rank).toBe(7);
  });

  it("rejects non-positive distances and still returns a clean board", () => {
    expect(normalizeDistance(-3)).toBe(0);
    expect(normalizeDistance(Number.NaN)).toBe(0);
    expect(submitDistance([1.2, 0.8], 0).accepted).toBe(false);
    expect(submitDistance([1.2, 0.8], 0).entries).toEqual([1.2, 0.8]);
  });

  it("rounds distances to centimeters before ranking", () => {
    const result = submitDistance([1.0], 0.996);
    expect(result.entries).toEqual([1, 1]);
    expect(rankDistance([2.0, 1.0], 1.504)).toBe(2);
  });

  it("persists and reloads through storage", () => {
    const store = memoryStore();
    const saved = writeLeaderboard(store, [0.122, 0.408, 0, -1]);
    expect(saved).toEqual([0.41, 0.12]);
    expect(readLeaderboard(store)).toEqual([0.41, 0.12]);

    const recorded = recordDistance(store, 0.552);
    expect(recorded.rank).toBe(1);
    expect(readLeaderboard(store)).toEqual([0.55, 0.41, 0.12]);
  });

  it("survives corrupt or missing storage values", () => {
    expect(readLeaderboard(memoryStore())).toEqual([]);
    expect(
      readLeaderboard(memoryStore({ [LEADERBOARD_STORAGE_KEY]: "{" })),
    ).toEqual([]);
    expect(
      readLeaderboard(memoryStore({ [LEADERBOARD_STORAGE_KEY]: '"nope"' })),
    ).toEqual([]);
  });

  it("formats a simple kid-readable board", () => {
    expect(formatLeaderboard([])).toBe("Top 10\n—");
    expect(formatLeaderboard([31.28, 16.93])).toBe(
      "Top 10\n1. 31.28 m\n2. 16.93 m",
    );
  });
});
