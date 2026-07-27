import type { JumpState } from "./jump";

export type PenguinPose =
  | "ready"
  | "drop"
  | "ramp"
  | "takeoff"
  | "flight"
  | "landing"
  | "slide"
  | "resting";

export type PenguinFrame = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  contactX: number;
  contactY: number;
}>;

export const PENGUIN_SHEET = Object.freeze({ width: 640, height: 240 });

export const PENGUIN_FRAMES: Readonly<Record<PenguinPose, PenguinFrame>> =
  Object.freeze({
    ready: {
      x: 91,
      y: 92,
      width: 66,
      height: 74,
      contactX: 33,
      contactY: 68,
    },
    drop: {
      x: 396,
      y: 94,
      width: 89,
      height: 72,
      contactX: 20,
      contactY: 59,
    },
    ramp: { x: 164, y: 94, width: 80, height: 72, contactX: 39, contactY: 65 },
    takeoff: {
      x: 396,
      y: 94,
      width: 89,
      height: 72,
      contactX: 20,
      contactY: 59,
    },
    flight: {
      x: 326,
      y: 96,
      width: 76,
      height: 67,
      contactX: 15,
      contactY: 48,
    },
    landing: {
      x: 3,
      y: 177,
      width: 79,
      height: 63,
      contactX: 40,
      contactY: 58,
    },
    slide: {
      x: 80,
      y: 179,
      width: 85,
      height: 61,
      contactX: 43,
      contactY: 57,
    },
    resting: {
      x: 91,
      y: 92,
      width: 66,
      height: 74,
      contactX: 33,
      contactY: 68,
    },
  });

export function poseForJumpPhase(
  state: JumpState,
  takeoffAccepted = false,
): PenguinPose {
  if (takeoffAccepted) {
    return "takeoff";
  }

  switch (state.phase) {
    case "ready":
      return "ready";
    case "drop":
      return "drop";
    case "ramp":
      return "ramp";
    case "flight":
      return state.airtime === 0 ? "takeoff" : "flight";
    case "slide":
      return state.speed > 220 ? "landing" : "slide";
    case "resting":
      return "resting";
  }
}

export function spritePositionForContact(
  contact: Readonly<{ x: number; y: number }>,
  frame: PenguinFrame,
): Readonly<{ x: number; y: number }> {
  return {
    x: contact.x - frame.contactX,
    y: contact.y - frame.contactY,
  };
}
