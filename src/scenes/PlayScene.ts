import Phaser from "phaser";

import {
  FIXED_STEP,
  MAX_CATCH_UP_STEPS,
  MAX_FRAME_DELTA,
  jumpConfig,
} from "../game/config";
import {
  createInitialJumpState,
  stepJump,
  type JumpState,
} from "../game/jump";
import { InputLatch } from "../game/inputLatch";
import {
  PENGUIN_FRAMES,
  poseForJumpPhase,
  type PenguinPose,
} from "../game/penguinFrames";
import { sampleLanding, sampleRamp, sampleRampCurve } from "../game/terrain";

const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 720;
const PENGUIN_SCALE = 1.15;

export class PlayScene extends Phaser.Scene {
  private jumpState: JumpState = createInitialJumpState(jumpConfig);
  private readonly inputLatch = new InputLatch();
  private accumulator = 0;
  private simulationTimeMs = 0;
  private penguin!: Phaser.GameObjects.Sprite;
  private takeoffPosePending = false;

  constructor() {
    super("play");
  }

  preload(): void {
    this.load.image(
      "penguin-sheet",
      "/assets/sprites/sprite_penguin.png",
    );
    this.load.image(
      "winter-forest",
      "/assets/sprites/winter-forest.webp",
    );
    this.load.image("snow-pile", "/assets/sprites/snow-pile.webp");
  }

  create(): void {
    this.drawWorld();
    this.registerPenguinFrames();
    this.penguin = this.createPenguin();
    this.bindInput();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.renderSnapshot();
  }

  update(time: number, deltaMs: number): void {
    if (this.simulationTimeMs === 0) {
      this.simulationTimeMs = time;
    }

    this.accumulator += Math.min(deltaMs / 1000, MAX_FRAME_DELTA);
    let steps = 0;

    while (
      this.accumulator + Number.EPSILON >= FIXED_STEP &&
      steps < MAX_CATCH_UP_STEPS
    ) {
      this.simulationTimeMs += FIXED_STEP * 1000;
      const command = this.inputLatch.consumeThrough(this.simulationTimeMs);
      const previousPhase = this.jumpState.phase;
      this.jumpState = stepJump(
        this.jumpState,
        command,
        FIXED_STEP,
        jumpConfig,
      );
      if (previousPhase === "ramp" && this.jumpState.phase !== "ramp") {
        this.inputLatch.seal();
        this.takeoffPosePending = true;
      }
      this.accumulator -= FIXED_STEP;
      steps += 1;
    }

    if (steps === MAX_CATCH_UP_STEPS) {
      this.accumulator = Math.min(this.accumulator, FIXED_STEP);
    }

    this.renderSnapshot();
  }

  private bindInput(): void {
    this.input.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer) =>
        this.inputLatch.tryQueuePress(pointer.downTime),
    );

    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      return;
    }

    const keys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    ];

    for (const key of keys) {
      key.on("down", (event: KeyboardEvent) => {
        if (!event.repeat) {
          this.inputLatch.tryQueuePress(event.timeStamp);
        }
      });
    }
  }

  private drawWorld(): void {
    this.cameras.main.setBackgroundColor("#8ed8f8");

    this.add
      .image(255, 215, "winter-forest")
      .setScale(0.76)
      .setAlpha(0.88)
      .setDepth(-3);

    const scenery = this.add.graphics();
    scenery.fillStyle(0xffffff);
    scenery.beginPath();
    scenery.moveTo(0, jumpConfig.startY - 45);
    scenery.lineTo(jumpConfig.startX, jumpConfig.startY);
    for (const point of sampleRampCurve(jumpConfig, 8)) {
      scenery.lineTo(point.x, point.y);
    }
    scenery.lineTo(jumpConfig.lipX, WORLD_HEIGHT);
    scenery.lineTo(0, WORLD_HEIGHT);
    scenery.closePath();
    scenery.fillPath();

    const rampPoints = sampleRampCurve(jumpConfig, 8);
    scenery.lineStyle(7, 0xd9f5ff, 1);
    scenery.beginPath();
    scenery.moveTo(rampPoints[0]!.x, rampPoints[0]!.y);
    for (const point of rampPoints.slice(1)) {
      scenery.lineTo(point.x, point.y);
    }
    scenery.strokePath();

    scenery.fillStyle(0xf8fdff);
    scenery.beginPath();
    scenery.moveTo(jumpConfig.landingStartX, jumpConfig.landingY);
    scenery.lineTo(
      WORLD_WIDTH,
      jumpConfig.landingY +
        (WORLD_WIDTH - jumpConfig.landingStartX) * jumpConfig.landingSlope,
    );
    scenery.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
    scenery.lineTo(jumpConfig.landingStartX, WORLD_HEIGHT);
    scenery.closePath();
    scenery.fillPath();

    const takeoff = sampleRamp(jumpConfig.takeoffStartX, jumpConfig);
    const lip = sampleRamp(jumpConfig.lipX, jumpConfig);
    scenery.lineStyle(10, 0xb7e8fa, 1);
    scenery.lineBetween(takeoff.x, takeoff.y + 7, lip.x, lip.y + 7);
    scenery.lineStyle(7, 0x176d99, 1);
    scenery.lineBetween(lip.x, lip.y - 15, lip.x, lip.y + 22);
    scenery.lineStyle(3, 0x55b9dd, 1);
    scenery.lineBetween(lip.x + 4, lip.y + 8, lip.x + 4, lip.y + 34);

    const pileSurface = sampleLanding(1120, jumpConfig);
    this.add
      .image(1120, pileSurface.y - 23, "snow-pile")
      .setScale(0.35)
      .setDepth(2);
  }

  private registerPenguinFrames(): void {
    const texture = this.textures.get("penguin-sheet");
    for (const [pose, frame] of Object.entries(PENGUIN_FRAMES)) {
      texture.add(
        pose,
        0,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
      );
    }
  }

  private createPenguin(): Phaser.GameObjects.Sprite {
    return this.add
      .sprite(
        this.jumpState.x,
        this.jumpState.y,
        "penguin-sheet",
        "ramp",
      )
      .setScale(PENGUIN_SCALE)
      .setDepth(10);
  }

  private applyPose(pose: PenguinPose): void {
    const frame = PENGUIN_FRAMES[pose];
    this.penguin
      .setFrame(pose)
      .setOrigin(frame.contactX / frame.width, frame.contactY / frame.height);
  }

  private renderSnapshot(): void {
    const state = this.jumpState;
    const pose = poseForJumpPhase(state, this.takeoffPosePending);
    this.applyPose(pose);
    this.penguin.setPosition(state.x, state.y);
    this.takeoffPosePending = false;

    const rotation =
      state.phase === "flight"
        ? Phaser.Math.Clamp(Math.atan2(state.vy, state.vx), -0.65, 0.65)
        : state.phase === "ramp"
          ? Math.atan(sampleRamp(state.x, jumpConfig).slope)
          : Math.atan(sampleLanding(state.x, jumpConfig).slope);
    this.penguin.setRotation(rotation);

    const focusX =
      state.phase === "ramp"
        ? Math.max(state.x + 180, jumpConfig.lipX)
        : state.phase === "flight"
          ? state.x + 390
          : state.x + 230;
    const targetX = Phaser.Math.Clamp(
      focusX - this.cameras.main.width / 2,
      0,
      WORLD_WIDTH - this.cameras.main.width,
    );
    this.cameras.main.scrollX =
      state.phase === "resting"
        ? targetX
        : Phaser.Math.Linear(this.cameras.main.scrollX, targetX, 0.08);
  }
}
