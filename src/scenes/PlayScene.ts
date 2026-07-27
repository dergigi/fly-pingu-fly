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
  formatLeaderboard,
  readLeaderboard,
  recordDistance,
} from "../game/leaderboard";
import {
  PENGUIN_FRAMES,
  poseForJumpPhase,
  type PenguinPose,
} from "../game/penguinFrames";
import { canConsumePress } from "../game/takeoffWindow";
import {
  sampleLanding,
  sampleLandingCurve,
  sampleRamp,
  sampleRampCurve,
} from "../game/terrain";

const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 1950;
const CAMERA_TOP_PAD = 140;
const PENGUIN_SCALE = 0.3825;
const PENGUIN_CROUCH_SCALE_Y = 0.72;
const LOG_SCALE = 0.36;
/** Image-center offset so the snow seat sits under the ready-pose feet. */
const LOG_READY_OFFSET_Y = 12;

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export class PlayScene extends Phaser.Scene {
  private jumpState: JumpState = createInitialJumpState(jumpConfig);
  private readonly inputLatch = new InputLatch();
  private accumulator = 0;
  private simulationTimeMs = 0;
  private penguin!: Phaser.GameObjects.Sprite;
  private hudText!: Phaser.GameObjects.Text;
  private leaderboardText!: Phaser.GameObjects.Text;
  private leaderboard: number[] = [];
  private scoreRecorded = false;
  private takeoffKeys: Phaser.Input.Keyboard.Key[] = [];
  private crouchKey: Phaser.Input.Keyboard.Key | null = null;
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
    this.load.image("snow-village", "/assets/sprites/snow-village.webp");
    this.load.image("igloo", "/assets/sprites/igloo-snow-block-dome.webp");
    this.load.image(
      "snowman",
      "/assets/sprites/snowman-carrot-nose-coal.webp",
    );
    this.load.image(
      "lantern-post",
      "/assets/sprites/lantern-post-snow-capped.webp",
    );
  }

  create(): void {
    this.drawWorld();
    this.registerPenguinFrames();
    this.penguin = this.createPenguin();
    const storage = browserStorage();
    this.leaderboard = storage === null ? [] : readLeaderboard(storage);
    this.hudText = this.createHud();
    this.leaderboardText = this.createLeaderboardHud();
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

    if (
      this.takeoffKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))
    ) {
      this.queuePress();
    }

    this.accumulator += Math.min(deltaMs / 1000, MAX_FRAME_DELTA);
    let steps = 0;

    while (
      this.accumulator + Number.EPSILON >= FIXED_STEP &&
      steps < MAX_CATCH_UP_STEPS
    ) {
      this.simulationTimeMs += FIXED_STEP * 1000;
      const command = canConsumePress(
        this.jumpState,
        jumpConfig.takeoffStartX,
      )
        ? this.inputLatch.consumeThrough(this.simulationTimeMs)
        : null;
      const previousPhase = this.jumpState.phase;
      const nextState = stepJump(
        this.jumpState,
        command,
        FIXED_STEP,
        jumpConfig,
        this.isCrouching(),
      );
      this.jumpState = nextState;
      if (
        (previousPhase === "ramp" && nextState.phase === "flight") ||
        nextState.phase === "crashed"
      ) {
        this.inputLatch.seal();
        if (previousPhase === "ramp" && nextState.phase === "flight") {
          this.takeoffPosePending = true;
        }
      }
      this.maybeRecordScore(nextState);
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

    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
    ]);

    this.takeoffKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
    ];
    this.crouchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
  }

  private isCrouching(): boolean {
    return (
      (this.jumpState.phase === "ramp" || this.jumpState.phase === "flight") &&
      this.crouchKey !== null &&
      this.crouchKey.isDown
    );
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
    scenery.moveTo(0, jumpConfig.readyY + LOG_READY_OFFSET_Y + 1);
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

    this.add
      .image(jumpConfig.readyX + 4, jumpConfig.readyY + LOG_READY_OFFSET_Y, "fallen-log")
      .setScale(LOG_SCALE)
      .setDepth(4);

    this.placeRunoutScenery();
  }

  private placeRunoutScenery(): void {
    const props = [
      { key: "snow-pile", x: 5150, scale: 0.32, sink: 20, depth: 2 },
      { key: "snow-pile", x: 5700, scale: 0.28, sink: 18, depth: 2 },
      { key: "igloo", x: 5400, scale: 0.42, sink: 48, depth: 3 },
      { key: "snowman", x: 6100, scale: 0.38, sink: 44, depth: 3 },
      { key: "lantern-post", x: 6450, scale: 0.4, sink: 52, depth: 3 },
      { key: "snow-village", x: 7000, scale: 0.55, sink: 58, depth: 3 },
      { key: "snow-pile", x: 7550, scale: 0.34, sink: 22, depth: 2 },
      { key: "snow-pile", x: 8000, scale: 0.3, sink: 18, depth: 2 },
    ] as const;

    for (const prop of props) {
      const surface = sampleLanding(prop.x, jumpConfig);
      this.add
        .image(prop.x, surface.y - prop.sink, prop.key)
        .setScale(prop.scale)
        .setDepth(prop.depth);
    }
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

  private maybeRecordScore(state: JumpState): void {
    if (this.scoreRecorded) {
      return;
    }
    const finished =
      state.phase === "resting" ||
      (state.phase === "crashed" && state.speed === 0);
    if (!finished) {
      return;
    }

    this.scoreRecorded = true;
    const storage = browserStorage();
    if (storage === null) {
      return;
    }
    const result = recordDistance(storage, state.distance);
    this.leaderboard = [...result.entries];
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

  private createLeaderboardHud(): Phaser.GameObjects.Text {
    return this.add
      .text(24, 20, formatLeaderboard(this.leaderboard), {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#0b4f73",
        align: "left",
        stroke: "#f4fbff",
        strokeThickness: 6,
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private layoutHud(): void {
    this.hudText.setPosition(this.cameras.main.width - 28, 22);
    this.leaderboardText.setPosition(24, 20);
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
    this.penguin.setScale(
      PENGUIN_SCALE,
      this.isCrouching()
        ? PENGUIN_SCALE * PENGUIN_CROUCH_SCALE_Y
        : PENGUIN_SCALE,
    );
    this.hudText.setText(formatJumpHud(jumpHudStats(state)));
    this.leaderboardText.setText(formatLeaderboard(this.leaderboard));
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
