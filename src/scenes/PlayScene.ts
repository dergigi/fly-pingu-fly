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
  type PressCommand,
} from "../game/jump";

const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 720;

export class PlayScene extends Phaser.Scene {
  private jumpState: JumpState = createInitialJumpState(jumpConfig);
  private pendingPress: PressCommand = null;
  private accumulator = 0;
  private simulationTimeMs = 0;
  private penguin!: Phaser.GameObjects.Container;

  constructor() {
    super("play");
  }

  create(): void {
    this.drawWorld();
    this.penguin = this.createPenguinMarker();
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
      const command = this.consumePressThrough(this.simulationTimeMs);
      this.jumpState = stepJump(
        this.jumpState,
        command,
        FIXED_STEP,
        jumpConfig,
      );
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
      (pointer: Phaser.Input.Pointer) => this.tryQueuePress(pointer.downTime),
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
          this.tryQueuePress(event.timeStamp);
        }
      });
    }
  }

  private tryQueuePress(pressedAtMs: number): void {
    if (
      this.jumpState.phase !== "ramp" ||
      this.pendingPress !== null ||
      !Number.isFinite(pressedAtMs)
    ) {
      return;
    }

    this.pendingPress = { pressedAtMs };
  }

  private consumePressThrough(simulationTimeMs: number): PressCommand {
    if (
      this.pendingPress === null ||
      this.pendingPress.pressedAtMs > simulationTimeMs
    ) {
      return null;
    }

    const command = this.pendingPress;
    this.pendingPress = null;
    return command;
  }

  private drawWorld(): void {
    this.cameras.main.setBackgroundColor("#8ed8f8");

    const scenery = this.add.graphics();
    scenery.fillStyle(0xffffff);
    scenery.beginPath();
    scenery.moveTo(0, 240);
    scenery.lineTo(jumpConfig.startX, jumpConfig.startY);
    scenery.lineTo(
      jumpConfig.lateBoundaryX,
      jumpConfig.startY +
        (jumpConfig.lateBoundaryX - jumpConfig.startX) *
          jumpConfig.rampSlope,
    );
    scenery.lineTo(jumpConfig.lateBoundaryX, WORLD_HEIGHT);
    scenery.lineTo(0, WORLD_HEIGHT);
    scenery.closePath();
    scenery.fillPath();

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

    scenery.lineStyle(8, 0x176d99, 1);
    scenery.lineBetween(
      jumpConfig.lipX,
      jumpConfig.startY +
        (jumpConfig.lipX - jumpConfig.startX) * jumpConfig.rampSlope -
        14,
      jumpConfig.lipX,
      jumpConfig.startY +
        (jumpConfig.lipX - jumpConfig.startX) * jumpConfig.rampSlope +
        18,
    );
  }

  private createPenguinMarker(): Phaser.GameObjects.Container {
    const body = this.add.ellipse(0, -30, 42, 60, 0x172f47);
    const belly = this.add.ellipse(4, -24, 25, 38, 0xf8fdff);
    const beak = this.add.triangle(23, -42, 0, 0, 17, 6, 0, 12, 0xf7a21b);
    const eye = this.add.circle(9, -47, 3, 0xffffff);
    const marker = this.add.container(
      this.jumpState.x,
      this.jumpState.y,
      [body, belly, beak, eye],
    );

    marker.setDepth(10);
    return marker;
  }

  private renderSnapshot(): void {
    const state = this.jumpState;
    this.penguin.setPosition(state.x, state.y);

    const rotation =
      state.phase === "flight"
        ? Phaser.Math.Clamp(Math.atan2(state.vy, state.vx), -0.65, 0.65)
        : state.phase === "ramp"
          ? Math.atan(jumpConfig.rampSlope)
          : Math.atan(jumpConfig.landingSlope);
    this.penguin.setRotation(rotation);
    this.penguin.setScale(state.phase === "flight" ? 1.08 : 1);

    const lead =
      state.phase === "ramp" ? 300 : state.phase === "flight" ? 420 : 250;
    const targetX = Phaser.Math.Clamp(
      state.x + lead - this.cameras.main.width / 2,
      0,
      WORLD_WIDTH - this.cameras.main.width,
    );
    this.cameras.main.scrollX = Phaser.Math.Linear(
      this.cameras.main.scrollX,
      targetX,
      0.08,
    );
  }
}
