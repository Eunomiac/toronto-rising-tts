import { describe, expect, it } from "vitest";
import { compulsionKey, compulsionName, parseCompulsions, stripJsonComments } from "./compulsionText.js";

const variant = (card: number): Record<string, unknown> => ({
  card,
  burden: { title: `B${card}`, flavor: `F${card}`, description: `BD${card}` },
  catharsis: { title: `C${card}`, description: `CD${card}` }
});

const entry = (clan?: string): Record<string, unknown> => ({
  ...(clan ? { clan } : {}),
  influence: { title: "Influence", description: "Influence text" },
  variants: [variant(2), variant(4), variant(1), variant(3)]
});

describe("stripJsonComments", () => {
  it("drops comments but keeps slashes inside strings", () => {
    const parsed = JSON.parse(stripJsonComments('// head\n{ "a": "and/or // kept", /* gone */ "b": 1 // tail\n}')) as unknown;
    expect(parsed).toEqual({ a: "and/or // kept", b: 1 });
  });
});

describe("parseCompulsions", () => {
  const compulsions = parseCompulsions({ paranoia: entry(), judgment: entry("Banu Haqim") });

  it("keys cards by display name and card number", () => {
    expect(Object.keys(compulsions.cards)).toHaveLength(8);
    expect(compulsions.cards[compulsionKey("Paranoia", 4)]?.burden).toEqual({ title: "B4", flavor: "F4", description: "BD4" });
    expect(compulsions.cards[compulsionKey("Judgment", 1)]?.influence.title).toBe("Influence");
  });

  it("names a general card by type and a Clan card through the PC's clan", () => {
    expect(compulsionName({ type: "Paranoia", n: 2 }, "Toreador", compulsions)).toBe("Paranoia");
    expect(compulsionName({ type: "Clan", n: 3 }, "banu haqim", compulsions)).toBe("Judgment");
    expect(compulsionName({ type: "Clan", n: 1 }, "Ventrue", compulsions)).toBeUndefined();
  });

  it("fails loudly on missing text, stray keys, bad card numbers and shared clans", () => {
    const noFlavor = entry();
    (noFlavor.variants as Record<string, Record<string, unknown>>[])[0]!.burden = { title: "B", description: "D" };
    expect(() => parseCompulsions({ harm: noFlavor })).toThrow(/Harm card 2 burden flavor/);
    expect(() => parseCompulsions({ harm: { ...entry(), note: "x" } })).toThrow(/unexpected "note"/);
    expect(() => parseCompulsions({ harm: { ...entry(), variants: [variant(1), variant(1), variant(3), variant(4)] } })).toThrow(/once each/);
    expect(() => parseCompulsions({ a: entry("Tremere"), b: entry("tremere") })).toThrow(/both A and B/);
  });
});
