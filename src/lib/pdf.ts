// A tiny dependency-free PDF 1.4 writer — only what the sprint report needs:
// the standard-14 Helvetica pair, filled rectangles, straight lines, and
// left/centre/right-aligned text. Pulling in `jspdf` (~350 KB gzipped) for a
// two-page report isn't worth the bundle.
//
// The whole file is assembled as a JS string and emitted with
// `charCodeAt(i) & 0xff`, so `str.length` *is* the byte length. That identity is
// what lets the xref table be built from plain string offsets — which is also
// why every glyph is sanitised down to WinAnsi single bytes before it's written.

/** Glyph advance widths in 1/1000 em, indexed by `charCode - 32` (space…tilde). */
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const HELVETICA_BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

/**
 * Unicode the report is likely to carry (typographic dashes and quotes from
 * user-typed notes) folded onto ASCII lookalikes. Anything still outside
 * 0x20–0x7e after this — emoji above all — is dropped, since the standard-14
 * fonts have no glyph for it and a stray high byte would render as mojibake.
 */
const TRANSLITERATE: Record<string, string> = {
  "‘": "'", "’": "'", "‚": ",", "‛": "'",
  "“": '"', "”": '"', "„": '"',
  "–": "-", "—": "-", "―": "-", "−": "-",
  "…": "...", "•": "-", "·": "-", "→": "->",
  " ": " ", " ": " ", " ": " ", " ": " ",
  "×": "x", "⁄": "/", "′": "'", "″": '"',
  "é": "e", "è": "e", "ê": "e", "á": "a", "à": "a",
  "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ç": "c",
};

export function sanitizeText(input: string): string {
  let out = "";
  for (const ch of input) {
    const mapped = TRANSLITERATE[ch];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    const code = ch.codePointAt(0) ?? 0;
    if (code === 9) out += "  ";
    else if (code >= 0x20 && code <= 0x7e) out += ch;
    // Everything else (emoji, CJK, control bytes) is silently dropped.
  }
  return out;
}

/** PDF literal strings need `\`, `(` and `)` escaped; the rest is already safe. */
function escapePdfString(s: string): string {
  return s.replace(/([\\()])/g, "\\$1");
}

/** Coordinates rounded to 2dp — PDF has no use for float noise, and it keeps
    the content stream (and therefore `/Length`) small. */
function num(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n * 100) / 100);
}

export type Rgb = [number, number, number];

export interface TextOptions {
  size?: number;
  bold?: boolean;
  color?: Rgb;
  align?: "left" | "center" | "right";
  /** Extra letter tracking in points, applied by the `Tc` operator. */
  tracking?: number;
}

export interface ParagraphOptions extends TextOptions {
  lineHeight?: number;
  maxLines?: number;
}

export interface PdfDocOptions {
  width?: number;
  height?: number;
  title?: string;
  author?: string;
}

/** Measure a *sanitised* string in points. */
export function measureText(text: string, size: number, bold = false): number {
  const widths = bold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const idx = text.charCodeAt(i) - 32;
    total += widths[idx] ?? widths[0];
  }
  return (total * size) / 1000;
}

export class PdfDoc {
  readonly width: number;
  readonly height: number;
  private readonly title: string;
  private readonly author: string;
  /** One array of content-stream operators per page; drawing targets `activeIndex`. */
  private pages: string[][] = [[]];
  private activeIndex = 0;

  constructor(opts: PdfDocOptions = {}) {
    // A4 at 72 dpi, rounded to whole points.
    this.width = opts.width ?? 595;
    this.height = opts.height ?? 842;
    this.title = sanitizeText(opts.title ?? "Sprint Report");
    this.author = sanitizeText(opts.author ?? "Sprint Room");
  }

  get pageCount(): number {
    return this.pages.length;
  }

  addPage(): void {
    this.pages.push([]);
    this.activeIndex = this.pages.length - 1;
  }

  /**
   * Re-target drawing at an already-created page. Used to stamp "Page 2 of 5"
   * footers once the total is finally known.
   */
  goToPage(index: number): void {
    if (index < 0 || index >= this.pages.length) throw new RangeError(`No page ${index}`);
    this.activeIndex = index;
  }

  private get current(): string[] {
    return this.pages[this.activeIndex];
  }

  /** Width of `text` after sanitising, in points. */
  measure(text: string, size: number, bold = false): number {
    return measureText(sanitizeText(text), size, bold);
  }

  /**
   * Draw one line of text. `yTop` is measured from the top of the page (the
   * rest of the app thinks top-down; PDF's origin is bottom-left).
   * Returns the advance width so callers can chain runs on one line.
   */
  text(x: number, yTop: number, raw: string, opts: TextOptions = {}): number {
    const { size = 11, bold = false, color = [0.1, 0.11, 0.16], align = "left", tracking = 0 } = opts;
    const clean = sanitizeText(raw);
    if (!clean) return 0;
    const width = measureText(clean, size, bold) + tracking * Math.max(0, clean.length - 1);
    const startX = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
    const y = this.height - yTop - size;
    this.current.push(
      `BT ${num(color[0])} ${num(color[1])} ${num(color[2])} rg /${bold ? "F2" : "F1"} ${num(size)} Tf` +
        (tracking ? ` ${num(tracking)} Tc` : "") +
        ` ${num(startX)} ${num(y)} Td (${escapePdfString(clean)}) Tj ET`
    );
    return width;
  }

  /**
   * Word-wrapped block. Returns the `yTop` immediately below the last line so
   * callers can keep stacking without tracking line counts themselves.
   */
  paragraph(x: number, yTop: number, raw: string, maxWidth: number, opts: ParagraphOptions = {}): number {
    const { size = 11, bold = false, lineHeight = size * 1.45, maxLines = Infinity } = opts;
    const lines = this.wrap(raw, maxWidth, size, bold, maxLines);
    let y = yTop;
    for (const line of lines) {
      this.text(x, y, line, opts);
      y += lineHeight;
    }
    return y;
  }

  /** Greedy word wrap on sanitised text; over-long words are hard-split. */
  wrap(raw: string, maxWidth: number, size: number, bold = false, maxLines = Infinity): string[] {
    const clean = sanitizeText(raw).replace(/\s+/g, " ").trim();
    if (!clean || maxLines < 1) return [];
    const words = clean.split(" ");
    const lines: string[] = [];
    let line = "";
    let truncated = false;

    const commit = (text: string) => {
      if (lines.length >= maxLines) {
        truncated = true;
        return false;
      }
      lines.push(text);
      return true;
    };

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const candidate = line ? `${line} ${word}` : word;
      if (measureText(candidate, size, bold) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line && !commit(line)) {
        line = "";
        break;
      }
      if (measureText(word, size, bold) <= maxWidth) {
        line = word;
        continue;
      }
      // A single unbreakable token wider than the column: split by glyph.
      let chunk = "";
      for (const ch of word) {
        if (chunk && measureText(chunk + ch, size, bold) > maxWidth) {
          if (!commit(chunk)) {
            chunk = "";
            break;
          }
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
      if (truncated) break;
    }

    if (line) {
      if (!commit(line)) truncated = true;
    }
    // Signal the cut rather than silently losing the tail of a long note.
    if (truncated && lines.length > 0) {
      const last = lines[lines.length - 1].replace(/[\s,.;:]+$/, "");
      let trimmed = last;
      while (trimmed && measureText(`${trimmed}...`, size, bold) > maxWidth) {
        trimmed = trimmed.slice(0, -1);
      }
      lines[lines.length - 1] = `${trimmed}...`;
    }
    return lines;
  }

  rect(x: number, yTop: number, w: number, h: number, color: Rgb): void {
    const y = this.height - yTop - h;
    this.current.push(
      `${num(color[0])} ${num(color[1])} ${num(color[2])} rg ${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`
    );
  }

  line(x1: number, yTop1: number, x2: number, yTop2: number, color: Rgb, lineWidth = 0.75): void {
    this.current.push(
      `${num(color[0])} ${num(color[1])} ${num(color[2])} RG ${num(lineWidth)} w ` +
        `${num(x1)} ${num(this.height - yTop1)} m ${num(x2)} ${num(this.height - yTop2)} l S`
    );
  }

  /** Rounded-corner rectangle drawn with four Bézier arcs — used for pills. */
  roundedRect(x: number, yTop: number, w: number, h: number, r: number, color: Rgb): void {
    const radius = Math.min(r, w / 2, h / 2);
    const y = this.height - yTop - h;
    const k = radius * 0.5523;
    const x1 = x + w;
    const y1 = y + h;
    this.current.push(
      `${num(color[0])} ${num(color[1])} ${num(color[2])} rg ` +
        `${num(x + radius)} ${num(y)} m ` +
        `${num(x1 - radius)} ${num(y)} l ` +
        `${num(x1 - radius + k)} ${num(y)} ${num(x1)} ${num(y + radius - k)} ${num(x1)} ${num(y + radius)} c ` +
        `${num(x1)} ${num(y1 - radius)} l ` +
        `${num(x1)} ${num(y1 - radius + k)} ${num(x1 - radius + k)} ${num(y1)} ${num(x1 - radius)} ${num(y1)} c ` +
        `${num(x + radius)} ${num(y1)} l ` +
        `${num(x + radius - k)} ${num(y1)} ${num(x)} ${num(y1 - radius + k)} ${num(x)} ${num(y1 - radius)} c ` +
        `${num(x)} ${num(y + radius)} l ` +
        `${num(x)} ${num(y + radius - k)} ${num(x + radius - k)} ${num(y)} ${num(x + radius)} ${num(y)} c ` +
        `f`
    );
  }

  private collectPages(): string[] {
    return this.pages.map((ops) => ops.join("\n"));
  }

  /** Serialise to PDF source. Exposed mainly so tests can assert on structure. */
  toString(): string {
    const pageStreams = this.collectPages();
    const n = pageStreams.length;
    const firstPageObj = 3;
    const firstContentObj = firstPageObj + n;
    const fontRegularObj = firstContentObj + n;
    const fontBoldObj = fontRegularObj + 1;
    const infoObj = fontBoldObj + 1;
    const totalObjs = infoObj;

    const objects: string[] = [];
    objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
    objects.push(
      `<< /Type /Pages /Count ${n} /Kids [${pageStreams
        .map((_, i) => `${firstPageObj + i} 0 R`)
        .join(" ")}] >>`
    );
    pageStreams.forEach((_, i) => {
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(this.width)} ${num(this.height)}] ` +
          `/Resources << /Font << /F1 ${fontRegularObj} 0 R /F2 ${fontBoldObj} 0 R >> >> ` +
          `/Contents ${firstContentObj + i} 0 R >>`
      );
    });
    pageStreams.forEach((stream) => {
      objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    });
    objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
    objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
    objects.push(
      `<< /Title (${escapePdfString(this.title)}) /Author (${escapePdfString(this.author)}) ` +
        `/Creator (Sprint Room) /Producer (Sprint Room) >>`
    );

    let body = "%PDF-1.4\n%\xc7\xec\x8f\xa2\n";
    const offsets: number[] = [];
    objects.forEach((obj, i) => {
      offsets.push(body.length);
      body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });

    const xrefStart = body.length;
    let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      xref += `${String(off).padStart(10, "0")} 00000 n \n`;
    }
    const trailer =
      `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R /Info ${infoObj} 0 R >>\n` +
      `startxref\n${xrefStart}\n%%EOF\n`;

    return body + xref + trailer;
  }

  toBytes(): Uint8Array {
    const src = this.toString();
    const bytes = new Uint8Array(src.length);
    for (let i = 0; i < src.length; i++) bytes[i] = src.charCodeAt(i) & 0xff;
    return bytes;
  }

  toBlob(): Blob {
    // `BlobPart` accepts the buffer directly; going through the raw string would
    // UTF-8 re-encode the binary header comment and shift every xref offset.
    return new Blob([this.toBytes() as unknown as BlobPart], { type: "application/pdf" });
  }
}
