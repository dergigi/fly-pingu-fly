export const LEADERBOARD_LIMIT = 10;
export const LEADERBOARD_STORAGE_KEY = "fly-pingu-fly:top-distances-m";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type SubmitDistanceResult = Readonly<{
  entries: readonly number[];
  rank: number | null;
  accepted: boolean;
}>;

/** Keep centimeter precision for short ski distances. */
export function normalizeDistance(distance: number): number {
  if (!Number.isFinite(distance) || distance <= 0) {
    return 0;
  }
  return Math.round(distance * 100) / 100;
}

export function rankDistance(
  entries: readonly number[],
  distance: number,
  limit = LEADERBOARD_LIMIT,
): number | null {
  const meters = normalizeDistance(distance);
  if (meters <= 0) {
    return null;
  }

  const next = submitDistance(entries, meters, limit);
  return next.accepted ? next.rank : null;
}

export function submitDistance(
  entries: readonly number[],
  distance: number,
  limit = LEADERBOARD_LIMIT,
): SubmitDistanceResult {
  const meters = normalizeDistance(distance);
  if (meters <= 0 || limit <= 0) {
    return { entries: sanitizeEntries(entries, limit), rank: null, accepted: false };
  }

  const sorted = sanitizeEntries([...entries, meters], limit);
  const rank = sorted.indexOf(meters);
  const accepted = rank >= 0;

  return {
    entries: sorted,
    rank: accepted ? rank + 1 : null,
    accepted,
  };
}

export function sanitizeEntries(
  entries: readonly number[],
  limit = LEADERBOARD_LIMIT,
): number[] {
  return entries
    .map(normalizeDistance)
    .filter((distance) => distance > 0)
    .sort((a, b) => b - a)
    .slice(0, Math.max(0, limit));
}

export function readLeaderboard(
  store: StorageLike,
  key = LEADERBOARD_STORAGE_KEY,
  limit = LEADERBOARD_LIMIT,
): number[] {
  try {
    const raw = store.getItem(key);
    if (raw === null || raw === "") {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return sanitizeEntries(
      parsed.filter((value): value is number => typeof value === "number"),
      limit,
    );
  } catch {
    return [];
  }
}

export function writeLeaderboard(
  store: StorageLike,
  entries: readonly number[],
  key = LEADERBOARD_STORAGE_KEY,
  limit = LEADERBOARD_LIMIT,
): number[] {
  const sanitized = sanitizeEntries(entries, limit);
  try {
    store.setItem(key, JSON.stringify(sanitized));
  } catch {
    // Private mode / quota failures should not break play.
  }
  return sanitized;
}

export function recordDistance(
  store: StorageLike,
  distance: number,
  key = LEADERBOARD_STORAGE_KEY,
  limit = LEADERBOARD_LIMIT,
): SubmitDistanceResult {
  const current = readLeaderboard(store, key, limit);
  const result = submitDistance(current, distance, limit);
  if (result.accepted) {
    writeLeaderboard(store, result.entries, key, limit);
  }
  return result;
}

export function formatLeaderboard(entries: readonly number[]): string {
  if (entries.length === 0) {
    return "Top 10\n—";
  }

  return [
    "Top 10",
    ...entries.map(
      (distance, index) => `${index + 1}. ${normalizeDistance(distance).toFixed(2)} m`,
    ),
  ].join("\n");
}
