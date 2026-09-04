// The shareable progress card, built as an SVG string and rasterised to PNG in
// the browser via `Image` + `canvas.toBlob()`.
//
// Deliberately *not* `html2canvas`: it would drag in ~200 KB to re-implement a
// layout engine we don't need, and it can't see the real card anyway (the
// dashboard has no element shaped like this). Hand-writing the SVG is smaller,
// deterministic, and produces identical output on every browser.
//
// Three constraints come with the SVG-inside-`<img>` route, and they shape
// everything below:
//   1. No external resources load — so no webfonts (generic families only) and
//      no CSS custom properties (theme colours are hardcoded here).
//   2. `<foreignObject>` doesn't render — so no HTML, only real SVG primitives.
//   3. A `data:` URL keeps the canvas untainted, so `toBlob()` still works.

import { measureText } from "./pdf";
import type { SprintSummary } from "./summary";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

export type CardTheme = "light" | "dark";

interface Palette {
  bgFrom: string;
  bgTo: string;
  surface: string;
  border: string;
  track: string;
  text: string;
  muted: string;
  faint: string;
  accent: string;
  accentTo: string;
}

const PALETTES: Record<CardTheme, Palette> = {
  dark: {
    bgFrom: "#0d0f14",
    bgTo: "#171b25",
    surface: "#15181f",
    border: "#272c37",
    track: "#1f2430",
    text: "#e8ebf1",
    muted: "#98a0ad",
    faint: "#6d7583",
    accent: "#93a3ff",
    accentTo: "#8494fb",
  },
  light: {
    bgFrom: "#ffffff",
    bgTo: "#e8ebf2",
    surface: "#f4f6f9",
    border: "#d7dae2",
    track: "#e6e9ef",
    text: "#15171c",
    muted: "#545b66",
    faint: "#6f7681",
    accent: "#2743d4",
    accentTo: "#4a63e8",
  },
};

// The app mark keeps its own colours in both themes — it's the icon on the
// user's home screen, and a white tick needs the deep ultramarine behind it.
const MARK_FROM = "#3a55e0";
const MARK_TO = "#2340c9";

const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Trim to fit a pixel budget. Helvetica metrics are only an estimate for
 * whatever font the renderer actually picks, so leave a little slack.
 */
function fit(text: string, maxWidth: number, size: number, bold: boolean): string {
  if (measureText(text, size, bold) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && measureText(`${out}…`, size, bold) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out.trimEnd()}…`;
}

interface TextOpts {
  size: number;
  fill: string;
  bold?: boolean;
  anchor?: "start" | "middle" | "end";
  tracking?: number;
  opacity?: number;
}

function text(x: number, baseline: number, body: string, o: TextOpts): string {
  const attrs = [
    `x="${x}"`,
    `y="${baseline}"`,
    `font-family="${FONT}"`,
    `font-size="${o.size}"`,
    `font-weight="${o.bold ? 700 : 400}"`,
    `fill="${o.fill}"`,
  ];
  if (o.anchor && o.anchor !== "start") attrs.push(`text-anchor="${o.anchor}"`);
  if (o.tracking) attrs.push(`letter-spacing="${o.tracking}"`);
  if (o.opacity !== undefined) attrs.push(`opacity="${o.opacity}"`);
  return `<text ${attrs.join(" ")}>${esc(body)}</text>`;
}

function bar(x: number, y: number, width: number, height: number, pct: number, p: Palette): string {
  const filled = Math.max(pct > 0 ? height : 0, Math.round((width * Math.min(100, pct)) / 100));
  const r = height / 2;
  return (
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${r}" fill="${p.track}"/>` +
    (filled > 0
      ? `<rect x="${x}" y="${y}" width="${filled}" height="${height}" rx="${r}" fill="url(#barGrad)"/>`
      : "")
  );
}

function statTile(x: number, y: number, w: number, value: string, label: string, p: Palette): string {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="98" rx="18" fill="${p.surface}" stroke="${p.border}" stroke-width="1.5"/>` +
    text(x + 22, y + 56, value, { size: 34, fill: p.text, bold: true }) +
    text(x + 22, y + 80, label, { size: 14, fill: p.faint })
  );
}

export interface ShareCardOptions {
  theme?: CardTheme;
  /** Device-pixel multiplier for the PNG; 2 gives a crisp 2400×1260. */
  scale?: number;
}

export function buildShareCardSvg(s: SprintSummary, opts: ShareCardOptions = {}): string {
  const p = PALETTES[opts.theme ?? "dark"];
  const parts: string[] = [];

  // ── Backdrop ──────────────────────────────────────────────────────────────
  parts.push(`<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bgGrad)"/>`);

  // ── Header ────────────────────────────────────────────────────────────────
  parts.push(
    `<rect x="64" y="52" width="46" height="46" rx="13" fill="url(#markGrad)"/>` +
      `<path d="M78 76 l7 7 l14 -16" fill="none" stroke="#ffffff" stroke-width="4.5" ` +
      `stroke-linecap="round" stroke-linejoin="round"/>`
  );
  parts.push(text(126, 85, "Sprint Room", { size: 25, fill: p.text, bold: true }));
  parts.push(
    text(CARD_WIDTH - 64, 84, "21-day job prep sprint", {
      size: 17,
      fill: p.faint,
      anchor: "end",
    })
  );
  parts.push(
    `<line x1="64" y1="126" x2="${CARD_WIDTH - 64}" y2="126" stroke="${p.border}" stroke-width="1.5"/>`
  );

  // ── Headline + progress ring ───────────────────────────────────────────────
  const headline = s.finished ? `${s.handle} finished the sprint` : `${s.handle}'s sprint`;
  parts.push(
    text(64, 208, fit(headline, 620, 46, true), { size: 46, fill: p.text, bold: true })
  );
  const subtitle = s.startLabel === "Not started yet"
    ? "Not started yet"
    : `Day ${s.currentDay} of ${s.totalDays}, ${s.startLabel} – ${s.endLabel}`;
  parts.push(text(64, 246, fit(subtitle, 620, 21, false), { size: 21, fill: p.muted }));

  const ringR = 100;
  const ringCx = 992;
  const ringCy = 296;
  const circumference = 2 * Math.PI * ringR;
  const filledArc = (circumference * Math.min(100, Math.max(0, s.percent))) / 100;
  parts.push(
    `<circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${p.track}" stroke-width="26"/>`
  );
  if (filledArc > 0) {
    parts.push(
      `<circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="url(#ringGrad)" ` +
        `stroke-width="26" stroke-linecap="round" ` +
        `stroke-dasharray="${filledArc.toFixed(2)} ${(circumference - filledArc).toFixed(2)}" ` +
        `transform="rotate(-90 ${ringCx} ${ringCy})"/>`
    );
  }
  parts.push(
    text(ringCx, ringCy + 16, `${s.percent}%`, { size: 62, fill: p.text, bold: true, anchor: "middle" })
  );
  parts.push(
    text(ringCx, ringCy + 48, "complete", {
      size: 17,
      fill: p.faint,
      anchor: "middle",
    })
  );

  // ── Stat tiles ────────────────────────────────────────────────────────────
  const tileW = 196;
  const tileGap = 20;
  parts.push(statTile(64, 286, tileW, `${s.daysComplete}/${s.totalDays}`, "Days done", p));
  parts.push(
    statTile(64 + tileW + tileGap, 286, tileW, s.streak > 0 ? `${s.streak}d` : "—", "Streak", p)
  );
  parts.push(
    statTile(64 + (tileW + tileGap) * 2, 286, tileW, `${s.tasksDone}/${s.tasksTotal}`, "Tasks", p)
  );

  // ── Subject bars: two columns of four, in plan order ──────────────────────
  const rows = s.subjects;
  const colX = [64, 620];
  const rowPitch = 34;
  const rowTop = 424;
  rows.forEach((subject, i) => {
    const x = colX[Math.floor(i / 4)];
    const y = rowTop + (i % 4) * rowPitch;
    parts.push(
      text(x, y + 13, fit(subject.label, 132, 16, false), { size: 16, fill: p.muted })
    );
    parts.push(bar(x + 144, y + 3, 268, 12, subject.percent, p));
    parts.push(
      text(x + 480, y + 13, `${subject.done}/${subject.planned}`, {
        size: 15,
        fill: p.faint,
        bold: true,
        anchor: "end",
      })
    );
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  parts.push(
    `<line x1="64" y1="566" x2="${CARD_WIDTH - 64}" y2="566" stroke="${p.border}" stroke-width="1.5"/>`
  );
  const footerLeft = s.bestSubject
    ? `Strongest: ${s.bestSubject.label} (${s.bestSubject.percent}%)`
    : "Aptitude, Reasoning, Verbal, CS, Java, DSA, LeetCode";
  parts.push(text(64, 597, fit(footerLeft, 700, 17, false), { size: 17, fill: p.muted }));
  parts.push(
    text(CARD_WIDTH - 64, 597, `${s.avgPerActiveDay} tasks/active day`, {
      size: 17,
      fill: p.faint,
      anchor: "end",
    })
  );

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" ` +
    `viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">` +
    `<defs>` +
    `<linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${p.bgFrom}"/><stop offset="1" stop-color="${p.bgTo}"/>` +
    `</linearGradient>` +
    `<linearGradient id="markGrad" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${MARK_FROM}"/><stop offset="1" stop-color="${MARK_TO}"/>` +
    `</linearGradient>` +
    `<linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accentTo}"/>` +
    `</linearGradient>` +
    `<linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accentTo}"/>` +
    `</linearGradient>` +
    `</defs>` +
    parts.join("") +
    `</svg>`
  );
}

/** Rasterise the card to a PNG blob. Browser-only. */
export async function renderShareCardPng(
  summary: SprintSummary,
  opts: ShareCardOptions = {}
): Promise<Blob> {
  const svg = buildShareCardSvg(summary, opts);
  // `encodeURIComponent` rather than base64: no `btoa` Latin-1 blowup on
  // non-ASCII names, and the URL stays readable when debugging.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const img = new Image();
  img.width = CARD_WIDTH;
  img.height = CARD_HEIGHT;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Couldn't draw the share card image."));
    img.src = url;
  });

  const scale = Math.max(1, Math.min(3, opts.scale ?? 2));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(CARD_WIDTH * scale);
  canvas.height = Math.round(CARD_HEIGHT * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't available in this browser.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the PNG."))),
      "image/png"
    );
  });
}
