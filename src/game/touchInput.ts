import type Phaser from "phaser";

/** Extra touch slots so a second (and third) finger can register beside mouse. */
export function ensureMultiTouch(
  input: Phaser.Input.InputPlugin,
  extraPointers = 2,
): void {
  input.addPointer(extraPointers);
}

/** True while two or more pointers are held down (two-thumb crouch). */
export function isMultiTouchHeld(input: Phaser.Input.InputPlugin): boolean {
  let down = 0;
  for (const pointer of input.manager.pointers) {
    if (pointer.active && pointer.isDown) {
      down += 1;
      if (down >= 2) {
        return true;
      }
    }
  }
  return false;
}
