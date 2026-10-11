/**
 * Compulsion card text for the dashboard's seat badges. The author's git-ignored `data/compulsions.jsonc` is the only
 * copy: one entry per Compulsion (keyed by its lower-case name) with its Influence and four variants, each variant's
 * `card` the N its GM Notes carry (`Compulsion:<Type>-<charKey>:<N>`). A clan Compulsion names its `clan`; that clan's
 * PCs draw it as `Clan` cards.
 */

/** A seat's selected Compulsion as TTS pushes it: the GM Notes type (`Clan` for the clan card) and variant. */
export type ActiveCompulsion = { readonly type: string; readonly n: number };

export type CompulsionPart = { readonly title: string; readonly description: string };

export type CompulsionCard = {
  readonly influence: CompulsionPart;
  readonly burden: CompulsionPart & { readonly flavor: string };
  readonly catharsis: CompulsionPart;
};

export type Compulsions = {
  /** `<Name>:<N>` → the card's text. */
  readonly cards: Readonly<Record<string, CompulsionCard>>;
  /** Lower-case Compulsion name → display name. */
  readonly names: Readonly<Record<string, string>>;
  /** Lower-case clan → its Compulsion's display name. */
  readonly clans: Readonly<Record<string, string>>;
};

const CARD_NUMBERS = [1, 2, 3, 4];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** `//` and block comments removed outside strings, so a `.jsonc` file can go through `JSON.parse`. */
export const stripJsonComments = (text: string): string => {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += text[i + 1] ?? "";
        i++;
      } else if (ch === "\"") {
        inString = false;
      }
    } else if (ch === "\"") {
      inString = true;
      out += ch;
    } else if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") {
        i++;
      }
      out += "\n";
    } else if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 1;
    } else {
      out += ch;
    }
  }
  return out;
};

export const compulsionKey = (name: string, n: number): string => `${name}:${n}`;

const displayName = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

const onlyKeys = (where: string, value: Record<string, unknown>, allowed: readonly string[]): void => {
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length > 0) {
    throw new Error(`compulsions.jsonc: ${where} has unexpected ${extra.map((key) => `"${key}"`).join(", ")}.`);
  }
};

const text = (where: string, value: unknown): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`compulsions.jsonc: ${where} needs text.`);
  }
  return value.trim();
};

const part = (where: string, value: unknown, fields: readonly string[]): Record<string, string> => {
  if (!isRecord(value)) {
    throw new Error(`compulsions.jsonc: ${where} is missing.`);
  }
  onlyKeys(where, value, fields);
  return Object.fromEntries(fields.map((field) => [field, text(`${where} ${field}`, value[field])]));
};

/** Validates the parsed `compulsions.jsonc`; fails on missing text, stray keys, and card numbers other than 1-4 once each. */
export const parseCompulsions = (value: unknown): Compulsions => {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    throw new Error("compulsions.jsonc must be an object of Compulsions keyed by lower-case name.");
  }
  const cards: Record<string, CompulsionCard> = {};
  const names: Record<string, string> = {};
  const clans: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    const name = displayName(key);
    if (!isRecord(entry)) {
      throw new Error(`compulsions.jsonc: ${name} must be an object.`);
    }
    onlyKeys(name, entry, ["clan", "influence", "variants"]);
    names[key.toLowerCase()] = name;
    if (entry.clan !== undefined) {
      const clan = text(`${name} clan`, entry.clan).toLowerCase();
      if (clans[clan]) {
        throw new Error(`compulsions.jsonc: the clan "${entry.clan as string}" is on both ${clans[clan]} and ${name}.`);
      }
      clans[clan] = name;
    }
    const influence = part(`${name} influence`, entry.influence, ["title", "description"]) as CompulsionPart;
    if (!Array.isArray(entry.variants)) {
      throw new Error(`compulsions.jsonc: ${name} needs a "variants" list.`);
    }
    const numbers = entry.variants.map((variant: unknown) => (isRecord(variant) ? variant.card : undefined));
    if ([...numbers].sort().join(",") !== CARD_NUMBERS.join(",")) {
      throw new Error(`compulsions.jsonc: ${name} variants must be cards 1, 2, 3 and 4 once each (found ${numbers.map(String).join(", ")}).`);
    }
    for (const variant of entry.variants as Record<string, unknown>[]) {
      const where = `${name} card ${String(variant.card)}`;
      onlyKeys(where, variant, ["card", "burden", "catharsis"]);
      cards[compulsionKey(name, variant.card as number)] = {
        influence,
        burden: part(`${where} burden`, variant.burden, ["title", "flavor", "description"]) as CompulsionCard["burden"],
        catharsis: part(`${where} catharsis`, variant.catharsis, ["title", "description"]) as CompulsionPart
      };
    }
  }
  return { cards, names, clans };
};

/** The Compulsion a seat's card names: its type, or for a `Clan` card the PC's clan's; undefined when unknown. */
export const compulsionName = (active: ActiveCompulsion, clan: string, compulsions: Compulsions): string | undefined =>
  active.type.toLowerCase() === "clan"
    ? compulsions.clans[clan.trim().toLowerCase()]
    : compulsions.names[active.type.toLowerCase()];
