import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isValidTermKey, normalizeTermKey, termKey } from "../shared/termKey.js";
import { createTermImageStore, TermImageError } from "./termImages.js";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("termKey", () => {
  it("normalizes case, spacing and colons", () => {
    expect(termKey("Discipline", "  Blood   Sorcery ")).toBe("discipline:blood sorcery");
    expect(normalizeTermKey("Power : Compel")).toBe("power:compel");
    expect(termKey("background", "")).toBe("background");
    expect(isValidTermKey("skill:brawl")).toBe(true);
    expect(isValidTermKey("Skill:Brawl")).toBe(false);
    expect(isValidTermKey("brawl")).toBe(false);
  });
});

describe("createTermImageStore", () => {
  let dir = "";

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "term-images-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("saves, replaces and removes an image", async () => {
    const store = createTermImageStore(dir);
    expect(await store.list()).toEqual({ terms: {} });

    const first = await store.put("skill:brawl", "image/png", PNG);
    const firstFile = first.terms["skill:brawl"]?.file ?? "";
    expect(firstFile).toMatch(/\.png$/);
    expect(store.resolveFile(firstFile)).toBe(path.join(dir, firstFile));

    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await store.put("skill:brawl", "image/jpeg", PNG);
    const secondFile = second.terms["skill:brawl"]?.file ?? "";
    expect(secondFile).toMatch(/\.jpg$/);
    expect((await readdir(dir)).sort()).toEqual(["index.json", secondFile].sort());

    const cleared = await store.remove("skill:brawl");
    expect(cleared.terms).toEqual({});
    expect(await readdir(dir)).toEqual(["index.json"]);
  });

  it("keeps text and image independently", async () => {
    const store = createTermImageStore(dir);
    const textOnly = await store.putText("power:compel", "**Bold** line\n\n");
    expect(textOnly.terms["power:compel"]).toMatchObject({ text: "**Bold** line" });
    expect(textOnly.terms["power:compel"]?.file).toBeUndefined();

    const withImage = await store.put("power:compel", "image/png", PNG);
    const file = withImage.terms["power:compel"]?.file ?? "";
    expect(withImage.terms["power:compel"]).toMatchObject({ file, text: "**Bold** line" });

    const imageGone = await store.remove("power:compel", "image");
    expect(imageGone.terms["power:compel"]).toMatchObject({ text: "**Bold** line" });
    expect(await readdir(dir)).toEqual(["index.json"]);

    expect((await store.putText("power:compel", "   ")).terms).toEqual({});
    expect((await store.list()).terms).toEqual({});
  });

  it("rejects bad keys, types and file names", async () => {
    const store = createTermImageStore(dir);
    await expect(store.put("Brawl", "image/png", PNG)).rejects.toBeInstanceOf(TermImageError);
    await expect(store.put("skill:brawl", "text/plain", PNG)).rejects.toThrow(/PNG, JPEG/);
    expect(store.resolveFile("../index.json")).toBeNull();
  });
});
