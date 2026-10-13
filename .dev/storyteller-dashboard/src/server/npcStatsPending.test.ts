import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { NpcStatsFile } from "../shared/npcStats.js";
import { clearPending, editedNamedKeys, markPending, readPending } from "./npcStatsPending.js";

const block = (health: number) => ({ health, exceptional: [], attacks: [], powers: [] });

describe("editedNamedKeys", () => {
  it("lists character keys whose named block changed, never generic or kept entries", () => {
    const before: NpcStatsFile = { alpha: { named: block(3) }, beta: { named: block(4) }, "generic:Thug": { weak: block(2) } };
    const after: NpcStatsFile = { alpha: { named: block(5) }, beta: { named: block(4) }, "generic:Thug": { weak: block(3) }, gamma: { named: block(1) } };
    expect(editedNamedKeys(before, after, ["alpha", "beta", "generic:Thug", "gamma"])).toEqual(["alpha", "gamma"]);
  });
});

describe("pending file", () => {
  let dir = "";
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("marks keys and clears only entries not edited again", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "npc-pending-"));
    const file = path.join(dir, "pending.json");
    expect(await readPending(file)).toEqual({});
    await markPending(file, ["alpha", "beta"], new Date("2026-01-01T00:00:00Z"));
    const first = await readPending(file);
    await markPending(file, ["beta"], new Date("2026-01-02T00:00:00Z"));
    await clearPending(file, first);
    expect(await readPending(file)).toEqual({ beta: "2026-01-02T00:00:00.000Z" });
  });
});
