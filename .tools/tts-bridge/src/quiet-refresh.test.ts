import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { TtsExternalEditorBridge } from "./bridge.js";
import {
  buildFetchObjectJsonScript,
  buildSpawnObjectScript,
  escapeJsonForLuaLongBracket,
  quietRefreshObject,
  resolveRepoPath,
} from "./quiet-refresh.js";

describe("escapeJsonForLuaLongBracket", () => {
  it("leaves strings without closing brackets unchanged", () => {
    expect(escapeJsonForLuaLongBracket(`{"a":1}`)).toBe(`{"a":1}`);
  });

  it("escapes ]] per Seb ttsAdapter pattern", () => {
    expect(escapeJsonForLuaLongBracket(`x]]y`)).toBe(`x]] .. "]]" .. [[y`);
  });

  it("escapes multiple occurrences", () => {
    expect(escapeJsonForLuaLongBracket("]]]]")).toBe(']] .. "]]" .. [[]] .. "]]" .. [[');
  });
});

describe("resolveRepoPath", () => {
  it("joins relative paths to repo root", () => {
    expect(resolveRepoPath("C:\\repo", "ui\\a.xml")).toBe(path.normalize(path.join("C:\\repo", "ui\\a.xml")));
  });

  it("normalizes absolute paths", () => {
    const abs = "D:\\x\\y.lua";
    expect(resolveRepoPath("C:\\repo", abs)).toBe(path.normalize(abs));
  });
});

describe("buildFetchObjectJsonScript", () => {
  it("embeds guid safely", () => {
    const s = buildFetchObjectJsonScript("abc123");
    expect(s).toContain(`local g = "abc123"`);
    expect(s).toContain("getObjectFromGUID(g)");
    expect(s).toContain("return o.getJSON()");
  });
});

describe("buildSpawnObjectScript", () => {
  it("wraps json and calls destruct and spawnObjectJSON", () => {
    const s = buildSpawnObjectScript("fe9e9a", `{"GUID":"fe9e9a"}`);
    expect(s).toContain(`local _g = "fe9e9a"`);
    expect(s).toContain("obj.destruct()");
    expect(s).toContain("spawnObjectJSON({ json = _j })");
  });
});

describe("quietRefreshObject", () => {
  it("rejects Global guid without calling bridge", async () => {
    const bridge = { executeWithOutput: vi.fn() };
    const r = await quietRefreshObject(bridge as unknown as TtsExternalEditorBridge, {
      guid: "-1",
      repoRoot: "C:\\r",
      luaEntryPath: "a.lua",
      xmlPath: "a.xml",
    });
    expect(r.error).toMatch(/^validate:/u);
    expect(r.error).toContain("Global");
    expect(bridge.executeWithOutput).not.toHaveBeenCalled();
  });
});
