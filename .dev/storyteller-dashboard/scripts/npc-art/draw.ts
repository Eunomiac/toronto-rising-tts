import sharp from "sharp";
import opentype from "opentype.js";
import { ANALYSIS_HEIGHT, computeAutoCrop } from "../../src/client/headshots/autoCrop.ts";
import { wrapName, type HeadCrop } from "./model.ts";

/**
 * Draws one NPC's spotlight token, both sides: the figurine's head in a circle (same crop as the dashboard),
 * the ring SVG recoloured, and the name along the bottom. The dark side blacks out the head and the ring.
 */

export const TOKEN_SIZE = 384;
/** Head circle radius as a fraction of the token radius; the ring SVGs cover the band outside it. */
const HEAD_RADIUS = 0.9;
const RING_PLACEHOLDER = /#FF00FF/gi;
const DISC_COLOR = "#2a2a32";
const LIT_TEXT = "#f2ead8";
const DARK_TEXT = "#a49d90";
/** Tried largest first; the first size that fits the name without an ellipsis wins. */
const FONT_SIZES = [60, 52, 46] as const;
const LINE_SPACING = 0.86;
/** Baselines as a fraction of the token radius below its centre. */
const SINGLE_BASELINE = 0.66;
const LOWER_BASELINE = 0.64;
const SIDE_PADDING = 16;

export type DrawAssets = {
  readonly font: opentype.Font;
  readonly ellipsis: string;
  readonly ringLit: string;
  readonly ringDark: string;
};

export const loadFont = (bytes: Uint8Array): { font: opentype.Font; ellipsis: string } => {
  const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const glyph = font.charToGlyph("\u2026");
  return { font, ellipsis: glyph.index === 0 ? "..." : "\u2026" };
};

const R = TOKEN_SIZE / 2;
const HEAD_R = R * HEAD_RADIUS;
const HEAD_D = Math.round(HEAD_R * 2);
const HEAD_OFFSET = Math.round(R - HEAD_D / 2);

/** Width available on the head circle for a line whose baseline sits `below` px under the centre, less padding. */
const chordWidth = (below: number, capRise: number): number => {
  const narrowest = Math.max(Math.abs(below), Math.abs(below - capRise));
  return 2 * Math.sqrt(Math.max(0, HEAD_R * HEAD_R - narrowest * narrowest)) - SIDE_PADDING * 2;
};

type NameLayout = { readonly lines: readonly string[]; readonly baselines: readonly number[]; readonly size: number; readonly capRise: number };

const layoutName = (name: string, assets: DrawAssets): NameLayout => {
  const { font } = assets;
  const capRatio = (font.tables.os2?.sCapHeight ?? font.unitsPerEm * 0.7) / font.unitsPerEm;
  let layout: NameLayout | null = null;
  for (const size of FONT_SIZES) {
    const capRise = capRatio * size;
    const single = SINGLE_BASELINE * R;
    const lower = LOWER_BASELINE * R;
    const upper = lower - size * LINE_SPACING;
    const lines = wrapName(
      name.toUpperCase(),
      [chordWidth(single, capRise), chordWidth(upper, capRise), chordWidth(lower, capRise)],
      (text) => font.getAdvanceWidth(text, size),
      assets.ellipsis
    );
    layout = { lines, baselines: lines.length === 2 ? [R + upper, R + lower] : [R + single], size, capRise };
    if (!lines.some((line) => line.endsWith(assets.ellipsis))) {
      return layout;
    }
  }
  return layout!;
};

const escapeAttr = (value: string): string => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const coord = (value: number): string => {
  if (!Number.isFinite(value)) {
    throw new Error(`Name outline has a non-finite coordinate (${value}).`);
  }
  return value.toFixed(2);
};

/**
 * SVG path data at two decimals. Not opentype.js `toPathData`: its 2.0 rounding turns a coordinate with a tiny
 * floating-point remainder into `NaN` (`1e-14 + "e+2"`), and the renderer drops the rest of the name from there.
 */
export const pathData = (path: opentype.Path): string =>
  path.commands
    .map((command) => {
      switch (command.type) {
        case "M":
        case "L":
          return `${command.type}${coord(command.x)} ${coord(command.y)}`;
        case "Q":
          return `Q${coord(command.x1)} ${coord(command.y1)} ${coord(command.x)} ${coord(command.y)}`;
        case "C":
          return `C${coord(command.x1)} ${coord(command.y1)} ${coord(command.x2)} ${coord(command.y2)} ${coord(command.x)} ${coord(command.y)}`;
        case "Z":
          return "Z";
      }
    })
    .join("");

/** Name band and lettering as one SVG layer, clipped to the head circle. */
const nameLayer = (name: string, assets: DrawAssets, textColor: string): string => {
  const { font } = assets;
  const { lines, baselines, size, capRise } = layoutName(name, assets);
  const paths = lines.map((line, index) => {
    const width = font.getAdvanceWidth(line, size);
    return pathData(font.getPath(line, R - width / 2, baselines[index]!, size));
  });
  const bandTop = (baselines[0] ?? R + SINGLE_BASELINE * R) - capRise - 26;
  const d = escapeAttr(paths.join(" "));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TOKEN_SIZE}" height="${TOKEN_SIZE}">
  <defs>
    <clipPath id="head"><circle cx="${R}" cy="${R}" r="${HEAD_R}"/></clipPath>
    <linearGradient id="band" x1="0" y1="${bandTop}" x2="0" y2="${R + HEAD_R}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.35" stop-color="#000" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect clip-path="url(#head)" x="0" y="${bandTop}" width="${TOKEN_SIZE}" height="${TOKEN_SIZE - bandTop}" fill="url(#band)"/>
  <path d="${d}" fill="none" stroke="#000" stroke-opacity="0.85" stroke-width="7" stroke-linejoin="round"/>
  <path d="${d}" fill="${textColor}"/>
</svg>`;
};

const svgToPng = (svg: string): Promise<Buffer> => sharp(Buffer.from(svg)).png().toBuffer();

const ringLayer = async (template: string, color: string): Promise<Buffer> =>
  sharp(Buffer.from(template.replace(RING_PLACEHOLDER, color)), { density: (72 * TOKEN_SIZE) / 100 })
    .resize(TOKEN_SIZE, TOKEN_SIZE)
    .png()
    .toBuffer();

const discLayer = (): Promise<Buffer> =>
  svgToPng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TOKEN_SIZE}" height="${TOKEN_SIZE}"><circle cx="${R}" cy="${R}" r="${R * 0.97}" fill="${DISC_COLOR}"/></svg>`
  );

const circleMask = (): Promise<Buffer> =>
  svgToPng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${HEAD_D}" height="${HEAD_D}"><circle cx="${HEAD_D / 2}" cy="${HEAD_D / 2}" r="${HEAD_D / 2}" fill="#fff"/></svg>`
  );

/** The dashboard's automatic crop, measured the same way: the cutout scaled to the analysis height, RGBA. */
export const measureAutoCrop = async (figurine: Buffer): Promise<HeadCrop> => {
  const meta = await sharp(figurine).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Figurine image has no dimensions.");
  }
  const width = Math.max(1, Math.round((meta.width * ANALYSIS_HEIGHT) / meta.height));
  const { data } = await sharp(figurine)
    .resize(width, ANALYSIS_HEIGHT, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return computeAutoCrop(data, width, ANALYSIS_HEIGHT).crop;
};

/** The crop square (side `size` × image height, centred on cx/cy), padded with transparency where it overhangs. */
const headSquare = async (figurine: Buffer, crop: HeadCrop): Promise<{ data: Buffer; side: number }> => {
  const meta = await sharp(figurine).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (W === 0 || H === 0) {
    throw new Error("Figurine image has no dimensions.");
  }
  const side = Math.max(1, Math.round(crop.size * H));
  const left = Math.round(crop.cx * W - side / 2);
  const top = Math.round(crop.cy * H - side / 2);
  const pad = {
    left: Math.max(0, -left),
    top: Math.max(0, -top),
    right: Math.max(0, left + side - W),
    bottom: Math.max(0, top + side - H)
  };
  const padded = await sharp(figurine)
    .ensureAlpha()
    .extend({ ...pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const data = await sharp(padded)
    .extract({ left: left + pad.left, top: top + pad.top, width: side, height: side })
    .resize(HEAD_D, HEAD_D)
    .ensureAlpha()
    .raw()
    .toBuffer();
  return { data, side: HEAD_D };
};

const headLayer = async (rgba: Buffer, mask: Buffer): Promise<Buffer> =>
  sharp(rgba, { raw: { width: HEAD_D, height: HEAD_D, channels: 4 } })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

const silhouette = (rgba: Buffer): Buffer => {
  const dark = Buffer.from(rgba);
  for (let i = 0; i < dark.length; i += 4) {
    dark[i] = 0;
    dark[i + 1] = 0;
    dark[i + 2] = 0;
  }
  return dark;
};

const compose = async (head: Buffer, ring: Buffer, name: Buffer, disc: Buffer): Promise<Buffer> =>
  sharp({ create: { width: TOKEN_SIZE, height: TOKEN_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: disc, left: 0, top: 0 },
      { input: head, left: HEAD_OFFSET, top: HEAD_OFFSET },
      { input: name, left: 0, top: 0 },
      { input: ring, left: 0, top: 0 }
    ])
    .webp({ quality: 88, alphaQuality: 100 })
    .toBuffer();

export type DrawnToken = {
  readonly front: Buffer;
  readonly back: Buffer;
  readonly crop: HeadCrop;
  readonly autoCrop: boolean;
};

export const drawToken = async (
  figurine: Buffer,
  name: string,
  color: string,
  manualCrop: HeadCrop | null,
  assets: DrawAssets
): Promise<DrawnToken> => {
  const crop = manualCrop ?? (await measureAutoCrop(figurine));
  const [{ data }, mask, disc, ringLit, ringDark] = await Promise.all([
    headSquare(figurine, crop),
    circleMask(),
    discLayer(),
    ringLayer(assets.ringLit, color),
    ringLayer(assets.ringDark, "#000000")
  ]);
  const [litHead, darkHead, litName, darkName] = await Promise.all([
    headLayer(data, mask),
    headLayer(silhouette(data), mask),
    svgToPng(nameLayer(name, assets, LIT_TEXT)),
    svgToPng(nameLayer(name, assets, DARK_TEXT))
  ]);
  const [front, back] = await Promise.all([compose(litHead, ringLit, litName, disc), compose(darkHead, ringDark, darkName, disc)]);
  return { front, back, crop, autoCrop: manualCrop === null };
};
