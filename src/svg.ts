/** Tiny SVG builder: collects elements and the glyphs each font draws, then emits one file. */
import { fontClass, fontCss, measure, type FontKey } from "./fonts.ts";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const n = (v: number) => Number(v.toFixed(2)).toString();

export interface TextOpts {
  font: FontKey;
  size: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  letterSpacing?: number;
}

/** A run of differently coloured pieces on one baseline. */
export interface Span {
  text: string;
  fill: string;
  font?: FontKey;
}

export class Svg {
  private parts: string[] = [];
  private used = new Map<FontKey, Set<string>>();
  private css: string[] = [];

  constructor(readonly width: number, public height: number, readonly title: string) {}

  private track(key: FontKey, text: string) {
    let set = this.used.get(key);
    if (!set) this.used.set(key, (set = new Set()));
    for (const ch of text) if (ch.trim()) set.add(ch);
  }

  raw(markup: string) {
    this.parts.push(markup);
    return this;
  }

  style(rule: string) {
    this.css.push(rule);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, o: { fill?: string; stroke?: string; r?: number; sw?: number } = {}) {
    return this.raw(
      `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${o.r ? ` rx="${n(o.r)}"` : ""} fill="${o.fill ?? "none"}"${
        o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 1}"` : ""
      }/>`,
    );
  }

  text(x: number, y: number, s: string, o: TextOpts) {
    this.track(o.font, s);
    const anchor = o.anchor && o.anchor !== "start" ? ` text-anchor="${o.anchor}"` : "";
    const ls = o.letterSpacing ? ` letter-spacing="${n(o.letterSpacing)}"` : "";
    return this.raw(
      `<text x="${n(x)}" y="${n(y)}" class="${fontClass(o.font)}" font-size="${n(o.size)}" fill="${o.fill}"${anchor}${ls} xml:space="preserve">${esc(s)}</text>`,
    );
  }

  /** Spans laid out left to right; returns the x after the last one. */
  spans(x: number, y: number, spans: Span[], font: FontKey, size: number) {
    let cx = x;
    for (const sp of spans) {
      const f = sp.font ?? font;
      this.text(cx, y, sp.text, { font: f, size, fill: sp.fill });
      cx += measure(sp.text, f, size);
    }
    return cx;
  }

  async toString(): Promise<string> {
    const fonts = await fontCss(this.used);
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${n(this.height)}" viewBox="0 0 ${this.width} ${n(this.height)}" role="img" aria-label="${esc(this.title)}">`,
      `<title>${esc(this.title)}</title>`,
      `<style>\n${fonts}\n${this.css.join("\n")}\n</style>`,
      ...this.parts,
      `</svg>`,
      "",
    ].join("\n");
  }
}
