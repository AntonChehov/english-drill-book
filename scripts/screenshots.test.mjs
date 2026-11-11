import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { compareDirectories, decodePng, differingShare } from "./screenshots.mjs";

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  // The decoder does not verify CRCs, so a zero CRC keeps the encoder short.
  return Buffer.concat([length, Buffer.from(type, "latin1"), data, Buffer.alloc(4)]);
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const [a, b, c] = [left, up, upLeft].map((value) => Math.abs(estimate - value));
  if (a <= b && a <= c) return left;
  return b <= c ? up : upLeft;
}

/** Encodes pixels (one byte per channel) with the given filter on every row. */
function encodePng({ width, height, channels, pixels, filter = 0, colorType }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = colorType ?? { 1: 0, 2: 4, 3: 2, 4: 6 }[channels];
  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = filter;
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x;
      const left = x >= channels ? pixels[at - channels] : 0;
      const up = y > 0 ? pixels[at - stride] : 0;
      const upLeft = x >= channels && y > 0 ? pixels[at - stride - channels] : 0;
      const predicted = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter];
      raw[y * (stride + 1) + 1 + x] = (pixels[at] - predicted) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function gradient(width, height, channels) {
  return Buffer.from(
    Array.from({ length: width * height * channels }, (_, index) => (index * 37 + 11) % 256),
  );
}

const image = (values) => ({ width: values.length / 4, height: 1, data: Buffer.from(values) });
const png = (pixels) => encodePng({ width: 1000, height: 20, channels: 4, pixels });

describe("decodePng", () => {
  for (const filter of [0, 1, 2, 3, 4]) {
    it(`restores RGBA pixels written with filter ${filter}`, () => {
      const pixels = gradient(5, 4, 4);
      const decoded = decodePng(encodePng({ width: 5, height: 4, channels: 4, pixels, filter }));
      expect(decoded.width).toBe(5);
      expect(decoded.height).toBe(4);
      expect(decoded.data.equals(pixels)).toBe(true);
    });
  }

  it("expands RGB to opaque RGBA", () => {
    const pixels = Buffer.from([10, 20, 30, 40, 50, 60]);
    const decoded = decodePng(encodePng({ width: 2, height: 1, channels: 3, pixels, filter: 4 }));
    expect([...decoded.data]).toEqual([10, 20, 30, 255, 40, 50, 60, 255]);
  });

  it("expands grey and grey with alpha", () => {
    const grey = decodePng(
      encodePng({ width: 1, height: 1, channels: 1, pixels: Buffer.from([7]) }),
    );
    expect([...grey.data]).toEqual([7, 7, 7, 255]);
    const greyAlpha = decodePng(
      encodePng({ width: 1, height: 1, channels: 2, pixels: Buffer.from([7, 9]) }),
    );
    expect([...greyAlpha.data]).toEqual([7, 7, 7, 9]);
  });

  it("rejects what it cannot decode", () => {
    expect(() => decodePng(Buffer.from("not a png"))).toThrow("Not a PNG file");
    const palette = encodePng({
      width: 1,
      height: 1,
      channels: 1,
      pixels: Buffer.from([0]),
      colorType: 3,
    });
    expect(() => decodePng(palette)).toThrow("Unsupported PNG");
  });
});

describe("differingShare", () => {
  it("is the share of pixels with any channel different", () => {
    expect(differingShare(image([1, 2, 3, 4, 5, 6, 7, 8]), image([1, 2, 3, 4, 5, 6, 7, 9]))).toBe(
      0.5,
    );
    expect(differingShare(image([1, 2, 3, 4]), image([1, 2, 3, 4]))).toBe(0);
  });

  it("counts images of different sizes as entirely different", () => {
    expect(differingShare(image([1, 2, 3, 4]), image([1, 2, 3, 4, 1, 2, 3, 4]))).toBe(1);
  });
});

describe("compareDirectories", () => {
  let root;
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function directories(pullRequest, main) {
    root = mkdtempSync(join(tmpdir(), "screenshots-"));
    for (const [name, files] of [
      ["pr", pullRequest],
      ["main", main],
    ]) {
      mkdirSync(join(root, name));
      for (const [file, content] of Object.entries(files))
        writeFileSync(join(root, name, file), content);
    }
    return [join(root, "pr"), join(root, "main")];
  }

  const base = Buffer.alloc(1000 * 20 * 4, 200);
  const oneDifferent = Buffer.from(base);
  oneDifferent[0] = 0;
  const threeDifferent = Buffer.from(base);
  for (const pixel of [0, 1, 2]) threeDifferent[pixel * 4] = 0;

  it("sorts each view into added, changed, unchanged or removed", () => {
    const [pr, main] = directories(
      {
        "start-light-1280.png": png(base),
        "about-light-1280.png": png(threeDifferent),
        "new-light-1280.png": png(base),
        "broken-light-1280.png": "not a png",
      },
      {
        "start-light-1280.png": png(base),
        "about-light-1280.png": png(base),
        "gone-light-1280.png": png(base),
        "broken-light-1280.png": png(base),
      },
    );
    expect(compareDirectories(pr, main)).toEqual([
      { file: "about-light-1280.png", status: "changed", share: 0.00015 },
      { file: "broken-light-1280.png", status: "changed", share: 1 },
      { file: "gone-light-1280.png", status: "removed" },
      { file: "new-light-1280.png", status: "added" },
      { file: "start-light-1280.png", status: "unchanged", share: 0 },
    ]);
  });

  it("ignores differences up to 0.01 % of pixels", () => {
    const [pr, main] = directories({ "a.png": png(oneDifferent) }, { "a.png": png(base) });
    expect(compareDirectories(pr, main)).toEqual([
      { file: "a.png", status: "unchanged", share: 0.00005 },
    ]);
  });

  it("treats every view as added when main has no screenshots yet", () => {
    const [pr] = directories({ "a.png": png(base) }, {});
    expect(compareDirectories(pr, join(root, "missing"))).toEqual([
      { file: "a.png", status: "added" },
    ]);
  });
});
