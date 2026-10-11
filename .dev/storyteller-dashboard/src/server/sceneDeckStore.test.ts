import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseNpcRoster } from "../shared/npcRoster";
import { createSceneDeckStore } from "./sceneDeckStore";

const LAYOUT = {
  categories: [{ id: "cat-1", name: "Court", color: "#aa0000", open: true }],
  assigned: { harpies: "cat-1" },
  groupColors: {},
  leaders: {}
};
const ROSTER = { groupLabels: { civilian: "Civilian" }, bosses: { harpies: "theAristocrat" }, members: { theAristocrat: ["harpies"] }, layout: LAYOUT };

describe("scene deck store", () => {
  let dir: string;
  const readJson = async (name: string): Promise<unknown> => JSON.parse(await readFile(path.join(dir, name), "utf8"));
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "scene-deck-store-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("serves the roster layout from npc-roster.json and keeps it out of scene-deck.json", async () => {
    await writeFile(path.join(dir, "npc-roster.json"), JSON.stringify(ROSTER));
    const store = await createSceneDeckStore({ dataDir: dir, backupDir: null });
    expect((await store.get()).roster).toEqual(LAYOUT);

    const leaders = { harpies: "" };
    const after = await store.patch({ roster: { ...LAYOUT, leaders }, seeded: true });
    expect(after.roster.leaders).toEqual(leaders);
    expect(after.seeded).toBe(true);
    expect(await readJson("scene-deck.json")).not.toHaveProperty("roster");
    expect(await readJson("npc-roster.json")).toEqual({ ...ROSTER, layout: { ...LAYOUT, leaders } });
  });

  it("moves a roster left in scene-deck.json into npc-roster.json once", async () => {
    await writeFile(path.join(dir, "npc-roster.json"), JSON.stringify({ ...ROSTER, layout: { categories: [], assigned: {}, groupColors: {}, leaders: {} } }));
    await writeFile(path.join(dir, "scene-deck.json"), JSON.stringify({ deck: [{ key: "elysium", title: "Elysium" }], roster: LAYOUT, seeded: true }));
    const store = await createSceneDeckStore({ dataDir: dir, backupDir: null });
    const deck = await store.get();
    expect(deck.roster).toEqual(LAYOUT);
    expect(deck.deck).toEqual([{ key: "elysium", title: "Elysium" }]);
    expect(await readJson("scene-deck.json")).not.toHaveProperty("roster");
    expect(parseNpcRoster(await readJson("npc-roster.json"))).toEqual(ROSTER);
  });

  it("refuses a malformed npc-roster.json", async () => {
    await writeFile(path.join(dir, "npc-roster.json"), JSON.stringify({ ...ROSTER, members: { theAristocrat: "harpies" } }));
    const store = await createSceneDeckStore({ dataDir: dir, backupDir: null });
    await expect(store.get()).rejects.toThrow(/members/);
  });
});
