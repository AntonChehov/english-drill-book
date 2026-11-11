#!/usr/bin/env node
// Compares the screenshots of a pull request with those of `main`, pixel by pixel
// (design D8). Files are `<view>-<theme>-<width>.png`, made by e2e/screenshots.spec.ts.
// Usage: node scripts/screenshots.mjs <pull request dir> <main dir> [--out comparison.json]
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { inflateSync } from "node:zlib";
import { isMain } from "./common.mjs";

/**
 * Share of differing pixels above which a view counts as changed: 0.01 %. Design D8 first
 * named 0.1 %, but a changed link colour alters only 0.07 % of a 1280 px screenshot, while
 * two runs of the same build differ in no pixel at all.
 */
export const changedThreshold = 0.0001;

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const channelsOf = { 0: 1, 2: 3, 4: 2, 6: 4 };

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) return left;
  return toUp <= toUpLeft ? up : upLeft;
}

/**
 * Decodes an 8-bit, non-interlaced PNG (what browsers write for screenshots) into
 * RGBA pixels. Other kinds of PNG are rejected rather than compared wrongly.
 */
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(signature)) throw new Error("Not a PNG file");
  let offset = 8;
  let header;
  const data = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      header = {
        width: chunk.readUInt32BE(0),
        height: chunk.readUInt32BE(4),
        bitDepth: chunk[8],
        colorType: chunk[9],
        interlace: chunk[12],
      };
    } else if (type === "IDAT") {
      data.push(chunk);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }
  if (!header) throw new Error("PNG without a header");
  const channels = channelsOf[header.colorType];
  if (header.bitDepth !== 8 || !channels || header.interlace !== 0) {
    throw new Error(
      `Unsupported PNG: bit depth ${header.bitDepth}, colour type ${header.colorType}, interlace ${header.interlace}`,
    );
  }

  const { width, height } = header;
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const source = y * (stride + 1) + 1;
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[source + x];
      const left = x >= channels ? pixels[row + x - channels] : 0;
      const up = y > 0 ? pixels[row - stride + x] : 0;
      const upLeft = x >= channels && y > 0 ? pixels[row - stride + x - channels] : 0;
      let predicted;
      switch (filter) {
        case 0:
          predicted = 0;
          break;
        case 1:
          predicted = left;
          break;
        case 2:
          predicted = up;
          break;
        case 3:
          predicted = (left + up) >> 1;
          break;
        case 4:
          predicted = paeth(left, up, upLeft);
          break;
        default:
          throw new Error(`Unknown PNG filter ${filter}`);
      }
      pixels[row + x] = (value + predicted) & 0xff;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index++) {
    const at = index * channels;
    const gray = channels <= 2;
    rgba[index * 4] = pixels[at];
    rgba[index * 4 + 1] = gray ? pixels[at] : pixels[at + 1];
    rgba[index * 4 + 2] = gray ? pixels[at] : pixels[at + 2];
    rgba[index * 4 + 3] = channels === 4 ? pixels[at + 3] : channels === 2 ? pixels[at + 1] : 255;
  }
  return { width, height, data: rgba };
}

/** Share of pixels that differ, from 0 to 1; images of different sizes differ entirely. */
export function differingShare(before, after) {
  if (before.width !== after.width || before.height !== after.height) return 1;
  const total = before.width * before.height;
  if (total === 0) return 0;
  let differing = 0;
  for (let index = 0; index < before.data.length; index += 4) {
    if (
      before.data[index] !== after.data[index] ||
      before.data[index + 1] !== after.data[index + 1] ||
      before.data[index + 2] !== after.data[index + 2] ||
      before.data[index + 3] !== after.data[index + 3]
    ) {
      differing++;
    }
  }
  return differing / total;
}

function pngFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".png"))
    .toSorted();
}

/**
 * Status of every screenshot: `added` (no counterpart on main), `removed`,
 * `changed` (over the threshold or not comparable) or `unchanged`.
 */
export function compareDirectories(pullRequestDir, mainDir, threshold = changedThreshold) {
  const current = pngFiles(pullRequestDir);
  const previous = new Set(pngFiles(mainDir));
  const results = [];
  for (const file of current) {
    if (!previous.has(file)) {
      results.push({ file, status: "added" });
      continue;
    }
    let share;
    try {
      share = differingShare(
        decodePng(readFileSync(join(mainDir, file))),
        decodePng(readFileSync(join(pullRequestDir, file))),
      );
    } catch {
      share = 1;
    }
    results.push({ file, status: share > threshold ? "changed" : "unchanged", share });
  }
  for (const file of previous) {
    if (!current.includes(file)) results.push({ file, status: "removed" });
  }
  return results.toSorted((a, b) => a.file.localeCompare(b.file));
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: "string", default: "comparison.json" } },
  });
  const [pullRequestDir, mainDir] = positionals;
  if (!pullRequestDir || !mainDir) {
    console.error("Usage: node scripts/screenshots.mjs <pull request dir> <main dir> [--out file]");
    process.exitCode = 2;
    return;
  }
  const results = compareDirectories(pullRequestDir, mainDir);
  if (results.length === 0) {
    console.error(`No screenshots in ${pullRequestDir}.`);
    process.exitCode = 1;
    return;
  }
  writeFileSync(values.out, `${JSON.stringify(results, null, 2)}\n`);
  for (const { file, status, share } of results) {
    console.log(`${status.padEnd(9)} ${file}${share ? ` (${(share * 100).toFixed(2)} %)` : ""}`);
  }
}

if (isMain(import.meta.url)) main();
