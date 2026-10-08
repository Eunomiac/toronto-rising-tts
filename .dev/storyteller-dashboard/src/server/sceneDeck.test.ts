import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseSceneDeckPatch } from "../shared/sceneDeck";
import { BACKUP_INTERVAL_MS, backupName, backupsToPrune, createSceneDeckStore } from "./sceneDeck";

describe("scene deck store", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "scene-deck-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("starts empty, replaces whole sections, and keeps the rest", async () => {
    const store = createSceneDeckStore(path.join(dir, "data", "scene-deck.json"), null);
    expect(await store.get()).toEqual({ deck: [], notes: {}, roster: { categories: [], assigned: {}, groupColors: {}, leaders: {} }, seeded: false });
    await store.patch({ deck: [{ key: "elysium", title: "Elysium" }] });
    const after = await store.patch({ seeded: true });
    expect(after.deck).toEqual([{ key: "elysium", title: "Elysium" }]);
    expect(after.seeded).toBe(true);
    const onDisk: unknown = JSON.parse(await readFile(path.join(dir, "data", "scene-deck.json"), "utf8"));
    expect(onDisk).toEqual(after);
  });

  it("backs up at most once per interval", async () => {
    let clock = new Date(2026, 9, 8, 20, 0, 0);
    const backups = path.join(dir, "backups");
    const store = createSceneDeckStore(path.join(dir, "scene-deck.json"), backups, () => clock);
    await store.patch({ seeded: true });
    clock = new Date(clock.getTime() + 60_000);
    await store.patch({ deck: [] });
    expect(await readdir(backups)).toEqual([backupName(new Date(2026, 9, 8, 20, 0, 0))]);
    clock = new Date(clock.getTime() + BACKUP_INTERVAL_MS);
    await store.patch({ deck: [] });
    expect(await readdir(backups)).toHaveLength(2);
  });

  it("drops malformed rows from disk instead of failing", async () => {
    const file = path.join(dir, "scene-deck.json");
    await writeFile(file, JSON.stringify({ deck: [{ key: 1 }, { key: "a", title: "A" }], notes: { A: { docs: [], activeId: "x" } } }));
    const deck = await createSceneDeckStore(file, null).get();
    expect(deck.deck).toEqual([{ key: "a", title: "A" }]);
    expect(deck.notes).toEqual({});
  });
});

describe("backupsToPrune", () => {
  it("keeps the newest copies and the first of each day", () => {
    const names = [
      "scene-deck-20261006-090000.json",
      "scene-deck-20261006-100000.json",
      "scene-deck-20261007-090000.json",
      "scene-deck-20261007-100000.json",
      "scene-deck-20261008-090000.json",
      "other.json"
    ];
    expect(backupsToPrune(names, 2)).toEqual(["scene-deck-20261006-100000.json"]);
  });
});

describe("parseSceneDeckPatch", () => {
  it("refuses unknown sections and wrong types", () => {
    expect(() => parseSceneDeckPatch({ decks: [] })).toThrow(/Unknown/);
    expect(() => parseSceneDeckPatch({ notes: [] })).toThrow(/object/);
    expect(parseSceneDeckPatch({ seeded: true })).toEqual({ seeded: true });
  });
});
