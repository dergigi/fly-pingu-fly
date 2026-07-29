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
import {
  createFreeRoamState,
  freeRoamDefaults,
  poseForFreeRoam,
  setFreeRoamFacing,
  stepFreeRoam,
  tryFreeRoamJump,
  type FreeRoamState,
} from "../game/freeRoam";
import {
  createIdleRespawnState,
  idleRespawnDefaults,
  stepIdleRespawn,
  type IdleRespawnState,
} from "../game/idleRespawn";
import { formatDistanceHud, jumpHudStats, worldDistanceToMeters } from "../game/hudStats";
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
const SNOWFLAKE_COUNT = 52;
const SNOW_SCALE_MIN = 0.03;
const SNOW_SCALE_SPAN = 0.07;
const CLOUD_COUNT = 4;
const CLOUD_SCROLL_NEAR = 0.18;
const CLOUD_SCROLL_FAR = 0.1;
/** Ice spire planted on the late runout slope; penguin stops just before it. */
const WATCHTOWER_X = jumpConfig.landingRunoutEndX - 120;
const WATCHTOWER_STOP_X = WATCHTOWER_X - 56;
const WATCHTOWER_ORIGIN_Y = 230 / 256;
const WATCHTOWER_SCALE = 0.92;
const WATCHTOWER_SINK = 28;
const WATCHTOWER_DEPTH = 12;
/** Language-free idle countdown ring above the penguin head (~26px diameter). */
const IDLE_RING_RADIUS = 13;
const IDLE_RING_LINE = 4;
const IDLE_RING_DEPTH = 40;
/** World offset from contact pivot to ring center (above ready-pose head). */
const IDLE_RING_OFFSET_Y =
  PENGUIN_FRAMES.ready.contactY * PENGUIN_SCALE + IDLE_RING_RADIUS + 24;

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
  private leaderboardText!: Phaser.GameObjects.Text;
  private leaderboard: number[] = [];
  private scoreRecorded = false;
  private takeoffKeys: Phaser.Input.Keyboard.Key[] = [];
  private leftKeys: Phaser.Input.Keyboard.Key[] = [];
  private rightKeys: Phaser.Input.Keyboard.Key[] = [];
  private crouchKey: Phaser.Input.Keyboard.Key | null = null;
  private resetKey: Phaser.Input.Keyboard.Key | null = null;
  private pauseKey: Phaser.Input.Keyboard.Key | null = null;
  private escapeKey: Phaser.Input.Keyboard.Key | null = null;
  private paused = false;
  private pauseBackdrop!: Phaser.GameObjects.Rectangle;
  private pauseTitle!: Phaser.GameObjects.Text;
  private pauseHint!: Phaser.GameObjects.Text;
  private takeoffPosePending = false;
  private roam: FreeRoamState | null = null;
  private idleRespawn: IdleRespawnState | null = null;
  private idleRing!: Phaser.GameObjects.Graphics;
  private readonly snowflakes: Phaser.GameObjects.Image[] = [];
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly fogWisps: Array<{
    image: Phaser.GameObjects.Image;
    baseX: number;
    baseY: number;
    phase: number;
    drift: number;
    bob: number;
    range: number;
    baseAlpha: number;
  }> = [];

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
      "geyser",
      "/assets/sprites/snow-covered-geyser.webp",
    );
    this.load.image("snow-pile", "/assets/sprites/snow-pile.webp");
    this.load.image(
      "fallen-log",
      "/assets/sprites/snow-covered-fallen-log.webp",
    );
    this.load.image("snow-village", "/assets/sprites/snow-village.webp");
    this.load.image(
      "snow-storage",
      "/assets/sprites/snow-walled-storage.webp",
    );
    this.load.image(
      "wood-pile",
      "/assets/sprites/wood-pile-snow-capped.webp",
    );
    this.load.image(
      "rock-cluster",
      "/assets/sprites/snow-covered-rock-cluster.webp",
    );
    this.load.image(
      "watchtower",
      "/assets/sprites/ice-watchtower-spire.webp",
    );
    this.load.image(
      "snowman",
      "/assets/sprites/snowman-carrot-nose-coal.webp",
    );
    this.load.image("village-flag", "/assets/sprites/village-flag.png");
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
    this.leaderboardText = this.createLeaderboardHud();
    this.createPauseMenu();
    this.idleRing = this.add.graphics().setDepth(IDLE_RING_DEPTH);
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
    this.cameras.main.fadeIn(280, 142, 216, 248);
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

    if (
      (this.pauseKey !== null && Phaser.Input.Keyboard.JustDown(this.pauseKey)) ||
      (this.escapeKey !== null && Phaser.Input.Keyboard.JustDown(this.escapeKey))
    ) {
      this.setPaused(!this.paused);
    }

    if (this.resetKey !== null && Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      this.resetRun();
    }

    if (this.paused) {
      return;
    }

    this.updateSnowfall(deltaMs);
    this.updateClouds(deltaMs);
    this.updateRampFog(deltaMs);

    if (this.roam !== null || this.shouldBeginFreeRoam()) {
      this.updateFreeRoam(deltaMs);
      this.renderSnapshot();
      return;
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
      this.maybeRecordScore(previousPhase, nextState);
      this.jumpState = this.clampAgainstWatchtower(this.jumpState);
      this.accumulator -= FIXED_STEP;
      steps += 1;
    }

    if (steps === MAX_CATCH_UP_STEPS) {
      this.accumulator = Math.min(this.accumulator, FIXED_STEP);
    }

    if (this.shouldBeginFreeRoam()) {
      this.beginFreeRoam();
    }

    this.renderSnapshot();
  }

  private bindInput(): void {
    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.style.outline = "none";

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.game.canvas.focus();
      if (this.paused) {
        this.setPaused(false);
        return;
      }
      if (this.roam !== null) {
        const x = pointer.x;
        const w = this.cameras.main.width;
        if (x < w * 0.33) {
          this.roam = setFreeRoamFacing(this.roam, -1);
        } else if (x > w * 0.66) {
          this.roam = setFreeRoamFacing(this.roam, 1);
        } else {
          this.roam = tryFreeRoamJump(this.roam, freeRoamDefaults);
        }
        return;
      }
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
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.R,
      Phaser.Input.Keyboard.KeyCodes.P,
      Phaser.Input.Keyboard.KeyCodes.ESC,
    ]);

    this.takeoffKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
    ];
    this.leftKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    ];
    this.rightKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    ];
    this.crouchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.resetKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.pauseKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.pauseBackdrop.setVisible(paused);
    this.pauseTitle.setVisible(paused);
    this.pauseHint.setVisible(paused);
    if (paused) {
      this.accumulator = 0;
    }
  }

  private resetRun(): void {
    this.setPaused(false);
    this.jumpState = createInitialJumpState(jumpConfig);
    this.roam = null;
    this.idleRespawn = null;
    this.clearIdleRing();
    this.inputLatch.reset();
    this.accumulator = 0;
    this.scoreRecorded = false;
    this.takeoffPosePending = false;
    this.penguin.setRotation(0);
    this.penguin.setFlipX(true);
    this.cameras.main.centerOn(this.jumpState.x + 180, this.jumpState.y + 80);
    this.renderSnapshot();
  }

  private shouldBeginFreeRoam(): boolean {
    if (this.roam !== null) {
      return false;
    }
    const { phase, speed } = this.jumpState;
    return phase === "resting" || (phase === "crashed" && speed <= jumpConfig.stopSpeed);
  }

  private beginFreeRoam(): void {
    const facing: 1 | -1 = this.jumpState.vx >= 0 ? 1 : -1;
    this.roam = createFreeRoamState(
      this.jumpState.x,
      this.jumpState.y,
      facing,
    );
    this.idleRespawn = createIdleRespawnState(this.roam.x, this.roam.y);
    this.clearIdleRing();
  }

  private updateFreeRoam(deltaMs: number): void {
    if (this.roam === null) {
      if (this.shouldBeginFreeRoam()) {
        this.beginFreeRoam();
      }
      if (this.roam === null) {
        return;
      }
    }

    if (this.leftKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.roam = setFreeRoamFacing(this.roam, -1);
    }
    if (this.rightKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.roam = setFreeRoamFacing(this.roam, 1);
    }
    if (this.takeoffKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.roam = tryFreeRoamJump(
        this.roam,
        freeRoamDefaults,
        this.isCrouching(),
      );
    }

    const dt = Math.min(deltaMs, 50) / 1000;
    this.roam = stepFreeRoam(
      this.roam,
      dt,
      {
        ...freeRoamDefaults,
        minX: jumpConfig.startX,
        maxX: WATCHTOWER_STOP_X,
      },
      (x) => this.worldSurface(x),
      this.isCrouching(),
    );

    if (this.idleRespawn === null) {
      this.idleRespawn = createIdleRespawnState(this.roam.x, this.roam.y);
    }

    const idleResult = stepIdleRespawn(
      this.idleRespawn,
      {
        eligible: true,
        grounded: this.roam.grounded,
        speed: Math.hypot(this.roam.vx, this.roam.vy),
        x: this.roam.x,
        y: this.roam.y,
      },
      Math.min(deltaMs, 50),
      idleRespawnDefaults,
    );
    this.idleRespawn = idleResult.state;
    this.drawIdleRing(this.roam.x, this.roam.y, idleResult.warnProgress);
    if (idleResult.shouldRespawn) {
      this.resetRun();
    }
  }

  private clearIdleRing(): void {
    if (this.idleRing !== undefined) {
      this.idleRing.clear();
    }
  }

  private drawIdleRing(x: number, y: number, warnProgress: number): void {
    this.idleRing.clear();
    if (warnProgress <= 0) {
      return;
    }
    const cx = x;
    const cy = y - IDLE_RING_OFFSET_Y;
    const start = -Math.PI / 2;
    const end = start + warnProgress * Math.PI * 2;

    // Soft track against snow, then blue pie + stroke filling 0→1.
    this.idleRing.lineStyle(IDLE_RING_LINE, 0x2c5f7a, 0.28);
    this.idleRing.beginPath();
    this.idleRing.arc(cx, cy, IDLE_RING_RADIUS, 0, Math.PI * 2, false);
    this.idleRing.strokePath();

    this.idleRing.fillStyle(0x4eb4e8, 0.55);
    this.idleRing.beginPath();
    this.idleRing.moveTo(cx, cy);
    this.idleRing.arc(cx, cy, IDLE_RING_RADIUS - IDLE_RING_LINE * 0.35, start, end, false);
    this.idleRing.closePath();
    this.idleRing.fillPath();

    this.idleRing.lineStyle(IDLE_RING_LINE, 0x1a7fb8, 1);
    this.idleRing.beginPath();
    this.idleRing.arc(cx, cy, IDLE_RING_RADIUS, start, end, false);
    this.idleRing.strokePath();
  }

  private clampAgainstWatchtower(state: JumpState): JumpState {
    if (
      (state.phase !== "slide" && state.phase !== "crashed") ||
      state.x < WATCHTOWER_STOP_X
    ) {
      return state;
    }

    const surface = sampleLanding(WATCHTOWER_STOP_X, jumpConfig);
    if (state.phase === "crashed") {
      return {
        ...state,
        x: WATCHTOWER_STOP_X,
        y: surface.y,
        vx: 0,
        vy: 0,
        speed: 0,
      };
    }

    return {
      ...state,
      phase: "resting",
      x: WATCHTOWER_STOP_X,
      y: surface.y,
      vx: 0,
      vy: 0,
      speed: 0,
    };
  }

  private worldSurface(x: number): { y: number; slope: number } {
    if (x <= jumpConfig.lipX) {
      return sampleRamp(
        Math.min(Math.max(x, jumpConfig.startX), jumpConfig.lipX),
        jumpConfig,
      );
    }
    if (x < jumpConfig.landingStartX) {
      const lip = sampleRamp(jumpConfig.lipX, jumpConfig);
      const land = sampleLanding(jumpConfig.landingStartX, jumpConfig);
      const t =
        (x - jumpConfig.lipX) /
        Math.max(1, jumpConfig.landingStartX - jumpConfig.lipX);
      return {
        y: lip.y + (land.y - lip.y) * t,
        slope: lip.slope + (land.slope - lip.slope) * t,
      };
    }
    return sampleLanding(x, jumpConfig);
  }

  private isCrouching(): boolean {
    return (
      (this.jumpState.phase === "ramp" ||
        this.jumpState.phase === "flight" ||
        this.jumpState.phase === "slide" ||
        this.roam !== null) &&
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
    this.placeRampFog();
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
    this.placeWatchtowerStop();
    this.placeFarLandingFlag();
  }

  private placeRampFog(): void {
    this.ensureFogTexture();

    const points = [
      { x: jumpConfig.readyX, y: jumpConfig.readyY },
      { x: jumpConfig.startX, y: jumpConfig.startY },
      ...sampleRampCurve(jumpConfig, 6),
    ];

    for (const point of points) {
      if (point.x > jumpConfig.lipX) {
        continue;
      }
      const dropT = Math.min(
        1,
        Math.max(
          0,
          (point.y - jumpConfig.startY) /
            Math.max(1, jumpConfig.lipY - jumpConfig.startY),
        ),
      );
      // Keep mist a bit lighter at the deepest part of the inrun, not bare.
      const density = 1 - dropT * 0.42;
      const layers = dropT > 0.75 ? 1 : 2;
      for (let layer = 0; layer < layers; layer += 1) {
        const n = this.forestNoise(point.x + layer * 37, 9 + layer);
        const baseX = point.x + (n - 0.5) * 40;
        const baseY = point.y - (18 + layer * 10 + n * 10);
        const baseAlpha = (0.1 + n * 0.08) * density;
        const image = this.add
          .image(baseX, baseY, "ramp-fog-wisp")
          .setDepth(6)
          .setAlpha(baseAlpha)
          .setScale((0.7 + n * 0.55 + layer * 0.15) * (0.75 + 0.25 * density));
        this.fogWisps.push({
          image,
          baseX,
          baseY,
          phase: n * Math.PI * 2,
          drift: (14 + n * 16) * (layer === 0 ? 1 : -1),
          bob: 6 + n * 8,
          range: 28 + n * 30,
          baseAlpha,
        });
      }
    }
  }

  private ensureFogTexture(): void {
    if (this.textures.exists("ramp-fog-wisp")) {
      return;
    }
    const graphics = this.make.graphics({ x: 0, y: 0 });
    for (let ring = 6; ring >= 1; ring -= 1) {
      graphics.fillStyle(0xffffff, 0.045 * ring);
      graphics.fillEllipse(80, 48, 22 * ring, 13 * ring);
    }
    graphics.generateTexture("ramp-fog-wisp", 160, 96);
    graphics.destroy();
  }

  private updateRampFog(deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    for (const wisp of this.fogWisps) {
      wisp.phase = (wisp.phase + dt * 0.7) % (Math.PI * 2);
      wisp.image.x =
        wisp.baseX +
        Math.sin(wisp.phase) * wisp.range +
        wisp.drift * Math.sin(wisp.phase * 0.55);
      wisp.image.y = wisp.baseY + Math.cos(wisp.phase * 0.9) * wisp.bob;
      wisp.image.setAlpha(
        wisp.baseAlpha * (0.75 + 0.25 * Math.sin(wisp.phase * 1.4)),
      );
    }
  }

  private placeBackgroundTrees(): void {
    // Stop short of the far-landing mark so that stretch stays open.
    const hillEndX = jumpConfig.landingEndX - 750;
    const canopyFloorY = jumpConfig.startY + 8;

    let forestX = 30;
    while (forestX < hillEndX) {
      // Leave the jump gap clear; fill everywhere else densely.
      if (forestX > jumpConfig.lipX - 50 && forestX < jumpConfig.landingStartX + 40) {
        forestX = jumpConfig.landingStartX + 40;
        continue;
      }

      const n = this.forestNoise(forestX, 1);
      this.plantWinterForest(
        forestX + (n - 0.5) * 18,
        0.42 + n * 0.48,
        0.76 + n * 0.18,
        n > 0.5 ? -4 : -5,
        28 + n * 24,
        canopyFloorY,
      );
      const n2 = this.forestNoise(forestX, 7);
      this.plantWinterForest(
        forestX + 36 + (n2 - 0.5) * 22,
        0.34 + n2 * 0.4,
        0.72 + n2 * 0.16,
        -4,
        22 + n2 * 20,
        canopyFloorY,
      );
      const n3 = this.forestNoise(forestX, 11);
      if (n3 > 0.28) {
        this.plantWinterForest(
          forestX + 18 + (n3 - 0.5) * 16,
          0.28 + n3 * 0.36,
          0.7 + n3 * 0.14,
          -5,
          34 + n3 * 18,
          canopyFloorY,
        );
      }
      forestX += 28 + Math.floor(n * 34);
    }

    // Singular pines on the late landing hill, sunk into the snow as foreground.
    const runoutPines = [
      { x: hillEndX + 180, scale: 0.78, sink: 155 },
      { x: hillEndX + 380, scale: 0.72, sink: 148 },
      { x: hillEndX + 580, scale: 0.82, sink: 162 },
    ] as const;
    const pineOriginY = 233 / 256;
    for (const pine of runoutPines) {
      const n = this.forestNoise(pine.x, 2);
      const surfaceY = this.forestSurfaceY(pine.x);
      this.add
        .image(pine.x + (n - 0.5) * 12, surfaceY + pine.sink, "pine-tree")
        .setOrigin(0.5, pineOriginY)
        .setScale(pine.scale)
        .setFlipX(n > 0.5)
        .setAlpha(0.94)
        .setDepth(15);
    }

    const bankX = [hillEndX + 260] as const;
    for (const x of bankX) {
      const n = this.forestNoise(x, 5);
      const surfaceY = this.forestSurfaceY(x);
      this.add
        .image(x, surfaceY + 40, "snow-packed")
        .setOrigin(0.5, 206 / 256)
        .setScale(0.32 + n * 0.12)
        .setAlpha(0.88)
        .setDepth(12);
    }
  }

  /**
   * Plant a winter-forest strip with its base under the highest ramp point
   * across the sprite width, so curved slopes do not leave floating snow pads.
   */
  private plantWinterForest(
    x: number,
    scale: number,
    alpha: number,
    depth: number,
    sink: number,
    canopyFloorY: number,
  ): void {
    const halfW = 128 * scale * 0.9;
    // Lift the treeline a little behind the inrun and early landing hill.
    const lift =
      x <= jumpConfig.lipX || x < jumpConfig.landingCrestX + 120 ? 22 : 0;
    const baseY =
      Math.max(
        this.forestSurfaceY(x - halfW),
        this.forestSurfaceY(x),
        this.forestSurfaceY(x + halfW),
      ) +
      sink -
      lift;
    if (baseY - 256 * scale < canopyFloorY) {
      return;
    }
    this.add
      .image(x, baseY, "winter-forest")
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setAlpha(alpha)
      .setDepth(depth);
  }

  /** Deterministic 0..1 noise from world x and a salt. */
  private forestNoise(x: number, salt: number): number {
    const n = Math.sin(x * 0.017 + salt * 12.9898) * 43758.5453;
    return n - Math.floor(n);
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
    const lip = sampleRamp(jumpConfig.lipX, jumpConfig);
    const land = sampleLanding(jumpConfig.landingStartX, jumpConfig);
    const rampCeiling = Math.min(lip.y, land.y) + 12;
    const tipX = (jumpConfig.lipX + jumpConfig.landingStartX) / 2;
    const tipY = rampCeiling + 90;
    const baseY = WORLD_HEIGHT + 20;
    const tipHalfW = 28;
    const baseHalfW = 560;

    const plant = (
      x: number,
      y: number,
      key: "rock-cluster" | "geyser",
      scale: number,
      depth: number,
      flipX = false,
    ): void => {
      const base = Math.max(y, rampCeiling + 256 * scale);
      this.add
        .image(x, base, key)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setFlipX(flipX)
        .setDepth(depth);
    };

    // Single brown tip; everything else is dark rock in a pyramid silhouette.
    plant(tipX, tipY + 8, "geyser", 1.08, 3);

    let i = 0;
    for (let y = tipY + 60; y <= baseY; y += 44) {
      const t = (y - tipY) / Math.max(1, baseY - tipY);
      // Linear widen so the outline reads as a pyramid.
      const halfW = tipHalfW + (baseHalfW - tipHalfW) * t;
      const step = 48 + Math.floor(t * 10);
      for (let x = tipX - halfW; x <= tipX + halfW; x += step) {
        const n = this.forestNoise(x * 2 + y, 20 + (i % 9));
        if (n < 0.14 + t * 0.04) {
          i += 1;
          continue;
        }
        plant(
          x + (n - 0.5) * 14,
          y + (this.forestNoise(y, 21 + (i % 5)) - 0.5) * 16,
          "rock-cluster",
          0.5 + n * 0.45 + t * 0.25,
          n > 0.55 ? 2 : 1,
          n > 0.5,
        );
        i += 1;
      }
    }

    const anchors = [
      { x: tipX - 40, y: tipY + 180, scale: 0.95, depth: 2 },
      { x: tipX + 45, y: tipY + 210, scale: 1.0, depth: 2 },
      { x: tipX - 90, y: tipY + 380, scale: 1.15, depth: 2 },
      { x: tipX + 20, y: tipY + 420, scale: 1.2, depth: 3 },
      { x: tipX + 100, y: tipY + 460, scale: 1.1, depth: 2 },
      { x: tipX - 160, y: tipY + 620, scale: 1.25, depth: 2 },
      { x: tipX + 40, y: tipY + 660, scale: 1.3, depth: 3 },
      { x: tipX + 180, y: tipY + 700, scale: 1.15, depth: 2 },
      { x: tipX - 260, y: baseY - 100, scale: 1.45, depth: 2 },
      { x: tipX - 80, y: baseY - 40, scale: 1.5, depth: 3 },
      { x: tipX + 90, y: baseY - 60, scale: 1.4, depth: 3 },
      { x: tipX + 260, y: baseY - 120, scale: 1.35, depth: 2 },
      { x: tipX + 20, y: baseY - 20, scale: 1.55, depth: 3 },
    ];
    for (const piece of anchors) {
      plant(piece.x, piece.y, "rock-cluster", piece.scale, piece.depth);
    }

    // Dense fill inside the pyramid, denser toward the wide base.
    for (let y = tipY + 100; y <= baseY; y += 38) {
      const t = (y - tipY) / Math.max(1, baseY - tipY);
      const halfW = (tipHalfW + (baseHalfW - tipHalfW) * t) * 0.92;
      for (let x = tipX - halfW; x <= tipX + halfW; x += 40) {
        const n = this.forestNoise(x + y, 40 + (i % 6));
        if (n < 0.18) {
          i += 1;
          continue;
        }
        plant(
          x + (n - 0.5) * 10,
          y + (n - 0.5) * 10,
          "rock-cluster",
          0.55 + n * 0.48 + t * 0.15,
          3,
          n > 0.5,
        );
        i += 1;
      }
    }
  }

  private placeFarLandingFlag(): void {
    const flagScale =
      (PENGUIN_FRAMES.ready.height * PENGUIN_SCALE) / 128;

    // Takeoff lip marker.
    const lip = sampleRamp(jumpConfig.lipX, jumpConfig);
    this.add
      .image(jumpConfig.lipX - 6, lip.y + 4, "village-flag")
      .setOrigin(0.2, 1)
      .setScale(flagScale)
      .setDepth(5);

    // Far end of the landing hill before the village runout.
    const x = jumpConfig.landingEndX;
    const surface = sampleLanding(x, jumpConfig);

    // Yellow paint following the snow surface (not sticking into the sky).
    const halfSpan = 36;
    const sink = 5;
    const mark = this.add.graphics();
    mark.setDepth(4);
    const paint = (width: number, color: number): void => {
      mark.lineStyle(width, color, 1);
      mark.beginPath();
      let started = false;
      for (let dx = -halfSpan; dx <= halfSpan; dx += 4) {
        const point = sampleLanding(x + dx, jumpConfig);
        const px = x + dx;
        const py = point.y + sink;
        if (!started) {
          mark.moveTo(px, py);
          started = true;
        } else {
          mark.lineTo(px, py);
        }
      }
      mark.strokePath();
    };
    paint(8, 0xf0b400);
    paint(4, 0xffe066);

    this.add
      .image(x + 10, surface.y + 4, "village-flag")
      .setOrigin(0.2, 1)
      .setScale(flagScale)
      .setDepth(5);
  }

  private placeRunoutScenery(): void {
    // Content bottoms sit above the canvas edge on these sprites; plant from there.
    const originY: Record<string, number> = {
      "rock-cluster": 204 / 256,
      "snow-pile": 206 / 256,
      "wood-pile": 207 / 256,
      "snow-village": 214 / 256,
      "snow-storage": 205 / 256,
      watchtower: 230 / 256,
      geyser: 225 / 256,
      "pine-tree": 233 / 256,
      snowman: 231 / 256,
    };

    // Compact village shortly after the far-landing mark, then stones at the end.
    // Sink into the snow fill and scale up a bit so they read as foreground.
    const clusters: ReadonlyArray<{
      anchorX: number;
      props: ReadonlyArray<{
        key: string;
        dx: number;
        scale: number;
        sink: number;
        depth: number;
      }>;
    }> = [
      {
        // Small village, a bit further into the runout.
        // Deep in the snow fill and above the penguin so it reads as foreground.
        anchorX: 6400,
        props: [
          { key: "snowman", dx: -200, scale: 0.34, sink: 130, depth: 14 },
          { key: "pine-tree", dx: -100, scale: 0.72, sink: 155, depth: 15 },
          { key: "snow-village", dx: 60, scale: 0.95, sink: 140, depth: 14 },
          // Soft overlap with the first house.
          { key: "pine-tree", dx: 150, scale: 0.68, sink: 162, depth: 15 },
          { key: "snow-storage", dx: 320, scale: 0.82, sink: 128, depth: 14 },
          { key: "wood-pile", dx: 520, scale: 0.73, sink: 118, depth: 13 },
          { key: "pine-tree", dx: 640, scale: 0.76, sink: 158, depth: 15 },
          { key: "pine-tree", dx: 800, scale: 0.7, sink: 150, depth: 15 },
        ],
      },
      {
        // Rocky end of the runout, with pines beside and in front of the stones.
        anchorX: 8100,
        props: [
          { key: "pine-tree", dx: -620, scale: 0.78, sink: 160, depth: 16 },
          { key: "rock-cluster", dx: -480, scale: 0.7, sink: 135, depth: 13 },
          { key: "pine-tree", dx: -390, scale: 0.7, sink: 168, depth: 16 },
          { key: "snow-pile", dx: -300, scale: 0.55, sink: 122, depth: 13 },
          { key: "rock-cluster", dx: -100, scale: 0.82, sink: 148, depth: 13 },
          { key: "pine-tree", dx: 10, scale: 0.85, sink: 307, depth: 16 },
          { key: "geyser", dx: 120, scale: 0.72, sink: 130, depth: 13 },
          { key: "pine-tree", dx: 280, scale: 0.74, sink: 170, depth: 16 },
          { key: "rock-cluster", dx: 400, scale: 0.65, sink: 138, depth: 13 },
          { key: "snow-pile", dx: 520, scale: 0.58, sink: 124, depth: 13 },
        ],
      },
    ];

    for (const cluster of clusters) {
      for (const prop of cluster.props) {
        const x = cluster.anchorX + prop.dx;
        const surface = sampleLanding(x, jumpConfig);
        this.add
          .image(x, surface.y + prop.sink, prop.key)
          .setOrigin(0.5, originY[prop.key] ?? 1)
          .setScale(prop.scale)
          .setDepth(prop.depth);
      }
    }
  }

  private placeWatchtowerStop(): void {
    const surface = sampleLanding(WATCHTOWER_X, jumpConfig);
    this.add
      .image(WATCHTOWER_X, surface.y + WATCHTOWER_SINK, "watchtower")
      .setOrigin(0.5, WATCHTOWER_ORIGIN_Y)
      .setScale(WATCHTOWER_SCALE)
      .setDepth(WATCHTOWER_DEPTH);
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
    const result = recordDistance(storage, worldDistanceToMeters(state.distance));
    this.leaderboard = [...result.entries];
  }

  private createSnowfall(): void {
    const spanX = Math.max(2400, jumpConfig.landingRunoutEndX);
    const skyTop = jumpConfig.readyY - 120;
    const skyBottom = jumpConfig.landingEndY - 200;

    for (let index = 0; index < SNOWFLAKE_COUNT; index += 1) {
      const scale = SNOW_SCALE_MIN + Math.random() * SNOW_SCALE_SPAN;
      // Bigger flakes sit closer (stronger world scroll).
      const scroll =
        0.62 + ((scale - SNOW_SCALE_MIN) / SNOW_SCALE_SPAN) * 0.38;
      const flake = this.add
        .image(
          Math.random() * spanX,
          skyTop + Math.random() * Math.max(80, skyBottom - skyTop),
          "snow-flakes",
        )
        .setScrollFactor(scroll)
        .setDepth(5)
        .setAlpha(0.26 + Math.random() * 0.34)
        .setScale(scale);
      flake.setData("vx", -18 + Math.random() * 36);
      flake.setData("vy", 12 + Math.random() * 36);
      flake.setData("scroll", scroll);
      const spinDir = Math.random() < 0.5 ? -1 : 1;
      flake.setData("spin", spinDir * (1.4 + Math.random() * 3.8));
      this.snowflakes.push(flake);
    }
  }

  private updateSnowfall(deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const cam = this.cameras.main;

    for (const flake of this.snowflakes) {
      const scroll = Math.max(0.2, flake.getData("scroll") as number);
      flake.x += (flake.getData("vx") as number) * dt;
      flake.y += (flake.getData("vy") as number) * dt;
      flake.rotation += (flake.getData("spin") as number) * dt;

      const recycleTop = cam.scrollY - 80;
      const recycleBottom = cam.scrollY + cam.height / scroll + 80;
      const recycleLeft = cam.scrollX - 80;
      const recycleWidth = cam.width / scroll + 160;

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

  private createPauseMenu(): void {
    this.pauseBackdrop = this.add
      .rectangle(0, 0, 100, 100, 0x083a56, 0.55)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(115)
      .setVisible(false);

    this.pauseTitle = this.add
      .text(0, 0, "Paused", {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: "64px",
        fontStyle: "bold",
        color: "#f4fbff",
        align: "center",
        stroke: "#0b4f73",
        strokeThickness: 10,
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(120)
      .setVisible(false);

    this.pauseHint = this.add
      .text(
        0,
        0,
        [
          "Tap / Space / Up  ·  jump",
          "Down  ·  crouch for speed",
          "ESC  ·  pause or play",
          "R  ·  retry",
          "After stop  ·  ← → turn, ↑ jump",
        ].join("\n"),
        {
          fontFamily: "Trebuchet MS, Arial, sans-serif",
          fontSize: "26px",
          fontStyle: "bold",
          color: "#e8f6ff",
          align: "center",
          stroke: "#0b4f73",
          strokeThickness: 6,
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(120)
      .setVisible(false);
  }

  private layoutHud(): void {
    const centerX = this.cameras.main.width * 0.5;
    const centerY = this.cameras.main.height * 0.5;
    const right = this.cameras.main.width - 28;
    this.distanceText.setPosition(centerX, 18);
    this.leaderboardText.setPosition(right, 18);
    this.pauseBackdrop.setPosition(centerX, centerY);
    this.pauseBackdrop.setSize(
      this.cameras.main.width + 40,
      this.cameras.main.height + 40,
    );
    this.pauseTitle.setPosition(centerX, centerY - 78);
    this.pauseHint.setPosition(centerX, centerY - 18);
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
    if (this.roam !== null) {
      this.renderFreeRoam();
      return;
    }

    const state = this.jumpState;
    const pose = poseForJumpPhase(state, this.takeoffPosePending);
    this.applyPose(pose);
    this.penguin.setPosition(state.x, state.y);
    this.penguin.setFlipX(true);
    this.penguin.setScale(
      PENGUIN_SCALE,
      this.isCrouching()
        ? PENGUIN_SCALE * PENGUIN_CROUCH_SCALE_Y
        : PENGUIN_SCALE,
    );
    const stats = jumpHudStats(state);
    this.distanceText.setText(formatDistanceHud(stats));
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

  private renderFreeRoam(): void {
    if (this.roam === null) {
      return;
    }
    const pose = poseForFreeRoam(this.roam);
    const frame = PENGUIN_FRAMES[pose];
    // Sheet faces left. Facing right uses flipX; mirror the contact origin with it.
    const originX =
      this.roam.facing > 0
        ? 1 - frame.contactX / frame.width
        : frame.contactX / frame.width;
    this.penguin
      .setFrame(pose)
      .setOrigin(originX, frame.contactY / frame.height)
      .setPosition(this.roam.x, this.roam.y)
      .setFlipX(this.roam.facing > 0)
      .setScale(
        PENGUIN_SCALE,
        this.isCrouching()
          ? PENGUIN_SCALE * PENGUIN_CROUCH_SCALE_Y
          : PENGUIN_SCALE,
      );
    const stats = jumpHudStats(this.jumpState);
    this.distanceText.setText(formatDistanceHud(stats));
    this.leaderboardText.setText(formatLeaderboard(this.leaderboard));

    const surface = this.worldSurface(this.roam.x);
    const rotation = this.roam.grounded
      ? Math.atan(surface.slope)
      : Phaser.Math.Clamp(
          Math.atan2(
            this.roam.vy,
            Math.max(40, Math.abs(this.roam.vx)) * this.roam.facing,
          ),
          -0.65,
          0.65,
        );
    this.penguin.setRotation(rotation);
  }
}
