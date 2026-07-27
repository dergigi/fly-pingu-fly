import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ASSET_DIRECTORY = "public/assets/sprites";
const REQUIRED_ASSETS = [
  { name: "sprite_penguin.png", format: "png", width: 640, height: 240 },
  { name: "winter-forest.webp", format: "webp" },
  { name: "pine-tree-snow-heavy.webp", format: "webp" },
  { name: "snow-packed.webp", format: "webp" },
  { name: "snow-covered-geyser.webp", format: "webp" },
  { name: "snow-ice-crystal.png", format: "png" },
  { name: "snow-fall-flakes.webp", format: "webp" },
  { name: "cloud-solid.webp", format: "webp" },
  { name: "cloud-thin.webp", format: "webp" },
  { name: "snow-pile.webp", format: "webp" },
  { name: "snow-covered-fallen-log.webp", format: "webp" },
  { name: "snow-village.webp", format: "webp" },
  { name: "snow-walled-storage.webp", format: "webp" },
  { name: "wood-pile-snow-capped.webp", format: "webp" },
  { name: "snow-covered-rock-cluster.webp", format: "webp" },
  { name: "snow-covered-hot-spring.webp", format: "webp" },
  { name: "ice-watchtower-spire.webp", format: "webp" },
  { name: "village-flag.png", format: "png" },
];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readPngDimensions(bytes) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("wrong PNG signature or truncated PNG container");
  }

  let offset = 8;
  let dimensions;
  let foundEnd = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > bytes.length) {
      throw new Error("truncated PNG chunk");
    }

    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const contentEnd = offset + 8 + length;
    const expectedCrc = bytes.readUInt32BE(contentEnd);
    const actualCrc = crc32(bytes.subarray(offset + 4, contentEnd));
    if (expectedCrc !== actualCrc) {
      throw new Error(`corrupt PNG ${type} chunk`);
    }

    if (type === "IHDR") {
      if (offset !== 8 || length !== 13) {
        throw new Error("invalid PNG IHDR chunk");
      }
      dimensions = {
        width: bytes.readUInt32BE(offset + 8),
        height: bytes.readUInt32BE(offset + 12),
      };
    }
    if (type === "IEND") {
      if (length !== 0 || chunkEnd !== bytes.length) {
        throw new Error("invalid PNG IEND chunk");
      }
      foundEnd = true;
      break;
    }

    offset = chunkEnd;
  }

  if (!dimensions || !foundEnd) {
    throw new Error("incomplete PNG container");
  }
  return dimensions;
}

function readUint24LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readWebpChunkDimensions(type, payload) {
  if (type === "VP8X" && payload.length >= 10) {
    return {
      width: readUint24LE(payload, 4) + 1,
      height: readUint24LE(payload, 7) + 1,
    };
  }
  if (
    type === "VP8 " &&
    payload.length >= 10 &&
    payload[3] === 0x9d &&
    payload[4] === 0x01 &&
    payload[5] === 0x2a
  ) {
    return {
      width: payload.readUInt16LE(6) & 0x3fff,
      height: payload.readUInt16LE(8) & 0x3fff,
    };
  }
  if (type === "VP8L" && payload.length >= 5 && payload[0] === 0x2f) {
    const packed = payload.readUInt32LE(1);
    return {
      width: (packed & 0x3fff) + 1,
      height: ((packed >>> 14) & 0x3fff) + 1,
    };
  }
  return undefined;
}

function readWebpDimensions(bytes) {
  if (
    bytes.length < 20 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("wrong WebP signature or truncated WebP container");
  }
  if (bytes.readUInt32LE(4) + 8 !== bytes.length) {
    throw new Error("invalid WebP RIFF size");
  }

  let offset = 12;
  let dimensions;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const contentStart = offset + 8;
    const contentEnd = contentStart + length;
    const chunkEnd = contentEnd + (length % 2);
    if (chunkEnd > bytes.length) {
      throw new Error("truncated WebP chunk");
    }

    dimensions ??= readWebpChunkDimensions(
      type,
      bytes.subarray(contentStart, contentEnd),
    );
    offset = chunkEnd;
  }

  if (offset !== bytes.length || !dimensions) {
    throw new Error("incomplete or unsupported WebP container");
  }
  return dimensions;
}

function assertPositiveDimensions({ width, height }) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("image dimensions must be finite and positive");
  }
}

export function checkRequiredAssets(rootDir = process.cwd()) {
  const errors = [];

  for (const asset of REQUIRED_ASSETS) {
    const relativePath = `${ASSET_DIRECTORY}/${asset.name}`;
    try {
      const bytes = readFileSync(resolve(rootDir, relativePath));
      if (bytes.length === 0) {
        throw new Error("file is empty");
      }

      const dimensions =
        asset.format === "png"
          ? readPngDimensions(bytes)
          : readWebpDimensions(bytes);
      assertPositiveDimensions(dimensions);

      if (
        asset.width !== undefined &&
        (dimensions.width !== asset.width || dimensions.height !== asset.height)
      ) {
        throw new Error(
          `expected ${asset.width}x${asset.height}, received ${dimensions.width}x${dimensions.height}`,
        );
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      errors.push(`${relativePath}: ${reason}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Required art is not ready:\n${errors.join("\n")}`);
  }
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  try {
    checkRequiredAssets();
    console.log("Required art is ready.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
