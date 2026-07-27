export function canAcceptStartPress(
  state: Readonly<{ phase: string }>,
): boolean {
  return state.phase === "ready";
}

export function canAcceptTakeoffPress(
  state: Readonly<{ phase: string; x: number }>,
  takeoffStartX: number,
): boolean {
  return state.phase === "ramp" && state.x >= takeoffStartX;
}

export function canConsumePress(
  state: Readonly<{ phase: string; x: number }>,
  takeoffStartX: number,
): boolean {
  return (
    canAcceptStartPress(state) ||
    canAcceptTakeoffPress(state, takeoffStartX)
  );
}
