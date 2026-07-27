export type JumpHudStats = Readonly<{
  distance: number;
  airtime: number;
}>;

export function jumpHudStats(
  state: Readonly<{ distance: number; airtime: number }>,
): JumpHudStats {
  return {
    distance: Math.max(0, state.distance),
    airtime: Math.max(0, state.airtime),
  };
}

export function formatJumpHud(stats: JumpHudStats): string {
  return `${Math.round(stats.distance)} m\n${stats.airtime.toFixed(1)} s`;
}
