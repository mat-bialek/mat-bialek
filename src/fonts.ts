/**
 * Font measuring (fontkit) and embedding (subset-font -> woff2 data URIs).
 *
 * GitHub shows README SVGs through <img>, which can't load external fonts, so each SVG
 * carries @font-face rules holding only the glyphs it uses. Fontsource splits each weight
 * into "latin" and "latin-ext" files; both are embedded as separate families and listed in
 * order, so Polish letters (ł, ś…) fall back to the ext face per glyph.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as fontkit from "fontkit";
import subsetFont from "subset-font";

export type FontKey = "sans400" | "sans700" | "sans800" | "mono400" | "mono600";

const FILES: Record<FontKey, { pkg: string; file: string; weight: number; generic: string }> = {
  sans400: { pkg: "@fontsource/manrope", file: "manrope-SUBSET-400-normal.woff2", weight: 400, generic: "sans-serif" },
  sans700: { pkg: "@fontsource/manrope", file: "manrope-SUBSET-700-normal.woff2", weight: 700, generic: "sans-serif" },
  sans800: { pkg: "@fontsource/manrope", file: "manrope-SUBSET-800-normal.woff2", weight: 800, generic: "sans-serif" },
  mono400: { pkg: "@fontsource/jetbrains-mono", file: "jetbrains-mono-SUBSET-400-normal.woff2", weight: 400, generic: "monospace" },
  mono600: { pkg: "@fontsource/jetbrains-mono", file: "jetbrains-mono-SUBSET-600-normal.woff2", weight: 600, generic: "monospace" },
};

const require = createRequire(import.meta.url);

interface Face {
  buf: Buffer;
  font: fontkit.Font;
}

const cache = new Map<string, Face>();
function face(key: FontKey, subset: "latin" | "latin-ext"): Face {
  const id = `${key}:${subset}`;
  let f = cache.get(id);
  if (!f) {
    const { pkg, file } = FILES[key];
    const path = require.resolve(`${pkg}/files/${file.replace("SUBSET", subset)}`);
    const buf = readFileSync(path);
    f = { buf, font: fontkit.create(buf) as fontkit.Font };
    cache.set(id, f);
  }
  return f;
}

// fontkit's hasGlyphForCodePoint is unreliable on these subset files, so trust the cmap instead.
const covers = (f: Face, cp: number) => {
  const g = f.font.glyphForCodePoint(cp);
  return g.id !== 0;
};

/** Which embedded file draws this character: latin first, latin-ext as fallback. */
function faceFor(key: FontKey, cp: number): { subset: "latin" | "latin-ext"; f: Face } | null {
  const latin = face(key, "latin");
  if (covers(latin, cp)) return { subset: "latin", f: latin };
  const ext = face(key, "latin-ext");
  if (covers(ext, cp)) return { subset: "latin-ext", f: ext };
  return null;
}

/** Advance width in px (no kerning; close enough for layout with a little slack). */
export function measure(text: string, key: FontKey, size: number, letterSpacing = 0): number {
  let w = 0;
  for (const ch of text) {
    const hit = faceFor(key, ch.codePointAt(0)!);
    w += hit ? (hit.f.font.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth * size) / hit.f.font.unitsPerEm : size * 0.6;
  }
  return w + letterSpacing * Math.max(0, [...text].length - 1);
}

/** Greedy word wrap to `width` px. */
export function wrap(text: string, key: FontKey, size: number, width: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const trial = cur ? `${cur} ${word}` : word;
    if (measure(trial, key, size) <= width || !cur) cur = trial;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Shorten with an ellipsis-like "..." until it fits. */
export function truncate(text: string, key: FontKey, size: number, width: number): string {
  if (measure(text, key, size) <= width + 0.5) return text; // slack for float error
  let t = text;
  while (t.length > 1 && measure(t + "...", key, size) > width) t = t.slice(0, -1);
  return t + "...";
}

export const fontClass = (key: FontKey) => `f-${key}`;

/** @font-face + class rules for every font key used, each subset to the characters it draws. */
export async function fontCss(used: Map<FontKey, Set<string>>): Promise<string> {
  const rules: string[] = [];
  for (const key of [...used.keys()].sort()) {
    const chars = [...used.get(key)!].sort();
    const bySubset: Record<"latin" | "latin-ext", string> = { latin: "", "latin-ext": "" };
    for (const ch of chars) {
      const hit = faceFor(key, ch.codePointAt(0)!);
      if (hit) bySubset[hit.subset] += ch;
    }
    const families: string[] = [];
    for (const subset of ["latin", "latin-ext"] as const) {
      if (!bySubset[subset]) continue;
      const out = await subsetFont(face(key, subset).buf, bySubset[subset], { targetFormat: "woff2" });
      const fam = `${key}-${subset === "latin" ? "a" : "b"}`;
      families.push(fam);
      rules.push(`@font-face{font-family:${fam};src:url(data:font/woff2;base64,${Buffer.from(out).toString("base64")}) format("woff2")}`);
    }
    const { weight, generic } = FILES[key];
    rules.push(`.${fontClass(key)}{font-family:${[...families, generic].join(",")};font-weight:${weight}}`);
  }
  return rules.join("\n");
}
