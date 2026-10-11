import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createNpcOverrideStore, NpcOverrideError, parseNpcOverrideBody, requireNpcOverrideKey } from "./npcOverrides";

describe("NPC override store", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "npc-overrides-"));
    filePath = path.join(dir, "data", "npc-overrides.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("starts empty, saves overrides sorted by key, and drops an emptied one", async () => {
    const store = createNpcOverrideStore(filePath);
    expect((await store.list()).overrides).toEqual({});
    await store.put("rosie", { name: "Rosie Red", cardScale: 60 });
    await store.put("laz", { seatedY: -50 });
    const onDisk = JSON.parse(await readFile(filePath, "utf8")) as { overrides: Record<string, unknown> };
    expect(Object.keys(onDisk.overrides)).toEqual(["laz", "rosie"]);
    expect((await store.put("laz", {})).overrides).toEqual({ rosie: { name: "Rosie Red", cardScale: 60 } });
  });

  it("validates keys and fields, normalizing what it keeps", () => {
    expect(() => requireNpcOverrideKey(null)).toThrow(NpcOverrideError);
    expect(() => requireNpcOverrideKey("../evil")).toThrow(NpcOverrideError);
    expect(requireNpcOverrideKey("theBleakBokor")).toBe("theBleakBokor");
    expect(() => parseNpcOverrideBody({ color: "red" })).toThrow(NpcOverrideError);
    expect(() => parseNpcOverrideBody({ cardScale: 0 })).toThrow(NpcOverrideError);
    expect(() => parseNpcOverrideBody({ seatedY: "low" })).toThrow(NpcOverrideError);
    expect(parseNpcOverrideBody({ name: "  Doc  ", color: "#A1B2C3", cardScale: 53.12345, seatedY: null })).toEqual({
      name: "Doc",
      color: "#a1b2c3",
      cardScale: 53.123
    });
    expect(parseNpcOverrideBody({ name: " ", color: "" })).toEqual({});
  });
});
