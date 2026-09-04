// Generates the PWA raster icons referenced by public/manifest.webmanifest,
// public/sw.js and src/lib/notifications.ts.
//
// Everything is rasterised by hand into an RGBA buffer and encoded with Node's
// built-in zlib, so this adds no dependencies. Run with:
//   node scripts/generate-icons.mjs
//
// Output: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png,
//         public/badge-72.png (monochrome, for notification badges)

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

// ── PNG encoding ────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Encode an RGBA Uint8Array (size * size * 4) as a PNG buffer. */
function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour + alpha
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // One filter byte (0 = None) per scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Tiny signed-distance rasteriser ─────────────────────────────────────────

/** Signed distance to a rounded rectangle centred at (cx, cy). */
function sdRoundedRect(px, py, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(px - cx) - (halfW - r);
  const qy = Math.abs(py - cy) - (halfH - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Signed distance to a thick line segment (a capsule). */
function sdSegment(px, py, ax, ay, bx, by, halfThickness) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.min(1, Math.max(0, (wx * vx + wy * vy) / len2));
  return Math.hypot(wx - vx * t, wy - vy * t) - halfThickness;
}

/** Antialiased coverage in [0,1] from a signed distance, feathered over ~1px. */
function coverage(d, feather) {
  return Math.min(1, Math.max(0, 0.5 - d / feather));
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Sample the app's vertical two-stop accent gradient at t in [0,1]. */
const STOPS = [
  [0.0, hexToRgb("#3a55e0")],
  [1.0, hexToRgb("#2340c9")],
];

function gradientAt(t) {
  const clamped = Math.min(1, Math.max(0, t));
  for (let i = 1; i < STOPS.length; i++) {
    const [t0, c0] = STOPS[i - 1];
    const [t1, c1] = STOPS[i];
    if (clamped <= t1) {
      const f = (clamped - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

/**
 * Draw the Sprint Room mark: an ultramarine squircle with a white checkmark.
 * The checkmark stays inside the central 60% so the icon survives the
 * maskable safe-zone crop. public/icon.svg draws the same geometry.
 */
function drawIcon(size, { monochrome = false, padding = 0 } = {}) {
  const rgba = new Uint8Array(size * size * 4);
  const feather = Math.max(1, size / 128);

  const inset = size * padding;
  const cx = size / 2;
  const cy = size / 2;
  const halfW = size / 2 - inset;
  const halfH = size / 2 - inset;
  const radius = halfW * 2 * 0.1875; // matches rx=96 on a 512 viewBox

  // Checkmark geometry, expressed as fractions of the icon box.
  const s = halfW * 2;
  const originX = cx - halfW;
  const originY = cy - halfH;
  const p = (fx, fy) => [originX + s * fx, originY + s * fy];
  const [ax, ay] = p(0.29, 0.52);
  const [bx, by] = p(0.435, 0.665);
  const [dx, dy] = p(0.72, 0.35);
  const stroke = s * 0.085;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      const bgCov = coverage(sdRoundedRect(px, py, cx, cy, halfW, halfH, radius), feather);
      if (bgCov <= 0) continue;

      const tickCov = Math.max(
        coverage(sdSegment(px, py, ax, ay, bx, by, stroke / 2), feather),
        coverage(sdSegment(px, py, bx, by, dx, dy, stroke / 2), feather)
      );

      let r;
      let g;
      let b;
      let a;

      if (monochrome) {
        // White glyph on transparent — what Android wants for a status badge.
        r = 255;
        g = 255;
        b = 255;
        a = Math.round(255 * tickCov * bgCov);
      } else {
        const t = py / size; // matches --accent-gradient's 180deg
        const [gr, gg, gb] = gradientAt(t);
        r = Math.round(gr + (255 - gr) * tickCov);
        g = Math.round(gg + (255 - gg) * tickCov);
        b = Math.round(gb + (255 - gb) * tickCov);
        a = Math.round(255 * bgCov);
      }

      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }

  return rgba;
}

// ── Emit files ──────────────────────────────────────────────────────────────

mkdirSync(PUBLIC_DIR, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, opts: {} },
  { file: "icon-512.png", size: 512, opts: {} },
  { file: "apple-touch-icon.png", size: 180, opts: {} },
  { file: "badge-72.png", size: 72, opts: { monochrome: true } },
];

for (const { file, size, opts } of targets) {
  const png = encodePng(drawIcon(size, opts), size);
  writeFileSync(join(PUBLIC_DIR, file), png);
  console.log(`wrote public/${file} (${size}×${size}, ${png.length} bytes)`);
}
