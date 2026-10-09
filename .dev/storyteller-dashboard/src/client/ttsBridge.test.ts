import { describe, expect, it } from "vitest";
import { luaLongString } from "./ttsBridge.js";

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
