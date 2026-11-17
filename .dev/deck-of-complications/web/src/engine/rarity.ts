import type { CatalogCard } from "./types";

const COPIES: Record<string, number> = {
  "Very Common": 12,
  Common: 6,
  Uncommon: 3,
  Rare: 1,
};

export function copiesForRarity(rarity: string): number {
  const n = COPIES[rarity];
  if (!n) throw new Error(`Unknown rarity: ${rarity}`);
  return n;
}

export function buildDeckInstances(
  catalog: CatalogCard[],
  rollType: string,
): Omit<
  import("./types").CardInstance,
  "zone" | "up" | "enhanced" | "negated" | "revalued"
>[] {
  const out: ReturnType<typeof buildDeckInstances> = [];
  for (const def of catalog) {
    if (!def.rollTypes[rollType as keyof typeof def.rollTypes]) continue;
    const copies = copiesForRarity(def.rarity);
    for (let i = 0; i < copies; i++) {
      out.push({
        id: `${def.index}-${i + 1}`,
        index: def.index,
        name: def.name,
        category: def.category,
        rarity: def.rarity,
        value: def.value === "X" ? 0 : def.value,
        printedValue: def.value,
        rollTypes: def.rollTypes,
        imageStem: def.imageStem,
      });
    }
  }
  return out;
}
