import { describe, expect, it } from "vitest";

import { jumpConfig } from "./config";
import {
  PENGUIN_FRAMES,
  PENGUIN_SHEET,
  poseForJumpPhase,
  spritePositionForContact,
  type PenguinPose,
} from "./penguinFrames";
import { createInitialJumpState, stepJump, type JumpState } from "./jump";
import { sampleRamp } from "./terrain";

const poses = [
  "ready",
  "drop",
  "ramp",
  "takeoff",
  "flight",
  "landing",
  "slide",
  "crash",
  "crashed",
  "resting",
] as const satisfies readonly PenguinPose[];

describe("penguin frame manifest", () => {
  it("uses finite occupied crops inside the approved sheet", () => {
    expect(PENGUIN_SHEET).toEqual({ width: 640, height: 240 });

    for (const pose of poses) {
      const frame = PENGUIN_FRAMES[pose];
      expect(Object.values(frame).every(Number.isFinite)).toBe(true);
      expect(frame.width).toBeGreaterThan(0);
      expect(frame.height).toBeGreaterThan(0);
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.width).toBeLessThanOrEqual(PENGUIN_SHEET.width);
      expect(frame.y + frame.height).toBeLessThanOrEqual(PENGUIN_SHEET.height);
      expect(frame.contactX).toBeGreaterThanOrEqual(0);
      expect(frame.contactX).toBeLessThanOrEqual(frame.width);
      expect(frame.contactY).toBeGreaterThanOrEqual(0);
      expect(frame.contactY).toBeLessThanOrEqual(frame.height);
    }
  });

  it("preserves one world snow-contact point across every pose", () => {
    const contact = { x: 512, y: 367 };

    for (const pose of poses) {
      const sprite = spritePositionForContact(contact, PENGUIN_FRAMES[pose]);
      expect(sprite.x + PENGUIN_FRAMES[pose].contactX).toBe(contact.x);
      expect(sprite.y + PENGUIN_FRAMES[pose].contactY).toBe(contact.y);
    }
  });

  it("maps every phase and the accepted transition to inspected poses", () => {
    const ready = createInitialJumpState(jumpConfig);
    const drop = stepJump(ready, { pressedAtMs: 0 }, 1 / 120, jumpConfig);
    const ramp: JumpState = {
      ...drop,
      phase: "ramp",
      x: jumpConfig.takeoffStartX,
      y: sampleRamp(jumpConfig.takeoffStartX, jumpConfig).y,
      speed: jumpConfig.initialSpeed,
      distance: 0,
    };
    const accepted = stepJump(
      ramp,
      { pressedAtMs: 0 },
      1 / 120,
      jumpConfig,
    );
    const flight: JumpState = { ...accepted, airtime: 0.1 };
    const landing: JumpState = {
      ...accepted,
      phase: "slide",
      speed: 300,
      airtime: 0.8,
    };
    const slide: JumpState = { ...landing, speed: 120 };
    const crash: JumpState = {
      ...accepted,
      phase: "crashed",
      speed: 120,
      airtime: 0.5,
    };
    const crashed: JumpState = { ...crash, speed: 0 };
    const resting: JumpState = { ...slide, phase: "resting", speed: 0 };

    expect(poseForJumpPhase(ready)).toBe("ready");
    expect(poseForJumpPhase(drop)).toBe("drop");
    expect(poseForJumpPhase(ramp)).toBe("flight");
    expect(poseForJumpPhase(accepted)).toBe("takeoff");
    expect(poseForJumpPhase(flight)).toBe("flight");
    expect(poseForJumpPhase(landing)).toBe("flight");
    expect(poseForJumpPhase(slide)).toBe("flight");
    expect(poseForJumpPhase(crash)).toBe("crash");
    expect(poseForJumpPhase(crashed)).toBe("crashed");
    expect(poseForJumpPhase(resting)).toBe("resting");
  });
});
