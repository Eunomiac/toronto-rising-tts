import { describe, expect, it } from "vitest";
import { luaJsonArg, luaLongString } from "./ttsBridge.js";

/** Lua reads a long string up to the first closing bracket of its level; that must be the final one. */
const closesAtEnd = (value: string): boolean => {
  const quoted = luaLongString(value);
  const eq = /^\[(=*)\[/.exec(quoted)?.[1] ?? "";
  const close = `]${eq}]`;
  return quoted.indexOf(close, eq.length + 2) === quoted.length - close.length
    && quoted.slice(eq.length + 2, quoted.length - close.length) === value;
};

describe("luaLongString", () => {
  it.each([
    ["{\"op\":\"phaseAdvance\"}"],
    ["[{\"op\":\"playScene\"},{\"op\":\"clockMove\"}]"],
    ["[[1,2],[3,4]]"],
    ["ends with ]="],
    ["has ]] and ]=] inside"],
    ["]"]
  ])("keeps %s intact", (value) => {
    expect(closesAtEnd(value)).toBe(true);
  });
});

describe("luaJsonArg", () => {
  it("folds typographic punctuation to ASCII and keeps the JSON valid", () => {
    const quoted = luaJsonArg({ title: "West Queen West \u2014 \u201CRavenwing\u201D\u2026 it\u2019s" });
    const json = quoted.slice(2, -2);
    expect(/^[\x20-\x7E]*$/.test(json)).toBe(true);
    expect(JSON.parse(json)).toEqual({ title: "West Queen West - \"Ravenwing\"... it's" });
  });
});
