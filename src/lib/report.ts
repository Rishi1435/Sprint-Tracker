// Composes the "Sprint Report" PDF from a `SprintSummary` using the minimal
// writer in `./pdf`. Layout is A4 portrait with a 56pt margin; everything is
// laid out top-down through a single `y` cursor so adding sections doesn't
// require recomputing coordinates.

import { PdfDoc, sanitizeText, type Rgb } from "./pdf";
import type { SprintSummary } from "./summary";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2; // 483
const FOOTER_TOP = PAGE_H - 58;

const C = {
  accent: [0.388, 0.4, 0.945] as Rgb,
  accentDeep: [0.243, 0.247, 0.686] as Rgb,
  accentSoft: [0.925, 0.929, 0.996] as Rgb,
  text: [0.071, 0.078, 0.11] as Rgb,
  muted: [0.337, 0.369, 0.478] as Rgb,
  faint: [0.525, 0.557, 0.659] as Rgb,
  border: [0.855, 0.875, 0.937] as Rgb,
  track: [0.929, 0.937, 0.969] as Rgb,
  white: [1, 1, 1] as Rgb,
  ok: [0.063, 0.725, 0.506] as Rgb,
};

/** Top-down layout cursor that knows how to break to a new page. */
class Layout {
  y = MARGIN;
  constructor(readonly doc: PdfDoc) {}

  /** Start a fresh page if `height` more points won't fit above the footer. */
  ensure(height: number): void {
    if (this.y + height <= FOOTER_TOP - 12) return;
    this.doc.addPage();
    this.y = MARGIN;
  }

  gap(h: number): void {
    this.y += h;
  }
}

function sectionHeading(l: Layout, label: string): void {
  l.ensure(34);
  l.doc.rect(MARGIN, l.y + 2, 3, 13, C.accent);
  l.doc.text(MARGIN + 11, l.y, label.toUpperCase(), {
    size: 11,
    bold: true,
    color: C.accentDeep,
    tracking: 1.3,
  });
  l.y += 24;
}

function progressBar(doc: PdfDoc, x: number, y: number, width: number, percent: number): void {
  const h = 7;
  doc.roundedRect(x, y, width, h, h / 2, C.track);
  const filled = (width * Math.max(0, Math.min(100, percent))) / 100;
  // A 1-task-in-21 bar would otherwise round to a sliver too thin to see.
  if (filled > 0) doc.roundedRect(x, y, Math.max(filled, h), h, h / 2, C.accent);
}

function coverBanner(doc: PdfDoc, s: SprintSummary): number {
  const bandH = 132;
  doc.rect(0, 0, PAGE_W, bandH, C.accentDeep);
  doc.rect(0, bandH - 4, PAGE_W, 4, C.accent);

  doc.text(MARGIN, 30, "SPRINT ROOM", {
    size: 10,
    bold: true,
    color: C.white,
    tracking: 2.2,
  });
  doc.text(MARGIN, 50, "21-Day Sprint Report", { size: 26, bold: true, color: C.white });

  const who = s.handle === s.name ? s.name : `${s.handle} · ${s.name}`;
  doc.text(MARGIN, 90, who, { size: 13, color: C.white });
  const range =
    s.startLabel === "Not started yet"
      ? "Sprint not started yet"
      : `${s.startLabel} – ${s.endLabel}  ·  Day ${s.currentDay} of ${s.totalDays}`;
  doc.text(MARGIN, 108, range, { size: 10.5, color: C.accentSoft });

  doc.text(PAGE_W - MARGIN, 44, `${s.percent}%`, {
    size: 42,
    bold: true,
    color: C.white,
    align: "right",
  });
  doc.text(PAGE_W - MARGIN, 92, "OVERALL COMPLETION", {
    size: 9,
    bold: true,
    color: C.accentSoft,
    align: "right",
    tracking: 1.6,
  });
  doc.text(PAGE_W - MARGIN, 106, `${s.tasksDone} of ${s.tasksTotal} tasks`, {
    size: 10,
    color: C.accentSoft,
    align: "right",
  });

  return bandH;
}

function statRow(l: Layout, s: SprintSummary): void {
  const gap = 11;
  const tileW = (CONTENT_W - gap * 3) / 4;
  const tiles: [string, string][] = [
    [`${s.daysComplete}/${s.totalDays}`, "Days finished"],
    [s.streak > 0 ? `${s.streak} days` : "None yet", "Current streak"],
    [`${s.avgPerActiveDay}`, "Tasks / active day"],
    [s.bestSubject ? `${s.bestSubject.percent}%` : "—", "Strongest subject"],
  ];
  l.ensure(76);
  tiles.forEach(([value, label], i) => {
    const x = MARGIN + i * (tileW + gap);
    l.doc.roundedRect(x, l.y, tileW, 62, 8, C.accentSoft);
    l.doc.text(x + 12, l.y + 12, value, { size: 17, bold: true, color: C.text });
    l.doc.text(x + 12, l.y + 38, label.toUpperCase(), {
      size: 7.5,
      bold: true,
      color: C.faint,
      tracking: 0.8,
    });
  });
  l.y += 62;
}

function subjectTable(l: Layout, s: SprintSummary): void {
  sectionHeading(l, "Subject breakdown");
  const labelW = 132;
  const barX = MARGIN + labelW + 8;
  const barW = 210;
  const rowH = 22;

  l.ensure(18);
  l.doc.text(MARGIN, l.y, "SUBJECT", { size: 7.5, bold: true, color: C.faint, tracking: 0.9 });
  l.doc.text(PAGE_W - MARGIN - 54, l.y, "DONE", {
    size: 7.5,
    bold: true,
    color: C.faint,
    tracking: 0.9,
    align: "right",
  });
  l.doc.text(PAGE_W - MARGIN, l.y, "%", {
    size: 7.5,
    bold: true,
    color: C.faint,
    tracking: 0.9,
    align: "right",
  });
  l.y += 12;
  l.doc.line(MARGIN, l.y, PAGE_W - MARGIN, l.y, C.border, 0.8);
  l.y += 8;

  for (const subject of s.subjects) {
    l.ensure(rowH);
    l.doc.text(MARGIN, l.y, subject.label, { size: 10, color: C.text });
    progressBar(l.doc, barX, l.y + 3, barW, subject.percent);
    l.doc.text(PAGE_W - MARGIN - 54, l.y, `${subject.done}/${subject.planned}`, {
      size: 9.5,
      color: C.muted,
      align: "right",
    });
    l.doc.text(PAGE_W - MARGIN, l.y, `${subject.percent}%`, {
      size: 9.5,
      bold: true,
      color: subject.percent >= 100 ? C.ok : C.text,
      align: "right",
    });
    l.y += rowH;
  }
}

function weekTable(l: Layout, s: SprintSummary): void {
  sectionHeading(l, "Week by week");
  const gap = 11;
  const cardW = (CONTENT_W - gap * 2) / 3;
  l.ensure(84);
  s.weeks.forEach((w, i) => {
    const x = MARGIN + i * (cardW + gap);
    l.doc.roundedRect(x, l.y, cardW, 72, 8, C.white);
    l.doc.line(x, l.y, x + cardW, l.y, C.border, 0.8);
    l.doc.line(x, l.y + 72, x + cardW, l.y + 72, C.border, 0.8);
    l.doc.text(x + 12, l.y + 11, `WEEK ${w.week}`, {
      size: 8,
      bold: true,
      color: C.accentDeep,
      tracking: 1.2,
    });
    l.doc.text(x + 12, l.y + 26, `${w.percent}%`, { size: 20, bold: true, color: C.text });
    l.doc.text(x + 12, l.y + 52, `${w.done}/${w.planned} tasks`, { size: 9, color: C.muted });
    progressBar(l.doc, x + 12, l.y + 66, cardW - 24, w.percent);
    l.doc.text(x + cardW - 12, l.y + 26, `${w.daysComplete}/${w.daysInWeek} days`, {
      size: 9,
      color: C.faint,
      align: "right",
    });
  });
  l.y += 72;
}

function highlights(l: Layout, s: SprintSummary): void {
  const lines: string[] = [];
  if (s.finished) {
    lines.push(`Sprint complete — all ${s.tasksTotal} planned tasks ticked off.`);
  } else {
    lines.push(
      `${s.tasksDone} of ${s.tasksTotal} tasks done (${s.percent}%), with ${s.daysComplete} of ${s.totalDays} days fully finished.`
    );
  }
  if (s.streak > 0) lines.push(`Longest run from day 1: ${s.streak} consecutive complete days.`);
  if (s.bestSubject) {
    lines.push(
      `Strongest subject: ${s.bestSubject.label} at ${s.bestSubject.percent}% (${s.bestSubject.done}/${s.bestSubject.planned}).`
    );
  }
  if (s.weakestSubject && s.weakestSubject.key !== s.bestSubject?.key) {
    lines.push(
      `Most ground left: ${s.weakestSubject.label} at ${s.weakestSubject.percent}% (${s.weakestSubject.done}/${s.weakestSubject.planned}).`
    );
  }
  if (lines.length === 0) return;

  sectionHeading(l, "Highlights");
  for (const line of lines) {
    l.ensure(20);
    l.doc.rect(MARGIN + 2, l.y + 4, 3, 3, C.accent);
    l.y = l.doc.paragraph(MARGIN + 14, l.y, line, CONTENT_W - 14, {
      size: 10,
      color: C.muted,
      lineHeight: 14,
    });
    l.y += 4;
  }
}

function dayTable(l: Layout, s: SprintSummary): void {
  sectionHeading(l, "Day by day");
  const cols = { day: MARGIN, name: MARGIN + 52, tasks: MARGIN + 168, bar: MARGIN + 232 };
  const barW = 150;

  const header = () => {
    l.doc.text(cols.day, l.y, "DAY", { size: 7.5, bold: true, color: C.faint, tracking: 0.9 });
    l.doc.text(cols.name, l.y, "WEEKDAY", { size: 7.5, bold: true, color: C.faint, tracking: 0.9 });
    l.doc.text(cols.tasks, l.y, "TASKS", { size: 7.5, bold: true, color: C.faint, tracking: 0.9 });
    l.doc.text(PAGE_W - MARGIN, l.y, "STATUS", {
      size: 7.5,
      bold: true,
      color: C.faint,
      tracking: 0.9,
      align: "right",
    });
    l.y += 12;
    l.doc.line(MARGIN, l.y, PAGE_W - MARGIN, l.y, C.border, 0.8);
    l.y += 8;
  };

  l.ensure(40);
  header();

  for (const day of s.days) {
    const noteLines = day.notes
      ? l.doc.wrap(day.notes, CONTENT_W - 66, 8.5, false, 3)
      : [];
    const rowH = 20 + (noteLines.length > 0 ? noteLines.length * 11 + 5 : 0);

    const before = l.doc.pageCount;
    l.ensure(rowH);
    if (l.doc.pageCount > before) header();

    if (day.complete) l.doc.roundedRect(MARGIN - 6, l.y - 3, CONTENT_W + 12, 19, 4, C.accentSoft);

    l.doc.text(cols.day, l.y, String(day.day).padStart(2, "0"), {
      size: 10,
      bold: true,
      color: C.text,
    });
    l.doc.text(cols.name, l.y, day.isSunday ? `${day.weekday} · GPP` : day.weekday, {
      size: 9.5,
      color: C.muted,
    });
    l.doc.text(cols.tasks, l.y, `${day.done}/${day.planned}`, { size: 9.5, color: C.muted });
    progressBar(l.doc, cols.bar, l.y + 3, barW, (day.done / day.planned) * 100);
    l.doc.text(
      PAGE_W - MARGIN,
      l.y,
      day.complete ? "Complete" : day.done > 0 ? "Partial" : "Not started",
      {
        size: 9,
        bold: day.complete,
        color: day.complete ? C.ok : day.done > 0 ? C.muted : C.faint,
        align: "right",
      }
    );
    l.y += 20;

    if (noteLines.length > 0) {
      l.doc.rect(cols.day + 4, l.y, 1.2, noteLines.length * 11 - 2, C.border);
      for (const line of noteLines) {
        l.doc.text(cols.day + 14, l.y, line, { size: 8.5, color: C.faint });
        l.y += 11;
      }
      l.y += 5;
    }
  }
}

/** Stamps the footer on every page once the page total is known. */
function stampFooters(doc: PdfDoc, s: SprintSummary): void {
  const total = doc.pageCount;
  for (let i = 0; i < total; i++) {
    doc.goToPage(i);
    doc.line(MARGIN, FOOTER_TOP, PAGE_W - MARGIN, FOOTER_TOP, C.border, 0.8);
    doc.text(MARGIN, FOOTER_TOP + 10, `Sprint Room · generated ${s.generatedLabel}`, {
      size: 8.5,
      color: C.faint,
    });
    doc.text(PAGE_W - MARGIN, FOOTER_TOP + 10, `Page ${i + 1} of ${total}`, {
      size: 8.5,
      color: C.faint,
      align: "right",
    });
  }
  doc.goToPage(total - 1);
}

export function buildSprintReport(s: SprintSummary): PdfDoc {
  const doc = new PdfDoc({
    width: PAGE_W,
    height: PAGE_H,
    title: `Sprint Report — ${s.name}`,
    author: s.name,
  });
  const l = new Layout(doc);

  l.y = coverBanner(doc, s) + 26;
  statRow(l, s);
  l.gap(24);
  subjectTable(l, s);
  l.gap(14);
  weekTable(l, s);
  l.gap(18);
  highlights(l, s);
  l.gap(14);
  dayTable(l, s);

  stampFooters(doc, s);
  return doc;
}

/** Convenience: a filesystem-safe filename for the download. */
export function reportFileName(s: SprintSummary, ext: "pdf" | "png"): string {
  const slug =
    sanitizeText(s.handle)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "sprint";
  return ext === "pdf" ? `sprint-report-${slug}.pdf` : `sprint-card-${slug}.png`;
}
