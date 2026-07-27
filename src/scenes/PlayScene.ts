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
import { formatAirtimeHud, formatDistanceHud, jumpHudStats } from "../game/hudStats";
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
const SNOWFLAKE_COUNT = 26;

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
  private distanceText!: Phaser.GameObjects.Text;
  private airtimeText!: Phaser.GameObjects.Text;
  private leaderboardText!: Phaser.GameObjects.Text;
  private leaderboard: number[] = [];
  private scoreRecorded = false;
  private takeoffKeys: Phaser.Input.Keyboard.Key[] = [];
  private crouchKey: Phaser.Input.Keyboard.Key | null = null;
  private resetKey: Phaser.Input.Keyboard.Key | null = null;
  private pauseKey: Phaser.Input.Keyboard.Key | null = null;
  private paused = false;
  private pauseText!: Phaser.GameObjects.Text;
  private takeoffPosePending = false;
  private readonly snowflakes: Phaser.GameObjects.Image[] = [];

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
    this.load.image(
      "pine-tree",
      "/assets/sprites/pine-tree-snow-heavy.webp",
    );
    this.load.image(
      "birch-tree",
      "/assets/sprites/birch-tree-white.webp",
    );
    this.load.image("dead-tree", "/assets/sprites/dead-tree.webp");
    this.load.image(
      "twisted-dead-tree",
      "/assets/sprites/twisted-dead-tree.webp",
    );
    this.load.image(
      "snow-stump",
      "/assets/sprites/snow-covered-tree-stump.webp",
    );
    this.load.image(
      "waterfall",
      "/assets/sprites/snow-covered-waterfall-mini.webp",
    );
    this.load.image(
      "hot-spring",
      "/assets/sprites/snow-covered-hot-spring.webp",
    );
    this.load.image(
      "geyser",
      "/assets/sprites/snow-covered-geyser.webp",
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
    this.load.image(
      "snow-crystal",
      "/assets/sprites/snow-ice-crystal.png",
    );
    this.load.image(
      "snow-flakes",
      "/assets/sprites/snow-fall-flakes.webp",
    );
  }

  create(): void {
    this.drawWorld();
    this.registerPenguinFrames();
    this.penguin = this.createPenguin();
    const storage = browserStorage();
    this.leaderboard = storage === null ? [] : readLeaderboard(storage);
    this.distanceText = this.createDistanceHud();
    this.airtimeText = this.createAirtimeHud();
    this.leaderboardText = this.createLeaderboardHud();
    this.pauseText = this.createPauseHud();
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
    this.createSnowfall();
    this.renderSnapshot();
  }

  update(time: number, deltaMs: number): void {
    if (this.simulationTimeMs === 0) {
      this.simulationTimeMs = time;
    }

    if (this.pauseKey !== null && Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.setPaused(!this.paused);
    }

    if (this.resetKey !== null && Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      this.resetRun();
    }

    if (this.paused) {
      return;
    }

    if (
      this.takeoffKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))
    ) {
      this.queuePress();
    }

    this.updateSnowfall(deltaMs);

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
      this.maybeRecordScore(previousPhase, nextState);
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
      if (!this.paused) {
        this.queuePress();
      }
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
      Phaser.Input.Keyboard.KeyCodes.R,
      Phaser.Input.Keyboard.KeyCodes.P,
    ]);

    this.takeoffKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
    ];
    this.crouchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.resetKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.pauseKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.pauseText.setVisible(paused);
    if (paused) {
      this.accumulator = 0;
    }
  }

  private resetRun(): void {
    this.setPaused(false);
    this.jumpState = createInitialJumpState(jumpConfig);
    this.inputLatch.reset();
    this.accumulator = 0;
    this.scoreRecorded = false;
    this.takeoffPosePending = false;
    this.penguin.setRotation(0);
    this.cameras.main.centerOn(this.jumpState.x + 180, this.jumpState.y + 80);
    this.renderSnapshot();
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

    this.placeBackgroundTrees();
    this.placeJumpGapScenery();

    const scenery = this.add.graphics();
    scenery.setDepth(0);
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

  private placeBackgroundTrees(): void {
    this.add
      .image(220, 200, "winter-forest")
      .setScale(0.82)
      .setAlpha(0.9)
      .setDepth(-4);
    this.add
      .image(520, 255, "winter-forest")
      .setScale(0.7)
      .setAlpha(0.82)
      .setDepth(-4);
    this.add
      .image(820, 310, "winter-forest")
      .setScale(0.64)
      .setAlpha(0.78)
      .setDepth(-4);

    const trees = [
      { key: "pine-tree", x: 40, scale: 0.55, sink: 70, alpha: 0.92, depth: -2 },
      { key: "birch-tree", x: 110, scale: 0.42, sink: 58, alpha: 0.88, depth: -2 },
      { key: "pine-tree", x: 175, scale: 0.62, sink: 78, alpha: 0.95, depth: -1 },
      { key: "dead-tree", x: 250, scale: 0.4, sink: 55, alpha: 0.85, depth: -2 },
      { key: "pine-tree", x: 320, scale: 0.48, sink: 64, alpha: 0.9, depth: -2 },
      { key: "birch-tree", x: 390, scale: 0.5, sink: 66, alpha: 0.9, depth: -1 },
      { key: "pine-tree", x: 455, scale: 0.58, sink: 74, alpha: 0.93, depth: -1 },
      { key: "twisted-dead-tree", x: 520, scale: 0.38, sink: 52, alpha: 0.84, depth: -2 },
      { key: "pine-tree", x: 580, scale: 0.45, sink: 62, alpha: 0.9, depth: -2 },
      { key: "birch-tree", x: 640, scale: 0.36, sink: 50, alpha: 0.86, depth: -2 },
      { key: "pine-tree", x: 700, scale: 0.52, sink: 70, alpha: 0.92, depth: -1 },
      { key: "dead-tree", x: 755, scale: 0.34, sink: 48, alpha: 0.82, depth: -2 },
      { key: "pine-tree", x: 810, scale: 0.4, sink: 56, alpha: 0.88, depth: -2 },
      { key: "snow-stump", x: 860, scale: 0.28, sink: 22, alpha: 0.9, depth: -1 },
      { key: "pine-tree", x: 900, scale: 0.46, sink: 64, alpha: 0.9, depth: -1 },
    ] as const;

    for (const tree of trees) {
      const x = Math.min(tree.x, jumpConfig.lipX);
      const surface = sampleRamp(x, jumpConfig);
      this.add
        .image(tree.x, surface.y - tree.sink, tree.key)
        .setScale(tree.scale)
        .setAlpha(tree.alpha)
        .setDepth(tree.depth);
    }
  }

  private placeJumpGapScenery(): void {
    const gapCenterX =
      (jumpConfig.lipX + jumpConfig.landingStartX) / 2;
    const lip = sampleRamp(jumpConfig.lipX, jumpConfig);

    this.add
      .image(gapCenterX - 8, lip.y + 95, "waterfall")
      .setScale(0.72)
      .setAlpha(0.95)
      .setDepth(1);
    this.add
      .image(gapCenterX + 28, lip.y + 210, "waterfall")
      .setScale(0.48)
      .setAlpha(0.85)
      .setDepth(1);
    this.add
      .image(gapCenterX - 18, lip.y + 320, "hot-spring")
      .setScale(0.42)
      .setAlpha(0.92)
      .setDepth(1);
    this.add
      .image(gapCenterX + 22, lip.y + 430, "geyser")
      .setScale(0.38)
      .setAlpha(0.9)
      .setDepth(1);
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

  private maybeRecordScore(
    previousPhase: JumpState["phase"],
    state: JumpState,
  ): void {
    if (this.scoreRecorded || previousPhase !== "flight") {
      return;
    }
    if (state.phase !== "slide" && state.phase !== "crashed") {
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

  private createSnowfall(): void {
    const width = Math.max(1, this.cameras.main.width);
    const height = Math.max(1, this.cameras.main.height);

    for (let index = 0; index < SNOWFLAKE_COUNT; index += 1) {
      const useCrystal = index % 3 !== 0;
      const flake = this.add
        .image(
          Math.random() * width,
          Math.random() * height,
          useCrystal ? "snow-crystal" : "snow-flakes",
        )
        .setScrollFactor(0)
        .setDepth(50)
        .setAlpha(0.28 + Math.random() * 0.32)
        .setScale(
          useCrystal
            ? 0.1 + Math.random() * 0.12
            : 0.028 + Math.random() * 0.03,
        );
      flake.setData("vx", -12 + Math.random() * 24);
      flake.setData("vy", 16 + Math.random() * 26);
      flake.setData("spin", (-0.5 + Math.random()) * 0.9);
      this.snowflakes.push(flake);
    }
  }

  private updateSnowfall(deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const width = Math.max(1, this.cameras.main.width);
    const height = Math.max(1, this.cameras.main.height);

    for (const flake of this.snowflakes) {
      flake.x += (flake.getData("vx") as number) * dt;
      flake.y += (flake.getData("vy") as number) * dt;
      flake.rotation += (flake.getData("spin") as number) * dt;

      if (flake.y > height + 12) {
        flake.y = -12;
        flake.x = Math.random() * width;
      } else if (flake.x < -12) {
        flake.x = width + 12;
      } else if (flake.x > width + 12) {
        flake.x = -12;
      }
    }
  }

  private createDistanceHud(): Phaser.GameObjects.Text {
    return this.add
      .text(0, 18, "", {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: "52px",
        fontStyle: "bold",
        color: "#0b4f73",
        align: "center",
        stroke: "#f4fbff",
        strokeThickness: 10,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private createAirtimeHud(): Phaser.GameObjects.Text {
    return this.add
      .text(0, 78, "", {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: "28px",
        fontStyle: "bold",
        color: "#0b4f73",
        align: "center",
        stroke: "#f4fbff",
        strokeThickness: 7,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private createLeaderboardHud(): Phaser.GameObjects.Text {
    return this.add
      .text(0, 18, formatLeaderboard(this.leaderboard), {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#0b4f73",
        align: "right",
        stroke: "#f4fbff",
        strokeThickness: 6,
        lineSpacing: 4,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private createPauseHud(): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, "Pause", {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: "64px",
        fontStyle: "bold",
        color: "#0b4f73",
        align: "center",
        stroke: "#f4fbff",
        strokeThickness: 12,
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(120)
      .setVisible(false);
  }

  private layoutHud(): void {
    const centerX = this.cameras.main.width * 0.5;
    const centerY = this.cameras.main.height * 0.5;
    const right = this.cameras.main.width - 28;
    this.distanceText.setPosition(centerX, 18);
    this.airtimeText.setPosition(centerX, 78);
    this.leaderboardText.setPosition(right, 18);
    this.pauseText.setPosition(centerX, centerY);
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
    const stats = jumpHudStats(state);
    this.distanceText.setText(formatDistanceHud(stats));
    this.airtimeText.setText(formatAirtimeHud(stats));
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
