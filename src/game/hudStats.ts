/** World X units per displayed meter (lip-relative distance / this). */
export const WORLD_UNITS_PER_METER = 50;

export type JumpHudStats = Readonly<{
  distance: number;
  airtime: number;
}>;

export function worldDistanceToMeters(worldDistance: number): number {
  if (!Number.isFinite(worldDistance) || worldDistance <= 0) {
    return 0;
  }
  return worldDistance / WORLD_UNITS_PER_METER;
}

export function jumpHudStats(
  state: Readonly<{ distance: number; airtime: number }>,
): JumpHudStats {
  return {
    distance: worldDistanceToMeters(state.distance),
    airtime: Math.max(0, state.airtime),
  };
}

export function formatJumpHud(stats: JumpHudStats): string {
  return `${formatDistanceHud(stats)}\n${formatAirtimeHud(stats)}`;
}

export function formatDistanceHud(stats: JumpHudStats): string {
  return `${stats.distance.toFixed(2)} m`;
}

export function formatAirtimeHud(stats: JumpHudStats): string {
  return `${stats.airtime.toFixed(1)} s`;
}
