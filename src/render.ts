/** One function per README slice. Each returns an Svg for a theme; same input -> same bytes. */
import type { HobbyIcon, LayerCard, ProfileConfig, Project } from "./config.ts";
import type { StackStats } from "./aggregate.ts";
import { measure, truncate, wrap, type FontKey } from "./fonts.ts";
import { Svg, type Span } from "./svg.ts";
import type { Theme } from "./theme.ts";

export const W = 840;
const X = 2; // inset so 1px card strokes aren't clipped
const CW = W - 2 * X;
const GAP = 28; // vertical breathing room at the bottom of each slice

const CAP = { font: "mono600" as FontKey, size: 11.5, letterSpacing: 1.4 };

function card(s: Svg, x: number, y: number, w: number, h: number, t: Theme, r = 14) {
  s.rect(x + 0.5, y + 0.5, w - 1, h - 1, { fill: t.card, stroke: t.border, r });
}

function caption(s: Svg, x: number, y: number, text: string, fill: string, anchor: "start" | "end" = "start") {
  s.text(x, y, text, { ...CAP, fill, anchor });
}

/** Horizontal arrow drawn as a path (the fonts have no arrow glyphs). */
function arrow(s: Svg, x: number, y: number, len: number, color: string, dir: 1 | -1 = 1) {
  const tip = dir === 1 ? x + len : x;
  const tail = dir === 1 ? x : x + len;
  s.raw(
    `<path d="M${tail} ${y}H${tip}M${tip - 5 * dir} ${y - 5}L${tip} ${y}L${tip - 5 * dir} ${y + 5}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
}

function pill(s: Svg, x: number, y: number, label: string, o: { fill?: string; stroke?: string; color: string; size?: number }) {
  const size = o.size ?? 13;
  const w = measure(label, "mono600", size) + 20;
  const h = size + 12;
  s.rect(x, y, w, h, { fill: o.fill ?? "none", stroke: o.stroke, r: 6 });
  s.text(x + w / 2, y + h / 2 + size * 0.36, label, { font: "mono600", size, fill: o.color, anchor: "middle" });
  return w;
}

/** Request line: METHOD  path  STATUS. Used by the header and /offline. */
function requestBar(s: Svg, x: number, y: number, w: number, path: string, status: string, t: Theme, size = 14) {
  const cut = path.lastIndexOf("/") + 1;
  const pillW = pill(s, x, y, "GET", { fill: t.client, color: t.onAccent, size: size - 1 });
  const ty = y + (size + 11) / 2 + size * 0.36;
  s.spans(x + pillW + 14, ty, [
    { text: path.slice(0, cut), fill: t.text },
    { text: path.slice(cut), fill: t.strong, font: "mono600" },
  ], "mono400", size);
  const sw = measure(status, "mono600", size - 1) + 20;
  pill(s, x + w - sw, y, status, { stroke: t.server, color: t.server, size: size - 1 });
}

// ---------------------------------------------------------------- header

export function header(cfg: ProfileConfig, t: Theme): Svg {
  const { hero } = cfg;
  const s = new Svg(W, 0, `GET ${cfg.apiPath} 200 OK. ${hero.name}, ${hero.role} to ${hero.target}. ${hero.tagline}`);
  card(s, X, 0, CW, 50, t);
  requestBar(s, X + 18, 12, CW - 36, cfg.apiPath, "200 OK", t);

  let y = 50 + 36 + 48;
  s.text(X, y, hero.name, { font: "sans800", size: 54, fill: t.strong, letterSpacing: -1 });
  y += 38;
  const x2 = s.spans(X, y, [{ text: hero.role, fill: t.client }], "sans700", 20);
  arrow(s, x2 + 10, y - 7, 22, t.muted);
  s.spans(x2 + 42, y, [{ text: hero.target, fill: t.server }], "sans700", 20);
  for (const line of wrap(hero.tagline, "sans400", 15, CW)) {
    y += 24;
    s.text(X, y, line, { font: "sans400", size: 15, fill: t.muted });
  }
  s.height = y + GAP + 8;
  return s;
}

// ---------------------------------------------------------------- lifecycle

const CHIP = { font: "sans400" as FontKey, size: 13, h: 26, padX: 10, gap: 6 };

function layoutChips(chips: string[], maxW: number) {
  const out: { text: string; x: number; y: number; w: number }[] = [];
  let x = 0, y = 0;
  for (const text of chips) {
    const w = Math.min(measure(text, CHIP.font, CHIP.size) + 2 * CHIP.padX, maxW);
    if (x > 0 && x + w > maxW) {
      x = 0;
      y += CHIP.h + CHIP.gap;
    }
    out.push({ text, x, y, w });
    x += w + CHIP.gap;
  }
  return { chips: out, height: chips.length ? y + CHIP.h : 0 };
}

function statusDot(s: Svg, cx: number, cy: number, state: LayerCard["status"]["state"], color: string) {
  if (state === "done") s.raw(`<circle cx="${cx}" cy="${cy}" r="4.5" fill="${color}"/>`);
  else if (state === "progress")
    s.raw(`<circle cx="${cx}" cy="${cy}" r="4" fill="none" stroke="${color}" stroke-width="1.5"/><path d="M${cx} ${cy - 4}A4 4 0 0 1 ${cx} ${cy + 4}Z" fill="${color}"/>`);
  else s.raw(`<circle cx="${cx}" cy="${cy}" r="4" fill="none" stroke="${color}" stroke-width="1.5"/>`);
}

export function lifecycle(cfg: ProfileConfig, t: Theme): Svg {
  const cards: [LayerCard, string][] = [
    [cfg.layers.client, t.client],
    [cfg.layers.api, t.server],
    [cfg.layers.infra, t.muted],
  ];
  const alt = cards.map(([c]) => `${c.label} ${c.title}: ${c.chips.join(", ")} (${c.status.text})`).join("; ");
  const s = new Svg(W, 0, `Request lifecycle. ${alt}`);
  caption(s, X, 12, "REQUEST LIFECYCLE", t.muted);

  const top = 30, arrowW = 56, pad = 18;
  const cw = (CW - 2 * arrowW) / 3;
  const layouts = cards.map(([c]) => layoutChips(c.chips, cw - 2 * pad));
  const cardH = pad + 14 + 32 + Math.max(...layouts.map((l) => l.height)) + 18 + 14 + pad;

  cards.forEach(([c, color], i) => {
    const x = X + i * (cw + arrowW);
    card(s, x, top, cw, cardH, t);
    // accent strip along the top edge, clipped to the card's rounded corners
    const clip = `layer-${t.name}-${i}`;
    s.raw(`<clipPath id="${clip}"><rect x="${x}" y="${top}" width="${cw}" height="${cardH}" rx="14"/></clipPath>`);
    s.raw(`<rect x="${x}" y="${top}" width="${cw}" height="3" fill="${color}" clip-path="url(#${clip})"/>`);
    let y = top + pad + 12;
    caption(s, x + pad, y, c.label, color);
    y += 28;
    s.text(x + pad, y, c.title, { font: "sans700", size: 18, fill: t.strong });
    y += 16;
    for (const chip of layouts[i]!.chips) {
      s.rect(x + pad + chip.x + 0.5, y + chip.y + 0.5, chip.w - 1, CHIP.h - 1, { fill: t.chip, stroke: t.border, r: 7 });
      const label = truncate(chip.text, CHIP.font, CHIP.size, chip.w - 2 * CHIP.padX);
      s.text(x + pad + chip.x + CHIP.padX, y + chip.y + 17.5, label, { font: CHIP.font, size: CHIP.size, fill: t.text });
    }
    const sy = top + cardH - pad - 4;
    statusDot(s, x + pad + 4.5, sy - 4, c.status.state, color);
    s.text(x + pad + 16, sy, c.status.text, { font: "mono400", size: 12, fill: color });
  });

  const labels = ["fetch()", "deploy"];
  labels.forEach((label, i) => {
    const ax = X + (i + 1) * cw + i * arrowW;
    const cy = top + cardH / 2;
    s.text(ax + arrowW / 2, cy - 10, label, { font: "mono400", size: 11, fill: t.muted, anchor: "middle" });
    arrow(s, ax + 9, cy + 4, arrowW - 18, t.muted);
  });

  // Animated packets: request travels right, response comes back. Respects reduced motion.
  const ly = top + cardH + 24;
  const x0 = X + cw / 2, x1 = X + CW - cw / 2, dist = x1 - x0;
  s.raw(`<path d="M${x0} ${ly}H${x1}" stroke="${t.border}" stroke-width="2" stroke-linecap="round"/>`);
  s.style(
    `.req{animation:req 3.6s ease-in-out infinite}.res{animation:res 3.6s ease-in-out infinite;opacity:0}` +
      `@keyframes req{0%{transform:translateX(0);opacity:1}46%{transform:translateX(${dist}px);opacity:1}50%,100%{transform:translateX(${dist}px);opacity:0}}` +
      `@keyframes res{0%,50%{transform:translateX(0);opacity:0}54%{opacity:1}96%{transform:translateX(-${dist}px);opacity:1}100%{transform:translateX(-${dist}px);opacity:0}}` +
      `@media (prefers-reduced-motion:reduce){.req,.res{animation:none}.res{opacity:0}}`,
  );
  s.raw(`<g class="req"><circle cx="${x0}" cy="${ly}" r="10" fill="${t.glowClient}"/><circle cx="${x0}" cy="${ly}" r="6" fill="${t.client}"/></g>`);
  s.raw(`<g class="res"><circle cx="${x1}" cy="${ly}" r="10" fill="${t.glowServer}"/><circle cx="${x1}" cy="${ly}" r="6" fill="${t.server}"/></g>`);

  const ty = ly + 30;
  const rw = measure("request", "mono400", 11.5);
  s.text(x0, ty, "request", { font: "mono400", size: 11.5, fill: t.client });
  arrow(s, x0 + rw + 8, ty - 4, 16, t.client);
  s.text(x1, ty, "response 200", { font: "mono400", size: 11.5, fill: t.server, anchor: "end" });
  arrow(s, x1 - measure("response 200", "mono400", 11.5) - 24, ty - 4, 16, t.server, -1);
  s.height = ty + GAP + 6;
  return s;
}

// ---------------------------------------------------------------- response body

type Tok = { text: string; fill: string };

function jsonLines(obj: Record<string, string | string[]>, t: Theme, maxW: number, size: number): Tok[][] {
  const P = (text: string): Tok => ({ text, fill: t.jsonPunct });
  const K = (text: string): Tok => ({ text: JSON.stringify(text), fill: t.jsonKey });
  const S = (text: string): Tok => ({ text: JSON.stringify(text), fill: t.jsonString });
  const width = (toks: Tok[]) => measure(toks.map((x) => x.text).join(""), "mono400", size);

  const lines: Tok[][] = [[P("{")]];
  const entries = Object.entries(obj);
  entries.forEach(([key, value], i) => {
    const comma = i < entries.length - 1 ? [P(",")] : [];
    const head = [P("  "), K(key), P(": ")];
    if (!Array.isArray(value)) return void lines.push([...head, S(value), ...comma]);

    const one = [...head, P("["), ...value.flatMap((v, j) => (j ? [P(", "), S(v)] : [S(v)])), P("]"), ...comma];
    if (width(one) <= maxW) return void lines.push(one);
    // Too wide: continue items on new lines aligned after the "[".
    const indent = " ".repeat(head.reduce((a, x) => a + x.text.length, 0) + 1);
    let line: Tok[] = [...head, P("[")];
    value.forEach((v, j) => {
      const last = j === value.length - 1;
      const piece = [S(v), last ? P("]") : P(","), ...(last ? comma : [])];
      const sep = line.length > head.length + 1 ? [P(" ")] : [];
      if (line.length > head.length + 1 && width([...line, ...sep, ...piece]) > maxW) {
        lines.push(line);
        line = [P(indent), ...piece];
      } else line.push(...sep, ...piece);
    });
    lines.push(line);
  });
  lines.push([P("}")]);
  return lines;
}

export function response(cfg: ProfileConfig, t: Theme): Svg {
  const s = new Svg(W, 0, `Response body, JSON: ${JSON.stringify(cfg.response)}`);
  const pad = 22, size = 14, lh = 23, headH = 44;
  const lines = jsonLines(cfg.response, t, CW - 2 * pad, size);
  const h = headH + 18 + lines.length * lh + 14;
  card(s, X, 0, CW, h, t);
  caption(s, X + 18, 27, "RESPONSE BODY", t.muted);
  s.text(X + CW - 18, 27, "application/json", { font: "mono400", size: 12, fill: t.muted, anchor: "end" });
  s.rect(X + 1, headH, CW - 2, 1, { fill: t.border });
  lines.forEach((toks, i) => s.spans(X + pad, headH + 18 + (i + 1) * lh - 7, toks as Span[], "mono400", size));
  s.height = h + GAP;
  return s;
}

// ---------------------------------------------------------------- stack usage

// Libraries drawn in the server colour; everything else counts as client-side.
const SERVER_LIBS = ["express", "fastify", "koa", "hono", "pg", "postgres", "mysql2", "mongoose", "mongodb", "redis", "ioredis", "prisma", "@prisma/*", "drizzle-orm", "knex", "typeorm", "sequelize", "jsonwebtoken", "jose", "bcrypt*", "argon2", "cors", "helmet", "dotenv", "@nestjs/*", "socket.io", "ws", "bullmq", "pino*", "winston", "nodemailer"];
const isServerLib = (name: string) =>
  SERVER_LIBS.some((g) => new RegExp("^" + g.replace(/[.+?^${}()|[\]\\/]/g, "\\$&").replace(/\*/g, ".*") + "$").test(name));

export function stack(stats: StackStats | null, t: Theme): Svg {
  const langs = stats?.languages ?? [];
  const libs = stats?.libraries ?? [];
  const s = new Svg(
    W,
    0,
    langs.length
      ? `Stack usage across selected repos. Languages: ${langs.map((l) => `${l.name} ${l.pct}%`).join(", ")}. Libraries: ${libs.map((l) => `${l.name} in ${l.repos} repos`).join(", ")}.`
      : "Stack usage: waiting for the first data sync.",
  );
  const pad = 22, colGap = 36;
  const colW = (CW - 2 * pad - colGap) / 2;
  // Languages: bar row + legend rows; libraries: one row each. Both start under the column titles.
  const bodyH = Math.max(langs.length ? 26 + langs.length * 26 : 40, libs.length * 26);
  const h = pad + 16 + 26 + 8 + bodyH + pad + (stats?.sample ? 24 : 0);
  card(s, X, 0, CW, h, t);

  caption(s, X + pad, pad + 10, "STACK USAGE · ACROSS SELECTED REPOS", t.muted);
  if (stats && stats.repos.total) {
    const r = stats.repos;
    const parts = [`${r.total} repos`, r.private ? `${r.public} public + ${r.private} private` : null, `updated ${stats.generatedAt.slice(0, 10)}`];
    s.text(X + CW - pad, pad + 10, parts.filter(Boolean).join(" · "), { font: "mono400", size: 11.5, fill: t.muted, anchor: "end" });
  }

  const top = pad + 16 + 26;
  const lx = X + pad, rx = X + pad + colW + colGap;
  s.text(lx, top, "Languages", { font: "sans700", size: 15, fill: t.strong });
  s.spans(rx, top, [{ text: "Libraries", fill: t.strong }], "sans700", 15);
  s.text(rx + measure("Libraries", "sans700", 15) + 10, top, "from package.json", { font: "mono400", size: 11.5, fill: t.muted });

  if (!langs.length) {
    s.text(lx, top + 40, "Waiting for the first sync. Run the Action once.", { font: "mono400", size: 12.5, fill: t.muted });
  } else {
    // stacked bar, rounded as a whole via clipPath
    const by = top + 16, bh = 12, clip = `clip-${t.name}`;
    s.raw(`<clipPath id="${clip}"><rect x="${lx}" y="${by}" width="${colW}" height="${bh}" rx="6"/></clipPath><g clip-path="url(#${clip})">`);
    let cx = lx;
    langs.forEach((l, i) => {
      const w = (l.pct / 100) * colW;
      const fill = l.name === "Other" ? t.other : t.langs[i % t.langs.length]!;
      s.rect(cx, by, Math.max(0, w - (i < langs.length - 1 ? 2 : 0)), bh, { fill });
      cx += w;
    });
    s.raw(`</g>`);
    langs.forEach((l, i) => {
      const y = top + 34 + 26 + i * 26;
      const fill = l.name === "Other" ? t.other : t.langs[i % t.langs.length]!;
      s.rect(lx, y - 10, 10, 10, { fill, r: 3 });
      s.text(lx + 20, y, l.name, { font: "mono400", size: 13, fill: t.text });
      s.text(lx + colW, y, `${l.pct}%`, { font: "mono400", size: 13, fill: t.muted, anchor: "end" });
    });
  }

  const max = Math.max(1, stats?.repos.total ?? 1);
  const nameW = 190, countW = 64;
  libs.forEach((l, i) => {
    const y = top + 34 + i * 26;
    s.text(rx, y, truncate(l.name, "mono400", 12.5, nameW - 8), { font: "mono400", size: 12.5, fill: t.text });
    const bx = rx + nameW, bw = colW - nameW - countW - 10;
    s.rect(bx, y - 7, bw, 6, { fill: t.chip, r: 3 });
    s.rect(bx, y - 7, Math.max(6, (l.repos / max) * bw), 6, { fill: isServerLib(l.name) ? t.server : t.client, r: 3 });
    s.text(rx + colW, y, `${l.repos} ${l.repos === 1 ? "repo" : "repos"}`, { font: "mono400", size: 12, fill: t.muted, anchor: "end" });
  });

  if (stats?.sample) s.text(X + pad, h - pad + 4, "sample data: replaced by the first sync", { font: "mono400", size: 11.5, fill: t.muted });
  s.height = h + GAP;
  return s;
}

// ---------------------------------------------------------------- /offline

const ICONS: Record<HobbyIcon, string> = {
  cat: `<path d="M5 20v-9L4 4l5 3h6l5-3-1 7v9z"/><path d="M1.5 14.5H5M1.5 17.5L5 16.5M22.5 14.5H19M22.5 17.5L19 16.5"/><circle cx="9.5" cy="13" r="0.9" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="0.9" fill="currentColor" stroke="none"/>`,
  mountain: `<path d="M2 20l7-12 4 6 3-4 6 10z"/>`,
  book: `<path d="M3 5h6a3 3 0 013 3v12a2 2 0 00-2-2H3zM21 5h-6a3 3 0 00-3 3v12a2 2 0 012-2h7z"/>`,
  pencil: `<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/>`,
  film: `<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7.5 5v14M16.5 5v14M3 10h4.5M3 14h4.5M16.5 10H21M16.5 14H21"/>`,
  dot: `<circle cx="12" cy="12" r="4"/>`,
};

export function offline(cfg: ProfileConfig, t: Theme): Svg {
  const items = cfg.offline;
  const path = `${cfg.apiPath}/offline`;
  const s = new Svg(W, 0, `GET ${path}: ${items.map((i) => i.label).join(", ")}`);
  const headH = 48, pad = 18, gap = 12;
  const tileW = (CW - 2 * pad - gap * (items.length - 1)) / Math.max(1, items.length);
  const lines = items.map((i) => wrap(i.label, "sans700", 15, tileW - 16));
  const tileH = 16 + 28 + 12 + Math.max(1, ...lines.map((l) => l.length)) * 20 + 14;
  const h = headH + pad + tileH + pad;
  card(s, X, 0, CW, h, t);
  requestBar(s, X + 18, 11, CW - 36, path, "200", t, 13);
  s.rect(X + 1, headH, CW - 2, 1, { fill: t.border });
  items.forEach((item, i) => {
    const x = X + pad + i * (tileW + gap), y = headH + pad;
    s.rect(x, y, tileW, tileH, { fill: t.chip, r: 10 });
    s.raw(`<g transform="translate(${x + tileW / 2 - 14} ${y + 16}) scale(1.1667)" fill="none" stroke="${t.client}" color="${t.client}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${ICONS[item.icon] ?? ICONS.dot}</g>`);
    lines[i]!.forEach((line, j) =>
      s.text(x + tileW / 2, y + 16 + 28 + 12 + 15 + j * 20, line, { font: "sans700", size: 15, fill: t.strong, anchor: "middle" }),
    );
  });
  s.height = h + GAP;
  return s;
}

// ---------------------------------------------------------------- projects

export const HALF = W / 2;

export function projectsTitle(t: Theme): Svg {
  const s = new Svg(W, 26, "Built across the stack: featured projects");
  caption(s, X, 12, "BUILT ACROSS THE STACK", t.muted);
  return s;
}

function projectLayout(p: Project, w: number) {
  return wrap(p.description, "sans400", 14, w);
}

/** One card per SVG (so each can link somewhere); all cards share the tallest height. */
export function projectCard(p: Project, side: "left" | "right", all: Project[], t: Theme): Svg {
  const pad = 18;
  const cardW = HALF - X - 8;
  const innerW = cardW - 2 * pad;
  const descLines = Math.max(...all.map((q) => projectLayout(q, innerW).length));
  const h = pad + 18 + 8 + descLines * 21 + 12 + 14 + pad;
  const s = new Svg(HALF, h + 16, `${p.name}: ${p.description}. Stack: ${p.stack.map((x) => x.label).join(" + ")}`);
  const x = side === "left" ? X : 8;
  card(s, x, 0, cardW, h, t, 12);
  let y = pad + 15;
  s.text(x + pad, y, truncate(p.name, "sans700", 16, innerW), { font: "sans700", size: 16, fill: t.strong });
  y += 8;
  for (const line of projectLayout(p, innerW)) {
    y += 21;
    s.text(x + pad, y, line, { font: "sans400", size: 14, fill: t.muted });
  }
  const color = { client: t.client, server: t.server, infra: t.text };
  const spans: Span[] = p.stack.flatMap((part, i) => [
    ...(i ? [{ text: " + ", fill: t.muted }] : []),
    { text: part.label, fill: color[part.layer] },
  ]);
  s.spans(x + pad, h - pad - 2, spans, "mono400", 12);
  return s;
}

// ---------------------------------------------------------------- links

export function linkButton(method: "GET" | "POST", path: string, t: Theme): Svg {
  const size = 13;
  const w = Math.ceil(measure(`${method} ${path}`, "mono400", size) + 34);
  const s = new Svg(w + 12, 46, `${method} ${path}`);
  card(s, 0, 0, w, 44, t, 10);
  s.spans(16, 27, [
    { text: method, fill: method === "POST" ? t.server : t.client, font: "mono600" },
    { text: ` ${path}`, fill: t.text },
  ], "mono400", size);
  return s;
}
