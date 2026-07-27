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
const SNOW_SCROLL = 0.38;
const CLOUD_COUNT = 4;
const CLOUD_SCROLL_NEAR = 0.18;
const CLOUD_SCROLL_FAR = 0.1;

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
  private readonly clouds: Phaser.GameObjects.Image[] = [];

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
      "snow-packed",
      "/assets/sprites/snow-packed.webp",
    );
    this.load.image(
      "waterfall",
      "/assets/sprites/snow-covered-waterfall-mini.webp",
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
    this.load.image("cloud-solid", "/assets/sprites/cloud-solid.webp");
    this.load.image("cloud-thin", "/assets/sprites/cloud-thin.webp");
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
    this.createClouds();
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
    this.updateClouds(deltaMs);

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
    const endX = jumpConfig.landingRunoutEndX + 200;

    for (let x = 60; x < endX; x += 170) {
      const surfaceY = this.forestSurfaceY(x);
      const wave = (x * 13) % 70;
      this.add
        .image(x + (wave - 35) * 0.15, surfaceY - 250 - (x % 50), "winter-forest")
        .setScale(0.62 + ((x * 7) % 40) / 100)
        .setAlpha(0.72 + ((x * 3) % 20) / 100)
        .setDepth(-5);
    }

    for (let x = 130; x < endX; x += 210) {
      const surfaceY = this.forestSurfaceY(x);
      const wave = (x * 19) % 90;
      this.add
        .image(x + (wave - 45) * 0.2, surfaceY - 190 - (x % 40), "winter-forest")
        .setScale(0.52 + ((x * 11) % 35) / 100)
        .setAlpha(0.78 + ((x * 5) % 15) / 100)
        .setDepth(-4);
    }

    for (let x = 55; x < endX; x += 72) {
      if (x > jumpConfig.lipX - 30 && x < jumpConfig.landingStartX + 50) {
        continue;
      }
      const surfaceY = this.forestSurfaceY(x);
      const tall = x % 144 < 72;
      this.add
        .image(x + ((x * 9) % 24) - 12, surfaceY - (tall ? 78 : 62), "pine-tree")
        .setScale(tall ? 0.5 + ((x * 3) % 18) / 100 : 0.38 + ((x * 5) % 14) / 100)
        .setAlpha(0.88 + ((x * 2) % 10) / 100)
        .setDepth(tall ? -1 : -2);
    }

    for (let x = 90; x < endX; x += 140) {
      if (x > jumpConfig.lipX - 20 && x < jumpConfig.landingStartX + 40) {
        continue;
      }
      const surfaceY = this.forestSurfaceY(x);
      this.add
        .image(x + ((x * 5) % 20) - 10, surfaceY - 26, "snow-packed")
        .setScale(0.26 + ((x * 7) % 16) / 100)
        .setAlpha(0.84 + ((x * 3) % 12) / 100)
        .setDepth(-3);
    }
  }

  private forestSurfaceY(x: number): number {
    if (x <= jumpConfig.lipX) {
      return sampleRamp(Math.min(Math.max(x, jumpConfig.startX), jumpConfig.lipX), jumpConfig).y;
    }
    if (x < jumpConfig.landingStartX) {
      const lip = sampleRamp(jumpConfig.lipX, jumpConfig).y;
      const land = sampleLanding(jumpConfig.landingStartX, jumpConfig).y;
      const t =
        (x - jumpConfig.lipX) /
        Math.max(1, jumpConfig.landingStartX - jumpConfig.lipX);
      return lip + (land - lip) * t;
    }
    return sampleLanding(x, jumpConfig).y;
  }

  private placeJumpGapScenery(): void {
    const gapCenterX =
      (jumpConfig.lipX + jumpConfig.landingStartX) / 2;
    const lip = sampleRamp(jumpConfig.lipX, jumpConfig);

    this.add
      .image(gapCenterX, lip.y + 260, "waterfall")
      .setScale(1.35)
      .setAlpha(0.96)
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
    const spanX = Math.max(1600, jumpConfig.landingCrestX + 600);
    const skyTop = jumpConfig.readyY - 90;
    const skyBottom = jumpConfig.lipY - 40;

    for (let index = 0; index < SNOWFLAKE_COUNT; index += 1) {
      const useCrystal = index % 3 !== 0;
      const flake = this.add
        .image(
          Math.random() * spanX,
          skyTop + Math.random() * (skyBottom - skyTop),
          useCrystal ? "snow-crystal" : "snow-flakes",
        )
        .setScrollFactor(SNOW_SCROLL)
        .setDepth(5)
        .setAlpha(0.28 + Math.random() * 0.32)
        .setScale(
          useCrystal
            ? 0.1 + Math.random() * 0.12
            : 0.028 + Math.random() * 0.03,
        );
      flake.setData("vx", -16 + Math.random() * 32);
      flake.setData("vy", 38 + Math.random() * 42);
      const spinDir = Math.random() < 0.5 ? -1 : 1;
      flake.setData("spin", spinDir * (2.2 + Math.random() * 3.4));
      this.snowflakes.push(flake);
    }
  }

  private updateSnowfall(deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const cam = this.cameras.main;
    const recycleTop = cam.scrollY - 80;
    const recycleBottom = cam.scrollY + cam.height / SNOW_SCROLL + 60;
    const recycleLeft = cam.scrollX - 80;
    const recycleWidth = cam.width / SNOW_SCROLL + 160;

    for (const flake of this.snowflakes) {
      flake.x += (flake.getData("vx") as number) * dt;
      flake.y += (flake.getData("vy") as number) * dt;
      flake.rotation += (flake.getData("spin") as number) * dt;

      if (flake.y > recycleBottom) {
        flake.y = recycleTop - Math.random() * 40;
        flake.x = recycleLeft + Math.random() * recycleWidth;
      } else if (flake.x < recycleLeft) {
        flake.x = recycleLeft + recycleWidth;
      } else if (flake.x > recycleLeft + recycleWidth) {
        flake.x = recycleLeft;
      }
    }
  }

  private createClouds(): void {
    const skyTop = jumpConfig.readyY - 70;
    const skyBottom = jumpConfig.readyY - 8;
    const span = Math.max(1200, jumpConfig.landingCrestX + 800);
    const scales = [0.22, 0.55, 0.9, 0.35];

    for (let index = 0; index < CLOUD_COUNT; index += 1) {
      const solid = index % 2 === 0;
      const far = index === 0 || index === 2;
      const baseY = skyTop + Math.random() * (skyBottom - skyTop);
      const scale = scales[index]! + (Math.random() * 0.12 - 0.06);
      const cloud = this.add
        .image(
          (index + 0.4) * (span / CLOUD_COUNT) + (Math.random() * 180 - 90),
          baseY,
          solid ? "cloud-solid" : "cloud-thin",
        )
        .setScrollFactor(far ? CLOUD_SCROLL_FAR : CLOUD_SCROLL_NEAR)
        .setDepth(far ? -7 : -6)
        .setAlpha(far ? 0.38 + Math.random() * 0.18 : 0.48 + Math.random() * 0.22)
        .setScale(Math.max(0.18, scale));
      const drift = (2 + Math.random() * 3.5) * (Math.random() < 0.5 ? -1 : 1);
      cloud.setData("vx", drift);
      cloud.setData("bob", 0.35 + Math.random() * 0.55);
      cloud.setData("phase", Math.random() * Math.PI * 2);
      cloud.setData("baseY", baseY);
      this.clouds.push(cloud);
    }
  }

  private updateClouds(deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;

    for (const cloud of this.clouds) {
      const phase =
        ((cloud.getData("phase") as number) + dt * 0.18) % (Math.PI * 2);
      cloud.setData("phase", phase);
      cloud.x += (cloud.getData("vx") as number) * dt;
      cloud.y =
        (cloud.getData("baseY") as number) +
        Math.sin(phase) * (cloud.getData("bob") as number);
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
