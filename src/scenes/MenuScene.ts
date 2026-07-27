import Phaser from "phaser";

import { PENGUIN_FRAMES } from "../game/penguinFrames";
import { readLeaderboard } from "../game/leaderboard";

const PIXEL_FONT =
  '"Press Start 2P", "Courier New", Courier, monospace';

const PALETTE = {
  skyTop: 0x0b1026,
  skyMid: 0x1a2744,
  skyLow: 0x3d5a80,
  horizon: 0x7eb8d4,
  snow: 0xe8f4ff,
  snowShade: 0xb8d4e8,
  ice: 0x7ec8ff,
  title: 0xffe566,
  titleStroke: 0x1a0a40,
  play: 0xff6b4a,
  playStroke: 0x4a1020,
  cream: 0xfff6e0,
  star: 0xffffff,
} as const;

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export class MenuScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.Graphics;

  private startKeys: Phaser.Input.Keyboard.Key[] = [];
  private penguin!: Phaser.GameObjects.Sprite;
  private playPrompt!: Phaser.GameObjects.Text;
  private blinkTimer = 0;
  private started = false;
  private readonly stars: Array<{
    rect: Phaser.GameObjects.Rectangle;
    phase: number;
    speed: number;
  }> = [];
  private readonly flakes: Array<{
    rect: Phaser.GameObjects.Rectangle;
    vx: number;
    vy: number;
    baseX: number;
  }> = [];

  constructor() {
    super("menu");
  }

  preload(): void {
    this.load.image("penguin-sheet", "/assets/sprites/sprite_penguin.png");
    this.load.image("menu-pine", "/assets/sprites/pine-tree-snow-heavy.webp");
    this.load.image("menu-crystal", "/assets/sprites/crystal-tree-16bit.webp");
  }

  create(): void {
    this.started = false;
    this.cameras.main.setBackgroundColor(PALETTE.skyTop);
    this.registerPenguinFrames();
    this.drawBackdrop();
    this.spawnStars();
    this.spawnSnow();
    this.placeDecor();
    this.createTitle();
    this.createPenguin();
    this.createPlayPrompt();
    this.createBestScore();
    this.createControlsHint();
    this.createScanlines();
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

    if (
      this.startKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))
    ) {
      this.startGame();
      return;
    }

    this.blinkTimer += delta;
    this.playPrompt.setAlpha(
      Math.sin(this.blinkTimer / 220) > 0 ? 1 : 0.25,
    );

    const bob = Math.sin(this.blinkTimer / 380) * 8;
    this.penguin.y =
      this.cameras.main.height * 0.58 + bob;
    this.penguin.setAngle(Math.sin(this.blinkTimer / 520) * 4);

    for (const star of this.stars) {
      star.rect.setAlpha(
        0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.blinkTimer * star.speed + star.phase)),
      );
    }

    const h = this.cameras.main.height;
    const w = this.cameras.main.width;
    for (const flake of this.flakes) {
      flake.rect.x += flake.vx * (delta / 16);
      flake.rect.y += flake.vy * (delta / 16);
      if (flake.rect.y > h + 4) {
        flake.rect.y = -4;
        flake.rect.x = flake.baseX + Phaser.Math.Between(-20, 20);
      }
      if (flake.rect.x < -8) {
        flake.rect.x = w + 4;
      } else if (flake.rect.x > w + 8) {
        flake.rect.x = -4;
      }
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

  private drawBackdrop(): void {
    this.backdrop = this.add.graphics().setDepth(0).setScrollFactor(0);
    this.paintBackdrop(
      this.cameras.main.width,
      this.cameras.main.height,
    );
  }

  private paintBackdrop(w: number, h: number): void {
    const g = this.backdrop;
    g.clear();
    const bands: Array<[number, number, number]> = [
      [PALETTE.skyTop, 0, 0.38],
      [PALETTE.skyMid, 0.38, 0.58],
      [PALETTE.skyLow, 0.58, 0.72],
      [PALETTE.horizon, 0.72, 0.8],
      [PALETTE.snowShade, 0.8, 0.88],
      [PALETTE.snow, 0.88, 1],
    ];
    for (const [color, y0, y1] of bands) {
      g.fillStyle(color, 1);
      g.fillRect(0, h * y0, w, h * (y1 - y0) + 2);
    }

    g.fillStyle(0x2a3f66, 1);
    this.drawPixelHill(g, -40, h * 0.74, w * 0.45, h * 0.16, 18);
    this.drawPixelHill(g, w * 0.28, h * 0.72, w * 0.5, h * 0.18, 22);
    this.drawPixelHill(g, w * 0.62, h * 0.75, w * 0.45, h * 0.15, 16);
    g.fillStyle(0x4a6f8a, 1);
    this.drawPixelHill(g, w * 0.05, h * 0.78, w * 0.55, h * 0.17, 20);
    this.drawPixelHill(g, w * 0.48, h * 0.8, w * 0.5, h * 0.16, 18);

    g.fillStyle(PALETTE.snow, 1);
    g.fillRect(0, h * 0.86, w, h * 0.14 + 4);
    g.fillStyle(PALETTE.snowShade, 1);
    const stepCount = Math.ceil(w / 48) + 2;
    for (let i = 0; i < stepCount; i += 1) {
      const x = i * 48;
      const step = (i % 3) * 6;
      g.fillRect(x, h * 0.86 - step, 40, 10 + step);
    }
  }

  private drawPixelHill(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    steps: number,
  ): void {
    const stepW = width / steps;
    for (let i = 0; i < steps; i += 1) {
      const t = i / (steps - 1);
      const rise = Math.sin(t * Math.PI) * height;
      const top = y - rise;
      g.fillRect(x + i * stepW, top, stepW + 1, y + height - top);
    }
  }

  private spawnStars(): void {
    this.stars.length = 0;
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    for (let i = 0; i < 42; i += 1) {
      const size = i % 7 === 0 ? 4 : 2;
      const rect = this.add
        .rectangle(
          Phaser.Math.Between(8, Math.max(16, w - 8)),
          Phaser.Math.Between(8, Math.max(16, Math.floor(h * 0.45))),
          size,
          size,
          PALETTE.star,
          1,
        )
        .setOrigin(0, 0)
        .setDepth(1)
        .setScrollFactor(0);
      this.stars.push({
        rect,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.008,
      });
    }
  }

  private spawnSnow(): void {
    this.flakes.length = 0;
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    for (let i = 0; i < 36; i += 1) {
      const size = i % 5 === 0 ? 3 : 2;
      const baseX = Phaser.Math.Between(0, Math.max(8, w));
      const rect = this.add
        .rectangle(
          baseX,
          Phaser.Math.Between(0, Math.max(8, h)),
          size,
          size,
          PALETTE.cream,
          0.85,
        )
        .setOrigin(0, 0)
        .setDepth(20)
        .setScrollFactor(0);
      this.flakes.push({
        rect,
        baseX,
        vx: Phaser.Math.FloatBetween(-0.35, 0.35),
        vy: Phaser.Math.FloatBetween(0.55, 1.4),
      });
    }
  }

  private placeDecor(): void {
    this.add
      .image(0, 0, "menu-crystal")
      .setOrigin(0.5, 1)
      .setScale(0.42)
      .setDepth(4)
      .setName("crystal");
    this.add
      .image(0, 0, "menu-pine")
      .setOrigin(0.5, 1)
      .setScale(0.28)
      .setDepth(5)
      .setName("pine-left");
    this.add
      .image(0, 0, "menu-pine")
      .setOrigin(0.5, 1)
      .setScale(0.34)
      .setDepth(5)
      .setName("pine-right");
  }

  private createTitle(): void {
    const shadow = this.add
      .text(0, 0, "FLY PINGU\nFLY", {
        fontFamily: PIXEL_FONT,
        fontSize: "52px",
        color: "#1a0a40",
        align: "center",
        lineSpacing: 18,
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setName("title-shadow");

    const title = this.add
      .text(0, 0, "FLY PINGU\nFLY", {
        fontFamily: PIXEL_FONT,
        fontSize: "52px",
        color: "#ffe566",
        align: "center",
        stroke: "#ff6b4a",
        strokeThickness: 6,
        lineSpacing: 18,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#7ec8ff",
          blur: 0,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setName("title");

    // Keep references via names for layout; silence unused if lint cares
    void shadow;
    void title;

    this.add
      .text(0, 0, "SKI JUMP", {
        fontFamily: PIXEL_FONT,
        fontSize: "14px",
        color: "#7ec8ff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setName("subtitle");
  }

  private createPenguin(): void {
    this.penguin = this.add
      .sprite(0, 0, "penguin-sheet", "ready")
      .setScale(0.72)
      .setFlipX(true)
      .setDepth(12);
  }

  private createPlayPrompt(): void {
    const plate = this.add
      .rectangle(0, 0, 320, 56, PALETTE.play, 1)
      .setStrokeStyle(4, PALETTE.cream, 1)
      .setDepth(13)
      .setName("play-plate");

    this.playPrompt = this.add
      .text(0, 0, "▶  PLAY", {
        fontFamily: PIXEL_FONT,
        fontSize: "22px",
        color: "#fff6e0",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(14);

    void plate;
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
        color: "#e8f4ff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(12)
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
          color: "#b8d4e8",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(12)
      .setName("controls");
  }

  private createScanlines(): void {
    const g = this.add.graphics().setDepth(30).setAlpha(0.08).setName("scanlines");
    // Drawn in layout so they track the viewport.
    void g;
  }

  private bindInput(): void {
    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.startKeys = [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      ];
    }
    this.input.on("pointerdown", this.startGame, this);
  }

  private startGame = (): void => {
    if (this.started) {
      return;
    }
    this.started = true;
    this.input.off("pointerdown", this.startGame, this);
    this.cameras.main.fadeOut(220, 11, 16, 38);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("play");
    });
  };

  private layout = (): void => {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cx = w * 0.5;
    this.paintBackdrop(w, h);

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
    const plate = this.children.getByName(
      "play-plate",
    ) as Phaser.GameObjects.Rectangle | null;
    const crystal = this.children.getByName(
      "crystal",
    ) as Phaser.GameObjects.Image | null;
    const pineLeft = this.children.getByName(
      "pine-left",
    ) as Phaser.GameObjects.Image | null;
    const pineRight = this.children.getByName(
      "pine-right",
    ) as Phaser.GameObjects.Image | null;

    const titleY = Math.max(90, h * 0.2);
    const titleSize = Math.round(Phaser.Math.Clamp(w * 0.055, 28, 56));
    if (title && shadow) {
      title.setFontSize(titleSize);
      shadow.setFontSize(titleSize);
      title.setPosition(cx, titleY);
      shadow.setPosition(cx + 4, titleY + 4);
    }
    subtitle?.setPosition(cx, titleY + titleSize * 1.55);
    best?.setPosition(cx, titleY + titleSize * 1.95);

    this.penguin.setPosition(cx, h * 0.58);

    const playY = Math.min(h * 0.78, h - 110);
    plate?.setPosition(cx, playY);
    this.playPrompt.setPosition(cx, playY);

    controls?.setPosition(cx, Math.min(h - 28, playY + 56));

    const groundY = h * 0.88;
    crystal?.setPosition(cx - Math.min(280, w * 0.28), groundY + 8);
    pineLeft?.setPosition(cx - Math.min(420, w * 0.4), groundY + 6);
    pineRight?.setPosition(cx + Math.min(360, w * 0.34), groundY + 6);

    for (const star of this.stars) {
      star.rect.x = Phaser.Math.Clamp(star.rect.x, 4, w - 8);
      star.rect.y = Phaser.Math.Clamp(star.rect.y, 4, h * 0.45);
    }

    const scan = this.children.getByName(
      "scanlines",
    ) as Phaser.GameObjects.Graphics | null;
    if (scan) {
      scan.clear();
      scan.fillStyle(0x000000, 1);
      for (let y = 0; y < h; y += 3) {
        scan.fillRect(0, y, w, 1);
      }
    }
  };
}
