import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findObjectDiskPathsForGuid, parseExtraSyncDirs } from "./guid-resolve.js";

describe("parseExtraSyncDirs", () => {
  it("returns empty for undefined or blank", () => {
    expect(parseExtraSyncDirs(undefined, "C:\\r")).toEqual([]);
    expect(parseExtraSyncDirs("  ", "C:\\r")).toEqual([]);
  });

  it("splits semicolons and resolves relative segments against repo root", () => {
    expect(parseExtraSyncDirs("sub;D:\\abs", "C:\\repo")).toEqual([
      path.normalize("C:\\repo\\sub"),
      "D:\\abs",
    ]);
  });
});

describe("findObjectDiskPathsForGuid", () => {
  it("finds unique lua and xml under repo root", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tts-guid-"));
    const guid = "fe9e9a";
    await fs.writeFile(path.join(tmp, `Dial.${guid}.lua`), "-- lua", "utf8");
    await fs.writeFile(path.join(tmp, `Dial.${guid}.xml`), "<xml/>", "utf8");

    const r = await findObjectDiskPathsForGuid(tmp, guid, []);
    expect("error" in r).toBe(false);
    if ("error" in r) {
      return;
    }
    expect(r.luaEntryPath).toBe(path.join(tmp, `Dial.${guid}.lua`));
    expect(r.xmlPath).toBe(path.join(tmp, `Dial.${guid}.xml`));
  });

  it("prefers .ttslua when that is the only lua match", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tts-guid-"));
    const guid = "abc12";
    await fs.writeFile(path.join(tmp, `Mod.${guid}.ttslua`), "x", "utf8");
    await fs.writeFile(path.join(tmp, `Mod.${guid}.xml`), "<a/>", "utf8");

    const r = await findObjectDiskPathsForGuid(tmp, guid, []);
    expect("error" in r).toBe(false);
    if ("error" in r) {
      return;
    }
    expect(r.luaEntryPath).toBe(path.join(tmp, `Mod.${guid}.ttslua`));
  });

  it("errors on ambiguous lua", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tts-guid-"));
    const guid = "dup01";
    await fs.writeFile(path.join(tmp, `a.${guid}.lua`), "1", "utf8");
    await fs.writeFile(path.join(tmp, `b.${guid}.lua`), "2", "utf8");
    await fs.writeFile(path.join(tmp, `x.${guid}.xml`), "<x/>", "utf8");

    const r = await findObjectDiskPathsForGuid(tmp, guid, []);
    expect("error" in r).toBe(true);
    if (!("error" in r)) {
      return;
    }
    expect(r.error).toContain("Multiple Lua");
  });
});
