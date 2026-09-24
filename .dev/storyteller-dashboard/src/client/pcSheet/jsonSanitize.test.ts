import { describe, expect, it } from "vitest";
import { parseJsonLenient, sanitizeJsonTextRemoveTrailingCommas } from "./jsonSanitize.js";

describe("sanitizeJsonTextRemoveTrailingCommas", () => {
  it("strips trailing commas in objects and arrays", () => {
    const raw = `{
  "xp": {
    "-5": {
      "gains": [
        { "amount": 15, "description": "A" },
        { "amount": 27, "description": "B" },
      ],
      "spends": [
        { "amount": 3, "description": "C" },
      ],
    },
  },
}`;
    const cleaned = sanitizeJsonTextRemoveTrailingCommas(raw);
    expect(() => JSON.parse(cleaned)).not.toThrow();
    const parsed = JSON.parse(cleaned) as { xp: { "-5": { gains: unknown[]; spends: unknown[] } } };
    expect(parsed.xp["-5"].gains).toHaveLength(2);
    expect(parsed.xp["-5"].spends).toHaveLength(1);
  });

  it("leaves valid JSON unchanged", () => {
    const ok = '{"a":1,"b":[2,3]}';
    expect(sanitizeJsonTextRemoveTrailingCommas(ok)).toBe(ok);
  });
});

describe("parseJsonLenient", () => {
  it("parses a PCs-tab style patch fragment with trailing commas", () => {
    const body = `"xp": {
  "0": {
    "sessionDisplay": "Rollover",
    "gainTotal": 0,
    "spendTotal": 15,
    "newTotal": 0,
    "spends": [
      { "amount": 6, "description": "Merit" },
    ],
  },
}`;
    const parsed = parseJsonLenient(`{\n${body}\n}`) as { xp: Record<string, unknown> };
    expect(parsed.xp["0"]).toMatchObject({ sessionDisplay: "Rollover", spendTotal: 15 });
  });
});
