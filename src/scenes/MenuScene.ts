import Phaser from "phaser";

import { PENGUIN_FRAMES } from "../game/penguinFrames";
import { readLeaderboard } from "../game/leaderboard";

const PIXEL_FONT =
  '"Press Start 2P", "Courier New", Courier, monospace';

const SNOWFLAKE_COUNT = 42;
const SNOW_SCALE_MIN = 0.03;
const SNOW_SCALE_SPAN = 0.07;
const SKY = 0x8ed8f8;
const SNOW_FILL = 0xffffff;
const SNOW_EDGE = 0xd9f5ff;
const PINE_ORIGIN_Y = 233 / 256;

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function forestNoise(x: number, salt: number): number {
  const n = Math.sin(x * 0.017 + salt * 12.9898) * 43758.5453;
  return n - Math.floor(n);
}

export class MenuScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.Graphics;
  private penguin!: Phaser.GameObjects.Sprite;
  private playPrompt!: Phaser.GameObjects.Text;
  private animTimer = 0;
  private started = false;
  private groundY = 0;
  private readonly flakes: Phaser.GameObjects.Image[] = [];
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly forest: Phaser.GameObjects.Image[] = [];
  private readonly fog: Array<{
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
    super("menu");
  }

  preload(): void {
    this.load.image("penguin-sheet", "/assets/sprites/sprite_penguin.png");
    this.load.image("winter-forest", "/assets/sprites/winter-forest.webp");
    this.load.image("pine-tree", "/assets/sprites/pine-tree-snow-heavy.webp");
    this.load.image("snow-flakes", "/assets/sprites/snow-fall-flakes.webp");
    this.load.image("cloud-solid", "/assets/sprites/cloud-solid.webp");
    this.load.image("cloud-thin", "/assets/sprites/cloud-thin.webp");
  }

  create(): void {
    this.started = false;
    this.cameras.main.setBackgroundColor(SKY);
    this.registerPenguinFrames();
    this.ensureFogTexture();
    this.backdrop = this.add.graphics().setDepth(0).setScrollFactor(0);
    this.placeClouds();
    this.placeForest();
    this.placeFog();
    this.placeForegroundPines();
    this.spawnSnow();
    this.createTitle();
    this.createPenguin();
    this.createPlayPrompt();
    this.createBestScore();
    this.createControlsHint();
    this.bindInput();
    this.scale.on("resize", this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.layout, this);
    });
    this.layout();
  }

  update(_time: number, delta: number): void {
    if (this.started) {
      return;
    }

    this.animTimer += delta;
    const dt = Math.min(delta, 50) / 1000;
    const h = this.cameras.main.height;
    const w = this.cameras.main.width;

    for (const flake of this.flakes) {
      flake.x += (flake.getData("vx") as number) * dt;
      flake.y += (flake.getData("vy") as number) * dt;
      flake.rotation += (flake.getData("spin") as number) * dt;
      if (flake.y > h + 40) {
        flake.y = -40 - Math.random() * 40;
        flake.x = Math.random() * w;
      } else if (flake.x < -40) {
        flake.x = w + 20;
      } else if (flake.x > w + 40) {
        flake.x = -20;
      }
    }

    for (const cloud of this.clouds) {
      const phase =
        ((cloud.getData("phase") as number) + dt * 0.18) % (Math.PI * 2);
      cloud.setData("phase", phase);
      cloud.x += (cloud.getData("vx") as number) * dt;
      cloud.y =
        (cloud.getData("baseY") as number) +
        Math.sin(phase) * (cloud.getData("bob") as number);
      if (cloud.x < -220) {
        cloud.x = w + 180;
      } else if (cloud.x > w + 220) {
        cloud.x = -180;
      }
    }

    for (const wisp of this.fog) {
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

  private registerPenguinFrames(): void {
    const texture = this.textures.get("penguin-sheet");
    for (const [pose, frame] of Object.entries(PENGUIN_FRAMES)) {
      if (!texture.has(pose)) {
        texture.add(pose, 0, frame.x, frame.y, frame.width, frame.height);
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

  private paintBackdrop(w: number, h: number): void {
    const g = this.backdrop;
    g.clear();
    g.fillStyle(SKY, 1);
    g.fillRect(0, 0, w, h);

    const snowTop = this.groundY;
    g.fillStyle(SNOW_FILL, 1);
    g.beginPath();
    g.moveTo(0, snowTop + 18);
    g.lineTo(w * 0.18, snowTop - 6);
    g.lineTo(w * 0.42, snowTop + 10);
    g.lineTo(w * 0.68, snowTop - 4);
    g.lineTo(w, snowTop + 14);
    g.lineTo(w, h + 4);
    g.lineTo(0, h + 4);
    g.closePath();
    g.fillPath();

    g.lineStyle(6, SNOW_EDGE, 1);
    g.beginPath();
    g.moveTo(0, snowTop + 18);
    g.lineTo(w * 0.18, snowTop - 6);
    g.lineTo(w * 0.42, snowTop + 10);
    g.lineTo(w * 0.68, snowTop - 4);
    g.lineTo(w, snowTop + 14);
    g.strokePath();
  }

  private clearForest(): void {
    for (const tree of this.forest) {
      tree.destroy();
    }
    this.forest.length = 0;
  }

  private placeForest(): void {
    this.clearForest();
    const w = this.cameras.main.width;
    const ground = this.groundY || this.cameras.main.height * 0.86;

    let x = -40;
    while (x < w + 80) {
      const n = forestNoise(x, 1);
      const scale = 0.55 + n * 0.55;
      const sink = 36 + n * 28;
      const tree = this.add
        .image(x + (n - 0.5) * 18, ground + sink, "winter-forest")
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setAlpha(0.78 + n * 0.18)
        .setDepth(-5)
        .setScrollFactor(0);
      this.forest.push(tree);

      const n2 = forestNoise(x, 7);
      const mid = this.add
        .image(x + 42 + (n2 - 0.5) * 20, ground + 28 + n2 * 22, "winter-forest")
        .setOrigin(0.5, 1)
        .setScale(0.42 + n2 * 0.42)
        .setAlpha(0.72 + n2 * 0.16)
        .setDepth(-4)
        .setScrollFactor(0);
      this.forest.push(mid);

      const n3 = forestNoise(x, 11);
      if (n3 > 0.3) {
        const far = this.add
          .image(
            x + 18 + (n3 - 0.5) * 14,
            ground + 40 + n3 * 18,
            "winter-forest",
          )
          .setOrigin(0.5, 1)
          .setScale(0.34 + n3 * 0.34)
          .setAlpha(0.7 + n3 * 0.12)
          .setDepth(-6)
          .setScrollFactor(0);
        this.forest.push(far);
      }

      x += 48 + Math.floor(n * 36);
    }
  }

  private placeFog(): void {
    for (const wisp of this.fog) {
      wisp.image.destroy();
    }
    this.fog.length = 0;

    const w = this.cameras.main.width;
    const ground = this.groundY || this.cameras.main.height * 0.86;
    const count = Math.max(6, Math.floor(w / 180));
    for (let i = 0; i < count; i += 1) {
      const n = forestNoise(i * 97, 9);
      const baseX = (i + 0.4) * (w / count) + (n - 0.5) * 40;
      const baseY = ground - (22 + n * 28);
      const baseAlpha = 0.1 + n * 0.08;
      const image = this.add
        .image(baseX, baseY, "ramp-fog-wisp")
        .setDepth(6)
        .setAlpha(baseAlpha)
        .setScale(0.85 + n * 0.7)
        .setScrollFactor(0);
      this.fog.push({
        image,
        baseX,
        baseY,
        phase: n * Math.PI * 2,
        drift: (14 + n * 16) * (i % 2 === 0 ? 1 : -1),
        bob: 6 + n * 8,
        range: 28 + n * 30,
        baseAlpha,
      });
    }
  }

  private placeClouds(): void {
    for (const cloud of this.clouds) {
      cloud.destroy();
    }
    this.clouds.length = 0;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const specs = [
      { key: "cloud-solid", y: 0.12, scale: 0.55, alpha: 0.42, far: true },
      { key: "cloud-thin", y: 0.18, scale: 0.9, alpha: 0.5, far: false },
      { key: "cloud-solid", y: 0.1, scale: 0.35, alpha: 0.38, far: true },
      { key: "cloud-thin", y: 0.22, scale: 0.48, alpha: 0.46, far: false },
    ] as const;

    specs.forEach((spec, index) => {
      const baseY = h * spec.y;
      const cloud = this.add
        .image((index + 0.35) * (w / specs.length), baseY, spec.key)
        .setScrollFactor(0)
        .setDepth(spec.far ? -8 : -7)
        .setAlpha(spec.alpha)
        .setScale(spec.scale);
      cloud.setData("vx", (2.2 + index * 0.4) * (index % 2 === 0 ? -1 : 1));
      cloud.setData("bob", 0.4 + index * 0.12);
      cloud.setData("phase", index * 1.3);
      cloud.setData("baseY", baseY);
      this.clouds.push(cloud);
    });
  }

  private placeForegroundPines(): void {
    this.add
      .image(0, 0, "pine-tree")
      .setOrigin(0.5, PINE_ORIGIN_Y)
      .setScale(0.72)
      .setAlpha(0.94)
      .setDepth(8)
      .setScrollFactor(0)
      .setName("pine-left");
    this.add
      .image(0, 0, "pine-tree")
      .setOrigin(0.5, PINE_ORIGIN_Y)
      .setScale(0.82)
      .setFlipX(true)
      .setAlpha(0.94)
      .setDepth(8)
      .setScrollFactor(0)
      .setName("pine-right");
  }

  private spawnSnow(): void {
    this.flakes.length = 0;
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    for (let i = 0; i < SNOWFLAKE_COUNT; i += 1) {
      const scale = SNOW_SCALE_MIN + Math.random() * SNOW_SCALE_SPAN;
      const flake = this.add
        .image(Math.random() * w, Math.random() * h, "snow-flakes")
        .setScrollFactor(0)
        .setDepth(20)
        .setAlpha(0.26 + Math.random() * 0.34)
        .setScale(scale);
      flake.setData("vx", -18 + Math.random() * 36);
      flake.setData("vy", 12 + Math.random() * 36);
      const spinDir = Math.random() < 0.5 ? -1 : 1;
      flake.setData("spin", spinDir * (1.4 + Math.random() * 3.8));
      this.flakes.push(flake);
    }
  }

  private createTitle(): void {
    this.add
      .text(0, 0, "FLY PINGU\nFLY", {
        fontFamily: PIXEL_FONT,
        fontSize: "52px",
        color: "#0b3a55",
        align: "center",
        lineSpacing: 18,
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setScrollFactor(0)
      .setName("title-shadow");

    this.add
      .text(0, 0, "FLY PINGU\nFLY", {
        fontFamily: PIXEL_FONT,
        fontSize: "52px",
        color: "#ffe566",
        align: "center",
        stroke: "#0b4f73",
        strokeThickness: 8,
        lineSpacing: 18,
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setScrollFactor(0)
      .setName("title");

    this.add
      .text(0, 0, "SKI JUMP", {
        fontFamily: PIXEL_FONT,
        fontSize: "14px",
        color: "#0b4f73",
        align: "center",
        stroke: "#f4fbff",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setScrollFactor(0)
      .setName("subtitle");
  }

  private createPenguin(): void {
    const frame = PENGUIN_FRAMES.ready;
    this.penguin = this.add
      .sprite(0, 0, "penguin-sheet", "ready")
      .setOrigin(frame.contactX / frame.width, frame.contactY / frame.height)
      .setScale(0.72)
      .setFlipX(true)
      .setDepth(12)
      .setScrollFactor(0);
  }

  private createPlayPrompt(): void {
    this.playPrompt = this.add
      .text(0, 0, "press anything to play", {
        fontFamily: PIXEL_FONT,
        fontSize: "14px",
        color: "#0b4f73",
        align: "center",
        stroke: "#f4fbff",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(14)
      .setScrollFactor(0);
  }

  private createBestScore(): void {
    const storage = browserStorage();
    const entries = storage === null ? [] : readLeaderboard(storage);
    const best = entries[0];
    const label =
      best !== undefined && best > 0
        ? `BEST  ${best.toFixed(2)} m`
        : "BEST  --.-- m";

    this.add
      .text(0, 0, label, {
        fontFamily: PIXEL_FONT,
        fontSize: "12px",
        color: "#0b4f73",
        align: "center",
        stroke: "#f4fbff",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setScrollFactor(0)
      .setName("best");
  }

  private createControlsHint(): void {
    this.add
      .text(
        0,
        0,
        "TAP / SPACE JUMP   ·   DOWN CROUCH   ·   ESC PAUSE",
        {
          fontFamily: PIXEL_FONT,
          fontSize: "9px",
          color: "#3a6f8a",
          align: "center",
          stroke: "#f4fbff",
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5)
      .setDepth(12)
      .setScrollFactor(0)
      .setName("controls");
  }

  private bindInput(): void {
    this.input.keyboard?.on("keydown", this.startGame, this);
    this.input.on("pointerdown", this.startGame, this);
  }

  private startGame = (): void => {
    if (this.started) {
      return;
    }
    this.started = true;
    this.input.keyboard?.off("keydown", this.startGame, this);
    this.input.off("pointerdown", this.startGame, this);
    this.cameras.main.fadeOut(220, 142, 216, 248);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("play");
    });
  };

  private layout = (): void => {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cx = w * 0.5;
    this.groundY = h * 0.86;
    this.paintBackdrop(w, h);
    this.placeForest();
    this.placeFog();
    this.placeClouds();

    const title = this.children.getByName("title") as Phaser.GameObjects.Text | null;
    const shadow = this.children.getByName(
      "title-shadow",
    ) as Phaser.GameObjects.Text | null;
    const subtitle = this.children.getByName(
      "subtitle",
    ) as Phaser.GameObjects.Text | null;
    const best = this.children.getByName("best") as Phaser.GameObjects.Text | null;
    const controls = this.children.getByName(
      "controls",
    ) as Phaser.GameObjects.Text | null;
    const pineLeft = this.children.getByName(
      "pine-left",
    ) as Phaser.GameObjects.Image | null;
    const pineRight = this.children.getByName(
      "pine-right",
    ) as Phaser.GameObjects.Image | null;

    const titleY = Math.max(90, h * 0.18);
    const titleSize = Math.round(Phaser.Math.Clamp(w * 0.055, 28, 56));
    if (title && shadow) {
      title.setFontSize(titleSize);
      shadow.setFontSize(titleSize);
      title.setPosition(cx, titleY);
      shadow.setPosition(cx + 4, titleY + 4);
    }
    subtitle?.setPosition(cx, titleY + titleSize * 1.55);
    best?.setPosition(cx, titleY + titleSize * 1.95);

    this.penguin.setPosition(cx, this.groundY);

    const playY = Math.min(this.groundY - 120, h * 0.68);
    const promptSize = Math.round(Phaser.Math.Clamp(w * 0.018, 10, 16));
    this.playPrompt.setFontSize(promptSize);
    this.playPrompt.setPosition(cx, playY);
    controls?.setPosition(cx, Math.min(h - 28, playY + 36));

    pineLeft?.setPosition(
      cx - Math.min(420, w * 0.38),
      this.groundY + 150,
    );
    pineRight?.setPosition(
      cx + Math.min(380, w * 0.36),
      this.groundY + 158,
    );
  };
}
