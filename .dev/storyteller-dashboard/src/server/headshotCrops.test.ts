import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHeadshotCropStore, HeadshotCropError, parseHeadshotCrop, requireHeadshotKey } from "./headshotCrops";

describe("headshot crop store", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "headshot-crops-"));
    filePath = path.join(dir, "data", "headshot-crops.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("starts empty, saves crops sorted by key, and replaces or removes them", async () => {
    const store = createHeadshotCropStore(filePath);
    expect((await store.list()).crops).toEqual({});
    await store.put("rosie", { cx: 0.5, cy: 0.1, size: 0.12 });
    await store.put("laz", { cx: 0.4, cy: 0.08, size: 0.1 });
    await store.put("rosie", { cx: 0.52, cy: 0.11, size: 0.13 });
    const onDisk = JSON.parse(await readFile(filePath, "utf8")) as { crops: Record<string, unknown> };
    expect(Object.keys(onDisk.crops)).toEqual(["laz", "rosie"]);
    expect(onDisk.crops.rosie).toEqual({ cx: 0.52, cy: 0.11, size: 0.13 });
    expect((await store.remove("laz")).crops).toEqual({ rosie: { cx: 0.52, cy: 0.11, size: 0.13 } });
  });

  it("validates keys and crops, rounding to four decimals", () => {
    expect(() => requireHeadshotKey(null)).toThrow(HeadshotCropError);
    expect(() => requireHeadshotKey("../evil")).toThrow(HeadshotCropError);
    expect(requireHeadshotKey("theBleakBokor")).toBe("theBleakBokor");
    expect(() => parseHeadshotCrop({ cx: 0.5, cy: 0.1 })).toThrow(HeadshotCropError);
    expect(() => parseHeadshotCrop({ cx: 0.5, cy: 0.1, size: 0 })).toThrow(HeadshotCropError);
    expect(parseHeadshotCrop({ cx: 0.123456, cy: 0.1, size: 0.2 })).toEqual({ cx: 0.1235, cy: 0.1, size: 0.2 });
  });
});
