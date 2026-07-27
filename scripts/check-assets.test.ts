import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { checkRequiredAssets } from "./check-assets.mjs";

const ASSET_DIR = "public/assets/sprites";
const REQUIRED_ASSETS = [
  "sprite_penguin.png",
  "winter-forest.webp",
  "pine-tree-snow-heavy.webp",
  "snow-packed.webp",
  "snow-covered-geyser.webp",
  "snow-ice-crystal.png",
  "snow-fall-flakes.webp",
  "cloud-solid.webp",
  "cloud-thin.webp",
  "snow-pile.webp",
  "snow-covered-fallen-log.webp",
  "snow-village.webp",
  "snow-walled-storage.webp",
  "wood-pile-snow-capped.webp",
  "snow-covered-rock-cluster.webp",
  "snow-covered-hot-spring.webp",
  "ice-watchtower-spire.webp",
  "igloo-snow-block-dome.webp",
  "lantern-post-snow-capped.webp",
  "village-flag.png",
] as const;
const fixtureRoots: string[] = [];

async function createReadyFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "fly-pingu-assets-"));
  fixtureRoots.push(root);

  for (const asset of REQUIRED_ASSETS) {
    const source = resolve(ASSET_DIR, asset);
    const destination = join(root, ASSET_DIR, asset);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, await readFile(source));
  }

  return root;
}

function assetPath(root: string, asset: (typeof REQUIRED_ASSETS)[number]): string {
  return join(root, ASSET_DIR, asset);
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, {
    force: true,
    recursive: true,
  })));
});

describe("required art readiness", () => {
  test("accepts the committed scenery and penguin assets", async () => {
    const root = await createReadyFixture();

    expect(() => checkRequiredAssets(root)).not.toThrow();
  });

  test("reports every missing, empty, or signature-mismatched path", async () => {
    const root = await createReadyFixture();
    await rm(assetPath(root, "sprite_penguin.png"));
    await writeFile(assetPath(root, "winter-forest.webp"), new Uint8Array());
    await writeFile(assetPath(root, "snow-pile.webp"), "not a webp");
    await writeFile(
      assetPath(root, "snow-covered-fallen-log.webp"),
      "not a webp",
    );
    await writeFile(assetPath(root, "snow-village.webp"), "not a webp");
    await writeFile(assetPath(root, "snow-walled-storage.webp"), "not a webp");
    await writeFile(assetPath(root, "wood-pile-snow-capped.webp"), "not a webp");
    await writeFile(
      assetPath(root, "snow-covered-rock-cluster.webp"),
      "not a webp",
    );
    await writeFile(
      assetPath(root, "snow-covered-hot-spring.webp"),
      "not a webp",
    );
    await writeFile(assetPath(root, "ice-watchtower-spire.webp"), "not a webp");
    await writeFile(assetPath(root, "igloo-snow-block-dome.webp"), "not a webp");
    await writeFile(
      assetPath(root, "lantern-post-snow-capped.webp"),
      "not a webp",
    );
    await writeFile(assetPath(root, "village-flag.png"), "not a png");

    expect(() => checkRequiredAssets(root)).toThrowError(
      /sprite_penguin\.png[\s\S]*winter-forest\.webp[\s\S]*snow-pile\.webp[\s\S]*snow-covered-fallen-log\.webp[\s\S]*snow-village\.webp[\s\S]*snow-walled-storage\.webp[\s\S]*wood-pile-snow-capped\.webp[\s\S]*snow-covered-rock-cluster\.webp[\s\S]*snow-covered-hot-spring\.webp[\s\S]*ice-watchtower-spire\.webp[\s\S]*igloo-snow-block-dome\.webp[\s\S]*lantern-post-snow-capped\.webp[\s\S]*village-flag\.png/,
    );
  });

  test.each(REQUIRED_ASSETS)("rejects a truncated %s container", async (asset) => {
    const root = await createReadyFixture();
    const bytes = await readFile(assetPath(root, asset));
    await writeFile(assetPath(root, asset), bytes.subarray(0, 24));

    expect(() => checkRequiredAssets(root)).toThrowError(new RegExp(asset));
  });

  test("requires the penguin sheet to decode as exactly 640x240", async () => {
    const root = await createReadyFixture();
    const path = assetPath(root, "sprite_penguin.png");
    const bytes = await readFile(path);
    bytes.writeUInt32BE(639, 16);
    await writeFile(path, bytes);

    expect(() => checkRequiredAssets(root)).toThrowError(
      /sprite_penguin\.png[\s\S]*(640x240|corrupt)/,
    );
  });

  test("wires prebuild ahead of the Vite production build", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.prebuild).toBe("node scripts/check-assets.mjs");
    expect(packageJson.scripts?.build).toBe("vite build");
  });
});
