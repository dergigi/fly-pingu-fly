export type JumpHudStats = Readonly<{
  distance: number;
  airtime: number;
}>;

export function jumpHudStats(
  state: Readonly<{ x: number; airtime: number; phase: string }>,
  lipX: number,
): JumpHudStats {
  const distance =
    state.phase === "ready" ||
    state.phase === "drop" ||
    state.phase === "ramp"
      ? 0
      : Math.max(0, state.x - lipX);

  return {
    distance,
    airtime: Math.max(0, state.airtime),
  };
}

export function formatJumpHud(stats: JumpHudStats): string {
  return `${Math.round(stats.distance)} m\n${stats.airtime.toFixed(1)} s`;
}
