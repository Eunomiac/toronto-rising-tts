/**
 * Compulsion card text for the dashboard's seat badges, kept in the git-ignored `data/compulsion-text.json`
 * (`npm run compulsion-text`). Entries are keyed `<Compulsion>:<N>`, N the card's variant 1-4 as its GM Notes
 * number it (`Compulsion:<Type>-<charKey>:<N>`). A PC's `Clan` card is their clan's Compulsion (`CLAN_COMPULSION`).
 */

export const GENERAL_COMPULSIONS = ["Dominance", "Harm", "Hunger", "Paranoia"] as const;

/** Clan → the Compulsion its `Clan` cards carry. No two PCs share a clan. */
export const CLAN_COMPULSION: Readonly<Record<string, string>> = {
  "Banu Haqim": "Judgment",
  Malkavian: "Delusion",
  Nosferatu: "Cryptophilia",
  Toreador: "Obsession",
  Tremere: "Perfectionism"
};

export const COMPULSION_NAMES: readonly string[] = [...GENERAL_COMPULSIONS, ...Object.values(CLAN_COMPULSION).sort()];

export const VARIANTS = [1, 2, 3, 4] as const;

export type CompulsionCardText = { readonly influence: string; readonly burden: string; readonly catharsis: string };

export type CompulsionTextFile = {
  /** True while the entries are stand-ins (before the Photoshop dump is imported). */
  readonly placeholder: boolean;
  readonly entries: Readonly<Record<string, CompulsionCardText>>;
};

/** A seat's selected Compulsion as TTS pushes it: the GM Notes type (`Clan` for the clan card) and variant. */
export type ActiveCompulsion = { readonly type: string; readonly n: number };

const FIELDS = ["influence", "burden", "catharsis"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The Compulsion a seat's card names: its type, or for a `Clan` card the clan's; undefined for an unknown clan. */
export const compulsionName = (active: ActiveCompulsion, clan: string): string | undefined => {
  if (active.type.toLowerCase() !== "clan") {
    return active.type;
  }
  const wanted = clan.trim().toLowerCase();
  return Object.entries(CLAN_COMPULSION).find(([name]) => name.toLowerCase() === wanted)?.[1];
};

export const compulsionKey = (name: string, n: number): string => `${name}:${n}`;

export const parseCompulsionText = (value: unknown): CompulsionTextFile => {
  if (!isRecord(value) || typeof value.placeholder !== "boolean" || !isRecord(value.entries)) {
    throw new Error("compulsion-text.json must be { placeholder: boolean, entries: { \"<Compulsion>:<N>\": { influence, burden, catharsis } } }.");
  }
  const entries: Record<string, CompulsionCardText> = {};
  for (const [key, entry] of Object.entries(value.entries)) {
    if (!isRecord(entry) || FIELDS.some((field) => typeof entry[field] !== "string")) {
      throw new Error(`compulsion-text.json: "${key}" needs influence, burden and catharsis text.`);
    }
    entries[key] = { influence: entry.influence as string, burden: entry.burden as string, catharsis: entry.catharsis as string };
  }
  return { placeholder: value.placeholder, entries };
};

export const placeholderCompulsionText = (): CompulsionTextFile => ({
  placeholder: true,
  entries: Object.fromEntries(
    COMPULSION_NAMES.flatMap((name) =>
      VARIANTS.map((n) => [
        compulsionKey(name, n),
        {
          influence: `Placeholder: ${name} ${n} Influence.`,
          burden: `Placeholder: ${name} ${n} Burden.`,
          catharsis: `Placeholder: ${name} ${n} Catharsis.`
        }
      ])
    )
  )
});

/** One text layer from `.tools/photoshop/dump-text-layers.jsx` (`<doc>.text-layers.json`). */
export type TextLayer = { readonly index: number; readonly text?: string; readonly error?: string };

export const parseTextLayers = (value: unknown): ReadonlyMap<number, TextLayer> => {
  if (!Array.isArray(value)) {
    throw new Error("The text-layer dump must be the JSON array written by dump-text-layers.jsx.");
  }
  return new Map(value.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.index !== "number") {
      throw new Error("Every text-layer entry needs a numeric index.");
    }
    return [entry.index, {
      index: entry.index,
      ...(typeof entry.text === "string" ? { text: entry.text } : {}),
      ...(typeof entry.error === "string" ? { error: entry.error } : {})
    }];
  }));
};

/**
 * `compulsion-reference-index.txt` from `DEBUG.buildCompulsionReferenceDeck()`: lines `17  Cryptophilia:1  (Clan-x)`,
 * reference card number → `<Compulsion>:<N>`.
 */
export const parseReferenceIndex = (text: string): ReadonlyMap<number, string> => {
  const index = new Map<number, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(\d+)\s+([A-Za-z]+:[1-4])\b/.exec(line);
    if (match?.[1] && match[2]) {
      index.set(Number(match[1]), match[2]);
    }
  }
  return index;
};

export type MappingRow = { readonly card: string; readonly influence: number; readonly burden: number; readonly catharsis: number };

/**
 * The author's mapping: one line per card, `<card> <influence layer> <burden layer> <catharsis layer>`, where
 * `<card>` is a reference deck number or `<Compulsion>:<N>` and the layers are `#` numbers from the dump's
 * `.text-layers.txt`. Blank lines and `#` comments are skipped.
 */
export const parseMapping = (text: string, reference: ReadonlyMap<number, string>): readonly MappingRow[] =>
  text.split(/\r?\n/).flatMap((raw, line): MappingRow[] => {
    const content = raw.replace(/#.*$/, "").trim();
    if (content === "") {
      return [];
    }
    const parts = content.split(/[\s,]+/);
    const [cardText, ...layers] = parts;
    const numbers = layers.map(Number);
    if (!cardText || numbers.length !== 3 || numbers.some((value) => !Number.isInteger(value) || value < 1)) {
      throw new Error(`Mapping line ${line + 1} must read "<card> <influence> <burden> <catharsis>": ${raw}`);
    }
    const card = /^\d+$/.test(cardText) ? reference.get(Number(cardText)) : cardText;
    if (!card) {
      throw new Error(`Mapping line ${line + 1}: reference card ${cardText} is not in the reference index.`);
    }
    const [influence, burden, catharsis] = numbers as [number, number, number];
    return [{ card, influence, burden, catharsis }];
  });

/** The text file from a mapping; fails on unknown names, missing or unreadable layers, and duplicate cards. */
export const buildCompulsionText = (rows: readonly MappingRow[], layers: ReadonlyMap<number, TextLayer>): CompulsionTextFile => {
  const known = new Set(COMPULSION_NAMES.flatMap((name) => VARIANTS.map((n) => compulsionKey(name, n))));
  const layerText = (card: string, field: string, at: number): string => {
    const layer = layers.get(at);
    if (!layer) {
      throw new Error(`${card} ${field}: text layer #${at} is not in the dump.`);
    }
    if (layer.text === undefined) {
      throw new Error(`${card} ${field}: text layer #${at} could not be read (${layer.error ?? "no text"}).`);
    }
    return layer.text.trim();
  };
  const entries: Record<string, CompulsionCardText> = {};
  for (const row of rows) {
    if (!known.has(row.card)) {
      throw new Error(`Unknown card "${row.card}"; expected one of ${COMPULSION_NAMES.join(", ")} with :1 to :4.`);
    }
    if (entries[row.card]) {
      throw new Error(`${row.card} is mapped twice.`);
    }
    entries[row.card] = {
      influence: layerText(row.card, "Influence", row.influence),
      burden: layerText(row.card, "Burden", row.burden),
      catharsis: layerText(row.card, "Catharsis", row.catharsis)
    };
  }
  return { placeholder: false, entries };
};

/** Cards a text file has no entry for, in reference order. */
export const missingCards = (file: CompulsionTextFile): readonly string[] =>
  COMPULSION_NAMES.flatMap((name) => VARIANTS.map((n) => compulsionKey(name, n))).filter((key) => !file.entries[key]);
