/** Authored rule associations for an NPC custom roll; names are free text, not a fixed vocabulary. */
export type NpcRollMetadata = {
  readonly traits?: readonly [string, string];
  readonly difficulty?: string;
};

export type NpcDifficultyRule =
  | { readonly kind: "fixed"; readonly min: number }
  | { readonly kind: "range"; readonly min: number; readonly max: number }
  | { readonly kind: "minimum"; readonly min: number }
  | { readonly kind: "list"; readonly values: readonly number[]; readonly min: number };

export const NPC_DIFFICULTY_MAX = 15;
export const normalizeTraitName = (name: string): string => name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
export const rollTraits = (metadata: NpcRollMetadata): readonly string[] =>
  [...new Set((metadata.traits ?? []).map(normalizeTraitName).filter(Boolean))];

/** Blank is unconfigured; null is invalid. Quotes around a rule are accepted for pasted examples. */
export const parseNpcDifficulty = (input: string): NpcDifficultyRule | undefined | null => {
  const text = input.trim().replace(/^"(.*)"$/, "$1").trim();
  if (!text) return undefined;
  if (text.includes(",")) {
    const values = text.split(",").map((part) => Number(part.trim()));
    return values.length > 1 && values.every((value) => Number.isSafeInteger(value) && value >= 0 && value <= NPC_DIFFICULTY_MAX)
      ? { kind: "list", values: [...new Set(values)], min: Math.min(...values) }
      : null;
  }
  const match = /^(\d+)\s*(?:(-)\s*(\d+)|(\+))?$/.exec(text);
  if (!match) return null;
  const min = Number(match[1]);
  if (!Number.isSafeInteger(min) || min < 0 || min > NPC_DIFFICULTY_MAX) return null;
  if (match[2]) {
    const max = Number(match[3]);
    return Number.isSafeInteger(max) && max >= min && max <= NPC_DIFFICULTY_MAX ? { kind: "range", min, max } : null;
  }
  return { kind: match[4] ? "minimum" : "fixed", min };
};

export const formatNpcDifficulty = (rule: NpcDifficultyRule): string =>
  rule.kind === "range" ? `${rule.min}-${rule.max}` : rule.kind === "list" ? rule.values.join(",") : `${rule.min}${rule.kind === "minimum" ? "+" : ""}`;

export const npcDifficultyAllows = (rule: NpcDifficultyRule | undefined | null, value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= NPC_DIFFICULTY_MAX
  && (!rule || rule.kind === "fixed" || (rule.kind === "minimum" ? value === 0 || value >= rule.min
    : rule.kind === "list" ? value === 0 || rule.values.includes(value)
      : value >= rule.min && value <= rule.max));

export const normalizeNpcRollMetadata = (raw: Record<string, unknown>): NpcRollMetadata => {
  const values = Array.isArray(raw.traits) ? raw.traits : [];
  const traits = [0, 1].map((at) => typeof values[at] === "string" ? values[at].trim().slice(0, 80) : "");
  const difficulty = typeof raw.difficulty === "string" ? parseNpcDifficulty(raw.difficulty) : undefined;
  return {
    ...(traits.some(Boolean) ? { traits: [traits[0] ?? "", traits[1] ?? ""] as const } : {}),
    ...(difficulty ? { difficulty: formatNpcDifficulty(difficulty) } : {})
  };
};
