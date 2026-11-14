/** Convert OOXML shared-string rich runs into HTML for discipline tooltips. */

export type RichRun = {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly color?: string;
  readonly font?: string;
};

const REQUIRED_FONTS = new Set(["Alegreya Sans", "Alegreya Sans SC", "Days One", "Bebas Neue"]);
const RARE_FONT_FALLBACK: Readonly<Record<string, string>> = {
  Bellefair: "Alegreya Sans",
  Dosis: "Alegreya Sans",
  "Walter Turncoat": "Days One"
};

export const cssFontFamily = (sheetFont: string | undefined): string | undefined => {
  if (!sheetFont) return undefined;
  if (REQUIRED_FONTS.has(sheetFont) || RARE_FONT_FALLBACK[sheetFont]) {
    return RARE_FONT_FALLBACK[sheetFont] ?? sheetFont;
  }
  return sheetFont;
};

export const normalizeSheetColor = (rgbOrTheme: string | undefined): string | undefined => {
  if (!rgbOrTheme) return undefined;
  if (rgbOrTheme.startsWith("theme:")) return undefined;
  const hex = rgbOrTheme.replace(/^FF/i, "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(hex)) return undefined;
  if (hex === "000000" || hex === "FFFFFF") return undefined;
  return `#${hex}`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Escape text and turn newlines into <br> so pre-wrap is optional. */
const escapeWithBreaks = (value: string): string => escapeHtml(value).replace(/\r\n|\n|\r/g, "<br>");

export const richRunsToHtml = (runs: readonly RichRun[]): string => {
  if (runs.length === 0) return "";
  return runs
    .map((run) => {
      if (run.text === "") return "";
      let inner = escapeWithBreaks(run.text);
      if (run.bold) inner = `<b>${inner}</b>`;
      if (run.italic) inner = `<i>${inner}</i>`;
      if (run.underline) inner = `<u>${inner}</u>`;
      const font = cssFontFamily(run.font);
      const color = normalizeSheetColor(run.color);
      const styles: string[] = [];
      if (font) styles.push(`font-family:'${font.replace(/'/g, "\\'")}'`);
      if (color) styles.push(`color:${color}`);
      if (styles.length === 0) return inner;
      return `<span style="${styles.join(";")}">${inner}</span>`;
    })
    .join("");
};

export const decodeXmlEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const tagPresent = (rPr: string, name: string): boolean =>
  new RegExp(`<${name}(?:\\s|/|>)`, "i").test(rPr);

const attrVal = (rPr: string, tag: string, attr: string): string | undefined => {
  const match = rPr.match(new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, "i"));
  return match?.[1];
};

export const parseSharedStringItem = (siXml: string): { readonly plain: string; readonly runs: RichRun[] } => {
  const runs: RichRun[] = [];
  const richParts = [...siXml.matchAll(/<r>([\s\S]*?)<\/r>/g)];
  if (richParts.length === 0) {
    const texts = [...siXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXmlEntities(m[1] ?? ""));
    const plain = texts.join("");
    return { plain, runs: plain === "" ? [] : [{ text: plain }] };
  }
  for (const part of richParts) {
    const body = part[1] ?? "";
    const rPrMatch = body.match(/<rPr>([\s\S]*?)<\/rPr>/);
    const rPr = rPrMatch?.[1] ?? "";
    const textMatch = body.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/);
    const text = decodeXmlEntities(textMatch?.[1] ?? "");
    if (text === "") continue;
    const rgb = attrVal(rPr, "color", "rgb");
    const theme = attrVal(rPr, "color", "theme");
    const font = attrVal(rPr, "rFont", "val");
    runs.push({
      text,
      ...(tagPresent(rPr, "b") ? { bold: true } : {}),
      ...(tagPresent(rPr, "i") ? { italic: true } : {}),
      ...(tagPresent(rPr, "u") ? { underline: true } : {}),
      ...(rgb ? { color: rgb } : theme ? { color: `theme:${theme}` } : {}),
      ...(font ? { font } : {})
    });
  }
  return { plain: runs.map((run) => run.text).join(""), runs };
};

export const parseSharedStringsXml = (xml: string): { readonly plain: string; readonly html: string; readonly runs: RichRun[] }[] => {
  const items: { readonly plain: string; readonly html: string; readonly runs: RichRun[] }[] = [];
  for (const match of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const parsed = parseSharedStringItem(match[1] ?? "");
    items.push({ plain: parsed.plain, runs: parsed.runs, html: richRunsToHtml(parsed.runs) });
  }
  return items;
};

export const collectFontWarnings = (runs: readonly RichRun[]): string[] => {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const run of runs) {
    const font = run.font;
    if (!font || seen.has(font)) continue;
    seen.add(font);
    if (RARE_FONT_FALLBACK[font]) {
      warnings.push(`Rare font "${font}" mapped to "${RARE_FONT_FALLBACK[font]}"`);
    } else if (!REQUIRED_FONTS.has(font)) {
      warnings.push(`Unknown sheet font "${font}" kept as-is`);
    }
  }
  return warnings;
};
