import { describe, expect, it } from "vitest";

import {
  formatLeaderboard,
  LEADERBOARD_LIMIT,
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
    const seed = [10, 40, 30, 20, 50, 60, 70, 80, 90, 100, 15, 5];
    const result = submitDistance(seed, 45);

    expect(result.entries).toHaveLength(LEADERBOARD_LIMIT);
    expect(result.entries[0]).toBe(100);
    expect(result.entries).toEqual([100, 90, 80, 70, 60, 50, 45, 40, 30, 20]);
    expect(result.accepted).toBe(true);
    expect(result.rank).toBe(7);
  });

  it("rejects non-positive distances and still returns a clean board", () => {
    expect(normalizeDistance(-3)).toBe(0);
    expect(normalizeDistance(Number.NaN)).toBe(0);
    expect(submitDistance([12, 8], 0).accepted).toBe(false);
    expect(submitDistance([12, 8], 0).entries).toEqual([12, 8]);
  });

  it("rounds distances to whole meters before ranking", () => {
    const result = submitDistance([100], 99.6);
    expect(result.entries).toEqual([100, 100]);
    expect(rankDistance([200, 100], 150.4)).toBe(2);
  });

  it("persists and reloads through storage", () => {
    const store = memoryStore();
    const saved = writeLeaderboard(store, [12.2, 40.8, 0, -1]);
    expect(saved).toEqual([41, 12]);
    expect(readLeaderboard(store)).toEqual([41, 12]);

    const recorded = recordDistance(store, 55.2);
    expect(recorded.rank).toBe(1);
    expect(readLeaderboard(store)).toEqual([55, 41, 12]);
  });

  it("survives corrupt or missing storage values", () => {
    expect(readLeaderboard(memoryStore())).toEqual([]);
    expect(readLeaderboard(memoryStore({ "fly-pingu-fly:top-distances": "{" }))).toEqual(
      [],
    );
    expect(
      readLeaderboard(
        memoryStore({ "fly-pingu-fly:top-distances": '"nope"' }),
      ),
    ).toEqual([]);
  });

  it("formats a simple kid-readable board", () => {
    expect(formatLeaderboard([])).toBe("Top 10\n—");
    expect(formatLeaderboard([3128, 1693])).toBe("Top 10\n1. 3128 m\n2. 1693 m");
  });
});
