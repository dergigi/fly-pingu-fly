export const FIXED_STEP = 1 / 120;
export const MAX_CATCH_UP_STEPS = 12;
export const MAX_FRAME_DELTA = 0.1;

export type JumpConfig = Readonly<{
  startX: number;
  startY: number;
  initialSpeed: number;
  rampAcceleration: number;
  rampSlope: number;
  lipX: number;
  lateBoundaryX: number;
  minimumQuality: number;
  earlySpan: number;
  lateSpan: number;
  minimumLaunchX: number;
  maximumLaunchX: number;
  minimumLaunchY: number;
  maximumLaunchY: number;
  gravity: number;
  landingStartX: number;
  landingY: number;
  landingSlope: number;
  slideDeceleration: number;
  stopSpeed: number;
}>;

export const jumpConfig: JumpConfig = Object.freeze({
  startX: 120,
  startY: 190,
  initialSpeed: 70,
  rampAcceleration: 80,
  rampSlope: 0.55,
  lipX: 520,
  lateBoundaryX: 560,
  minimumQuality: 0.35,
  earlySpan: 180,
  lateSpan: 60,
  minimumLaunchX: 420,
  maximumLaunchX: 600,
  minimumLaunchY: 300,
  maximumLaunchY: 460,
  gravity: 700,
  landingStartX: 560,
  landingY: 430,
  landingSlope: 0.18,
  slideDeceleration: 95,
  stopSpeed: 1,
});
