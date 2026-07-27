import type { PressCommand } from "./jump";

export class InputLatch {
  private pending: PressCommand = null;
  private sealed = false;

  tryQueuePress(pressedAtMs: number): boolean {
    if (
      this.sealed ||
      this.pending !== null ||
      !Number.isFinite(pressedAtMs)
    ) {
      return false;
    }

    this.pending = { pressedAtMs };
    return true;
  }

  consumeThrough(simulationTimeMs: number): PressCommand {
    if (
      !Number.isFinite(simulationTimeMs) ||
      this.pending === null ||
      this.pending.pressedAtMs > simulationTimeMs
    ) {
      return null;
    }

    const command = this.pending;
    this.pending = null;
    return command;
  }

  seal(): void {
    this.pending = null;
    this.sealed = true;
  }

  reset(): void {
    this.pending = null;
    this.sealed = false;
  }
}
