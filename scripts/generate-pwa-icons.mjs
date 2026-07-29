import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Matches PENGUIN_FRAMES.ready in src/game/penguinFrames.ts */
const READY_FRAME = Object.freeze({
  x: 91,
  y: 88,
  width: 66,
  height: 78,
});

const SKY = "#8ed8f8";
const SIZES = [192, 512];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const spritePath = join(root, "public/assets/sprites/sprite_penguin.png");
const publicDir = join(root, "public");

function assertMagick() {
  try {
    execFileSync("magick", ["-version"], { stdio: "ignore" });
  } catch {
    try {
      execFileSync("sips", ["--help"], { stdio: "ignore" });
    } catch {
      // ignore
    }
    throw new Error(
      "ImageMagick `magick` is required to composite the ready-frame penguin onto a #8ed8f8 canvas (sips alone cannot pad with a solid brand color).",
    );
  }
}

function generateIcon(size, outPath) {
  // Keep the penguin inside the maskable safe zone (~center 80%).
  const penguinMax = Math.round(size * 0.55);
  execFileSync(
    "magick",
    [
      "-size",
      `${size}x${size}`,
      `xc:${SKY}`,
      "(",
      spritePath,
      "-crop",
      `${READY_FRAME.width}x${READY_FRAME.height}+${READY_FRAME.x}+${READY_FRAME.y}`,
      "+repage",
      "-resize",
      `${penguinMax}x${penguinMax}`,
      ")",
      "-gravity",
      "center",
      "-compose",
      "over",
      "-composite",
      outPath,
    ],
    { stdio: "inherit" },
  );
}

function main() {
  assertMagick();
  mkdirSync(publicDir, { recursive: true });

  for (const size of SIZES) {
    const outPath = join(publicDir, `pwa-${size}x${size}.png`);
    generateIcon(size, outPath);
    console.log(`wrote ${outPath}`);
  }
}

main();
