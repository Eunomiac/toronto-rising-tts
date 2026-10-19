import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyMemoriamFields, type MemoriamSheetNpc } from "../shared/memoriamNpc.js";
import { createMemoriamFieldStore, parseMemoriamFieldBody } from "./memoriamNpcFields.js";

const sheetNpc = (): MemoriamSheetNpc => ({
  key: "mem_a",
  filename: "npc_mem_a.webp",
  label: "Adrian",
  location: "Toronto",
  year: "1800s",
  variantOfUnique: "",
  isGeneric: false,
  tags: "",
  periods: ["aishe2"]
});

describe("Memoriam field edits", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "memoriam-fields-"));
    filePath = path.join(dir, "memoriam-npc-fields.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("keeps a year that differs from the sheet and drops it when set back", async () => {
    const store = createMemoriamFieldStore(filePath);
    const sheet = { locations: ["Toronto"], years: ["1800s"], periods: ["aishe2"] };
    await store.put("mem_a", { locations: ["Toronto"], years: ["1900s", "1800s"], periods: ["aishe2"] }, sheet);
    const onDisk = JSON.parse(await readFile(filePath, "utf8")) as { fields: Record<string, { years?: string[] }> };
    expect(onDisk.fields.mem_a).toEqual({ years: ["1900s", "1800s"] });
    const view = applyMemoriamFields(sheetNpc(), onDisk.fields.mem_a);
    expect(view.years).toEqual(["1900s", "1800s"]);
    expect(view.locations).toEqual(["Toronto"]);
    expect((await store.put("mem_a", { locations: ["Toronto"], years: ["1800s"], periods: ["aishe2"] }, sheet)).fields).toEqual({});
  });

  it("rejects Present and an unknown period", () => {
    const known = new Set(["aishe2"]);
    expect(parseMemoriamFieldBody({ locations: ["Toronto"], years: ["Present"], periods: ["aishe2"] }, known)).toMatch(/Modern/);
    expect(parseMemoriamFieldBody({ locations: ["New Orleans", "Western"], years: ["Modern"], periods: ["missing"] }, known)).toMatch(/missing/);
    expect(parseMemoriamFieldBody({ locations: [], years: ["Modern", "1700s"], periods: ["aishe2"] }, known)).toEqual({
      locations: [],
      years: ["Modern", "1700s"],
      periods: ["aishe2"]
    });
  });
});
