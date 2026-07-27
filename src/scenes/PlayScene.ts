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
import { formatJumpHud, jumpHudStats } from "../game/hudStats";
import { InputLatch } from "../game/inputLatch";
import {
  PENGUIN_FRAMES,
  poseForJumpPhase,
  type PenguinPose,
} from "../game/penguinFrames";
import {
  sampleLanding,
  sampleLandingCurve,
  sampleRamp,
  sampleRampCurve,
} from "../game/terrain";

const WORLD_WIDTH = 4700;
const WORLD_HEIGHT = 1000;
const CAMERA_TOP_PAD = 140;
const PENGUIN_SCALE = 0.68;
const LOG_SCALE = 0.72;

export class PlayScene extends Phaser.Scene {
  private jumpState: JumpState = createInitialJumpState(jumpConfig);
  private readonly inputLatch = new InputLatch();
  private accumulator = 0;
  private simulationTimeMs = 0;
  private penguin!: Phaser.GameObjects.Sprite;
  private hudText!: Phaser.GameObjects.Text;
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
    this.load.image(
      "fallen-log",
      "/assets/sprites/snow-covered-fallen-log.webp",
    );
  }

  create(): void {
    this.drawWorld();
    this.registerPenguinFrames();
    this.penguin = this.createPenguin();
    this.hudText = this.createHud();
    this.bindInput();

    this.cameras.main.setBounds(
      0,
      -CAMERA_TOP_PAD,
      WORLD_WIDTH,
      WORLD_HEIGHT + CAMERA_TOP_PAD,
    );
    this.cameras.main.setFollowOffset(-Math.min(220, this.cameras.main.width * 0.14), -30);
    this.cameras.main.startFollow(this.penguin, true, 0.14, 0.14);
    this.cameras.main.centerOn(this.penguin.x + 180, this.penguin.y + 80);
    this.scale.on("resize", this.layoutHud, this);
    this.layoutHud();
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
      const nextState = stepJump(
        this.jumpState,
        command,
        FIXED_STEP,
        jumpConfig,
      );
      this.jumpState = nextState;
      if (previousPhase === "ramp" && nextState.phase === "flight") {
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
    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.style.outline = "none";

    this.input.on("pointerdown", () => {
      this.game.canvas.focus();
      this.queuePress();
    });

    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      return;
    }

    const keys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
    ];

    for (const key of keys) {
      key.on("down", (event: KeyboardEvent) => {
        if (!event.repeat) {
          event.preventDefault();
          this.queuePress();
        }
      });
    }
  }

  private queuePress(): void {
    const pressedAtMs =
      this.simulationTimeMs > 0 ? this.simulationTimeMs : this.time.now;
    this.inputLatch.tryQueuePress(pressedAtMs);
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
    scenery.moveTo(0, jumpConfig.readyY + 18);
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

    const landingPoints = sampleLandingCurve(jumpConfig, 10, WORLD_WIDTH);
    scenery.fillStyle(0xf8fdff);
    scenery.beginPath();
    scenery.moveTo(landingPoints[0]!.x, landingPoints[0]!.y);
    for (const point of landingPoints.slice(1)) {
      scenery.lineTo(point.x, point.y);
    }
    scenery.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
    scenery.lineTo(jumpConfig.landingStartX, WORLD_HEIGHT);
    scenery.closePath();
    scenery.fillPath();

    scenery.lineStyle(7, 0xd9f5ff, 1);
    scenery.beginPath();
    scenery.moveTo(landingPoints[0]!.x, landingPoints[0]!.y);
    for (const point of landingPoints.slice(1)) {
      scenery.lineTo(point.x, point.y);
    }
    scenery.strokePath();

    const takeoff = sampleRamp(jumpConfig.takeoffStartX, jumpConfig);
    const lip = sampleRamp(jumpConfig.lipX, jumpConfig);
    scenery.lineStyle(10, 0xb7e8fa, 1);
    scenery.lineBetween(takeoff.x, takeoff.y + 7, lip.x, lip.y + 7);
    scenery.lineStyle(7, 0x176d99, 1);
    scenery.lineBetween(lip.x, lip.y - 15, lip.x, lip.y + 22);
    scenery.lineStyle(3, 0x55b9dd, 1);
    scenery.lineBetween(lip.x + 4, lip.y + 8, lip.x + 4, lip.y + 34);

    this.add
      .image(jumpConfig.readyX + 8, jumpConfig.readyY + 34, "fallen-log")
      .setScale(LOG_SCALE)
      .setDepth(4);

    const pileSurface = sampleLanding(2200, jumpConfig);
    this.add
      .image(2200, pileSurface.y - 23, "snow-pile")
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
        "ready",
      )
      .setScale(PENGUIN_SCALE)
      .setFlipX(true)
      .setDepth(10);
  }

  private createHud(): Phaser.GameObjects.Text {
    return this.add
      .text(0, 22, "", {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: "36px",
        fontStyle: "bold",
        color: "#0b4f73",
        align: "right",
        stroke: "#f4fbff",
        strokeThickness: 8,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private layoutHud(): void {
    this.hudText.setPosition(this.cameras.main.width - 28, 22);
    this.cameras.main.setFollowOffset(
      -Math.min(220, this.cameras.main.width * 0.14),
      -30,
    );
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
    this.hudText.setText(formatJumpHud(jumpHudStats(state)));
    this.takeoffPosePending = false;

    const rotation =
      state.phase === "ready"
        ? 0
        : state.phase === "drop" || state.phase === "flight"
          ? Phaser.Math.Clamp(Math.atan2(state.vy, state.vx), -0.65, 0.65)
          : state.phase === "ramp"
            ? Math.atan(sampleRamp(state.x, jumpConfig).slope)
            : Math.atan(sampleLanding(state.x, jumpConfig).slope);
    this.penguin.setRotation(rotation);
  }
}
