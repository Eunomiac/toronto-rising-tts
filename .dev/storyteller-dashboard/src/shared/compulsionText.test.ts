import { describe, expect, it } from "vitest";
import {
  buildCompulsionText,
  compulsionName,
  missingCards,
  parseCompulsionText,
  parseMapping,
  parseReferenceIndex,
  parseTextLayers,
  placeholderCompulsionText
} from "./compulsionText.js";

describe("compulsionName", () => {
  it("keeps a general type and maps a Clan card through the PC's clan", () => {
    expect(compulsionName({ type: "Paranoia", n: 2 }, "Toreador")).toBe("Paranoia");
    expect(compulsionName({ type: "Clan", n: 3 }, "banu haqim")).toBe("Judgment");
    expect(compulsionName({ type: "Clan", n: 1 }, "Ventrue")).toBeUndefined();
  });
});

describe("placeholder text", () => {
  it("covers all 36 cards and round-trips through the parser", () => {
    const file = placeholderCompulsionText();
    expect(Object.keys(file.entries)).toHaveLength(36);
    expect(missingCards(file)).toEqual([]);
    expect(parseCompulsionText(JSON.parse(JSON.stringify(file)))).toEqual(file);
  });

  it("rejects an entry without all three texts", () => {
    expect(() => parseCompulsionText({ placeholder: false, entries: { "Harm:1": { influence: "a", burden: "b" } } })).toThrow(/Harm:1/);
  });
});

describe("import", () => {
  const reference = parseReferenceIndex(" 1  Dominance:1  (Dominance-blackCaesar)\n17  Cryptophilia:1  (Clan-rashid)\n");
  const layers = parseTextLayers([
    { index: 4, path: "a", name: "x", visible: true, text: "Influence text\n" },
    { index: 5, path: "a", name: "y", visible: true, text: "Burden text" },
    { index: 6, path: "a", name: "z", visible: false, text: "Catharsis text" },
    { index: 7, path: "a", name: "bad", visible: true, error: "locked" }
  ]);

  it("maps reference numbers or names to text layers", () => {
    const rows = parseMapping("# card influence burden catharsis\n17 4 5 6\nHarm:2, 4, 5, 6\n", reference);
    const file = buildCompulsionText(rows, layers);
    expect(file.placeholder).toBe(false);
    expect(file.entries["Cryptophilia:1"]).toEqual({ influence: "Influence text", burden: "Burden text", catharsis: "Catharsis text" });
    expect(file.entries["Harm:2"]?.burden).toBe("Burden text");
    expect(missingCards(file)).toHaveLength(34);
  });

  it("fails loudly on bad lines, unknown cards, unreadable layers and duplicates", () => {
    expect(() => parseMapping("17 4 5", reference)).toThrow(/line 1/);
    expect(() => parseMapping("99 4 5 6", reference)).toThrow(/reference card 99/);
    expect(() => buildCompulsionText(parseMapping("Fury:1 4 5 6", reference), layers)).toThrow(/Unknown card/);
    expect(() => buildCompulsionText(parseMapping("1 4 5 7", reference), layers)).toThrow(/could not be read/);
    expect(() => buildCompulsionText(parseMapping("1 4 5 6\nDominance:1 4 5 6", reference), layers)).toThrow(/twice/);
  });
});
