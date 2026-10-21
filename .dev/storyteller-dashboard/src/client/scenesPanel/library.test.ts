import { describe, expect, it } from "vitest";
import type { LibraryScene } from "../../shared/sceneLibrary";
import {
  applyToDraft,
  draftGenerics,
  draftScatterGroups,
  draftSceneSlice,
  draftSeatRows,
  draftStage,
  draftTable,
  mergeFromTts,
  newLibraryScene,
  newSceneKey,
  newSceneTitle,
  parseTtsLibrarySnapshot,
  sceneKeyFromTitle,
  scenesFromTts,
  withScatterPack
} from "./library";
import { stageToBoard, type StagePack } from "./stageFrame";

const scene = (key: string, extra: Partial<LibraryScene> = {}): LibraryScene => ({
  key,
  title: key,
  placementMode: "standard",
  linked: false,
  status: "new",
  sessionScene: { siteKey: "CLGrounds", clock: { isPresentDay: true } },
  ...extra
});

describe("TTS library snapshot", () => {
  it("reads rows in TTS's order and treats an empty table as no rows", () => {
    const snapshot = parseTtsLibrarySnapshot({
      ok: true,
      order: ["b", "a"],
      scenes: { a: { title: "A", receivesLiveWrites: true, sessionScene: { siteKey: "x" } }, b: { title: "B", placementMode: "scatter" }, c: { title: "C" } }
    });
    expect(scenesFromTts(snapshot).map((row) => [row.key, row.linked, row.placementMode])).toEqual([
      ["b", false, "scatter"],
      ["a", true, "standard"],
      ["c", false, "standard"]
    ]);
    expect(scenesFromTts(parseTtsLibrarySnapshot({ ok: true, order: [], scenes: [] }))).toEqual([]);
    expect(() => parseTtsLibrarySnapshot({ ok: false, error: "loading" })).toThrow("loading");
  });

  it("reads each row's status, counting a row without one as new", () => {
    const snapshot = parseTtsLibrarySnapshot({
      ok: true,
      order: ["a", "b", "c"],
      scenes: { a: { title: "A", status: "ongoing" }, b: { title: "B", status: "bogus" }, c: { title: "C" } }
    });
    expect(scenesFromTts(snapshot).map((row) => row.status)).toEqual(["ongoing", "new", "new"]);
  });
});

describe("mergeFromTts", () => {
  it("takes linked rows from TTS, keeps dashboard edits otherwise, and appends TTS-only rows", () => {
    const local = [scene("a", { title: "Edited" }), scene("b", { linked: true }), scene("dashOnly")];
    const tts = [scene("a", { title: "Old" }), scene("b", { title: "Live", linked: true }), scene("fork")];
    expect(mergeFromTts(local, tts).map((row) => `${row.key}:${row.title}:${row.linked}`)).toEqual([
      "a:Edited:false",
      "b:Live:true",
      "dashOnly:dashOnly:false",
      "fork:fork:false"
    ]);
  });

  it("drops the link flag TTS cleared and returns the same array when nothing changed", () => {
    const local = [scene("a", { linked: true })];
    expect(mergeFromTts(local, [scene("a")])[0]?.linked).toBe(false);
    const same = [scene("a")];
    expect(mergeFromTts(same, [scene("a")])).toBe(same);
  });

  it("takes TTS's status (ongoing, ended) while keeping the dashboard's edits", () => {
    const local = [scene("a", { title: "Edited" })];
    const merged = mergeFromTts(local, [scene("a", { title: "Old", status: "ended" })]);
    expect(merged[0]).toMatchObject({ title: "Edited", status: "ended" });
  });

  it("adopts TTS's copy of an unlinked row on the write-back after a scene leaves the table", () => {
    const local = [scene("a", { linked: true, sessionScene: { siteKey: "CLGrounds", clock: { isPresentDay: true, hour: 20, minute: 0 } } })];
    const left = scene("a", { sessionScene: { siteKey: "CLGrounds", clock: { isPresentDay: true, hour: 20, minute: 5 } } });
    expect(mergeFromTts(local, [left])[0]?.sessionScene.clock).toMatchObject({ hour: 20, minute: 0 });
    expect(mergeFromTts(local, [left], true)[0]).toEqual(left);
  });
});

describe("new scenes", () => {
  it("names them District - Site, numbered when taken, with a unique key", () => {
    expect(newSceneTitle("The Annex", "Casa Loma", [])).toBe("The Annex - Casa Loma");
    expect(newSceneTitle("The Annex", "Casa Loma", ["The Annex - Casa Loma", "The Annex - Casa Loma (2)"])).toBe("The Annex - Casa Loma (3)");
    expect(newSceneKey("Casa Loma", ["casaLoma"])).toBe("casaLoma_2");
  });

  it("builds camelCase ASCII keys from titles", () => {
    expect(sceneKeyFromTitle("   ")).toBe("untitledScene");
    expect(sceneKeyFromTitle("The Élysium")).toBe("theElysium");
    expect(sceneKeyFromTitle("13th Precinct")).toBe("scene13thPrecinct");
  });

  it("copies the template's set-up but starts at present day with no conditions or held weather", () => {
    const template = scene("t", {
      placementMode: "scatter",
      sessionScene: { seatSlots: { Red: {} }, skyboxOverride: "Generic", conditions: ["x"], soundscapeNarrative: { rain: "rainHeavy" }, clock: { isPresentDay: false } }
    });
    const made = newLibraryScene(template, "k", "K", { districtKey: "D", siteKey: "S" });
    expect(made.placementMode).toBe("scatter");
    expect(made.sessionScene).toEqual({
      seatSlots: { Red: {} },
      districtKey: "D",
      siteKey: "S",
      clock: { isPresentDay: true },
      conditions: [],
      chronicleWeatherFollowSchedule: true,
      chronicleWeatherManualHold: false
    });
  });
});

describe("applyToDraft", () => {
  it("edits the authored fields the preview panels send", () => {
    let draft = scene("a");
    draft = applyToDraft(draft, { op: "location", districtKey: "D", siteKey: "S" });
    draft = applyToDraft(draft, { op: "skybox", key: "Generic" });
    draft = applyToDraft(draft, { op: "conditions", ids: ["fog"] });
    draft = applyToDraft(draft, { op: "clockTo", datetime: { year: 2026, month: 1, day: 2, hour: 22, minute: 0 } });
    draft = applyToDraft(draft, { op: "weatherOverride", rain: "rainHeavy", wind: 2, thunder: true, cold: true });
    draft = applyToDraft(draft, { op: "table", key: "Scatter" });
    expect(draft.placementMode).toBe("scatter");
    expect(draft.sessionScene).toMatchObject({
      districtKey: "D",
      siteKey: "S",
      skyboxOverride: "Generic",
      conditions: ["fog"],
      clock: { year: 2026, month: 1, day: 2, hour: 22, minute: 0, isPresentDay: false },
      soundscapeNarrative: { rain: "rainHeavy", wind: "windWinterMed", thunderstorm: true },
      chronicleWeatherManualHold: true
    });
    const slice = draftSceneSlice(draft, false);
    expect(slice.weatherOverride).toEqual({ rain: "rainHeavy", wind: "windWinterMed", thunder: true });
    expect(slice.skyboxOverride).toBe("Generic");

    const released = applyToDraft(applyToDraft(draft, { op: "weatherOverride", release: true }), { op: "skybox", key: "none" });
    expect(released.sessionScene.soundscapeNarrative).toEqual({});
    expect("skyboxOverride" in released.sessionScene).toBe(false);
    expect(draftSceneSlice(released, false).weatherOverride).toBeUndefined();
  });

  it("picks the wind layer by temperature, not by month", () => {
    const january = applyToDraft(scene("a"), { op: "clockTo", datetime: { year: 2026, month: 1, day: 2, hour: 14, minute: 0 } });
    const warm = applyToDraft(january, { op: "weatherOverride", rain: "none", wind: 1, thunder: false, cold: false });
    expect(warm.sessionScene.soundscapeNarrative).toMatchObject({ wind: "windLow" });
    const calm = applyToDraft(january, { op: "weatherOverride", rain: "none", wind: 0, thunder: false, cold: true });
    expect(calm.sessionScene.soundscapeNarrative).toMatchObject({ wind: "none" });
  });

  it("ignores commands that have no library meaning", () => {
    const draft = scene("a");
    expect(applyToDraft(draft, { op: "laneVolume", lane: "music", volume: 0.5 })).toBe(draft);
  });

  it("edits the draft's stage placements", () => {
    let draft = scene("a", { sessionScene: { npcWorld: { placements: { old: { u: 0.1, v: 0.2, npcLightMode: "OFF" } }, other: 1 } } });
    draft = applyToDraft(draft, { op: "stage", changes: { old: { u: 0.3, v: 0.4 }, fresh: { u: 0.5, v: 0.6, lightMode: "STANDARD" } } });
    expect(draftStage(draft)).toEqual([
      { characterKey: "old", u: 0.3, v: 0.4, lightMode: "OFF" },
      { characterKey: "fresh", u: 0.5, v: 0.6, lightMode: "STANDARD" }
    ]);
    draft = applyToDraft(draft, { op: "stage", changes: { old: { remove: true } } });
    expect(draftStage(draft).map((npc) => npc.characterKey)).toEqual(["fresh"]);
    draft = applyToDraft(draft, { op: "stage", clear: true });
    expect(draftStage(draft)).toEqual([]);
    expect(draft.sessionScene.npcWorld).toEqual({ placements: {}, genericMembership: {}, other: 1 });
  });

  it("adds, renames and drops the draft's generic NPCs", () => {
    let draft = scene("a", { sessionScene: { npcWorld: { genericMembership: [] } } });
    draft = applyToDraft(draft, { op: "genericAdd", keys: ["cop_01", "cop_02"], labels: { cop_01: "Police" } });
    draft = applyToDraft(draft, { op: "stage", changes: { cop_01: { u: 0.1, v: 0.1 }, cop_02: { u: 0.2, v: 0.2 } } });
    draft = applyToDraft(draft, { op: "genericRename", key: "cop_01", name: "Officer Dale" });
    expect(draftGenerics(draft)).toEqual([
      { characterKey: "cop_01", name: "Officer Dale" },
      { characterKey: "cop_02", name: "cop_02" }
    ]);
    draft = applyToDraft(draft, { op: "stage", changes: { cop_02: { remove: true } } });
    expect(draftGenerics(draft).map((npc) => npc.characterKey)).toEqual(["cop_01"]);
    expect(applyToDraft(draft, { op: "genericRename", key: "cop_09", name: "Nobody" })).toBe(draft);
  });

  it("keeps a generic's stat tier through renames and tier changes", () => {
    let draft = applyToDraft(scene("a"), { op: "genericAdd", keys: ["cop_01"], labels: { cop_01: "Bradley" }, tiers: { cop_01: "deadly" } });
    draft = applyToDraft(draft, { op: "genericRename", key: "cop_01", name: "Officer Bradley" });
    expect(draftGenerics(draft)).toEqual([{ characterKey: "cop_01", name: "Officer Bradley", tier: "deadly" }]);
    draft = applyToDraft(draft, { op: "genericTier", key: "cop_01", tier: "weak" });
    expect(draftGenerics(draft)[0]?.tier).toBe("weak");
    draft = applyToDraft(draft, { op: "genericTier", key: "cop_01" });
    expect(draftGenerics(draft)).toEqual([{ characterKey: "cop_01", name: "Officer Bradley" }]);
  });

  it("brings a kept character in with its id and no tier", () => {
    const draft = applyToDraft(scene("a"), {
      op: "genericAdd",
      keys: ["cop_01"],
      labels: { cop_01: "Officer Bradley" },
      tiers: { cop_01: "deadly" },
      kept: { cop_01: "k3x9" }
    });
    expect(draftGenerics(draft)).toEqual([{ characterKey: "cop_01", name: "Officer Bradley", keptId: "k3x9" }]);
  });
});

describe("draft seating", () => {
  const seated = scene("a", {
    sessionScene: {
      seatSlots: {
        Red: { characterKey: "lordLucien", isPlayingNPC: false, isPresent: true, tableSlot: 1 },
        Pink: { characterKey: "aishe", isPlayingNPC: true, npcCharacterKey: "drake", tableSlot: 3 },
        NPC1: { characterKey: "mara", isPresent: false, tableSlot: 6 },
        NPC2: { slotEmpty: true }
      },
      seatPresent: { Pink: false }
    }
  });

  it("reads seats from the draft, presence from seatSlots then seatPresent, connection from the table", () => {
    const rows = draftSeatRows(seated, [{ seat: "Red", kind: "pc", isPresent: true, tableSlot: 1, absentFromSession: true }]);
    expect(rows).toEqual([
      { seat: "Red", kind: "pc", isPresent: true, tableSlot: 1, charKey: "lordLucien", absentFromSession: true },
      { seat: "Pink", kind: "pc", isPresent: false, tableSlot: 3, charKey: "aishe", playingNpcKey: "drake" },
      { seat: "NPC1", kind: "npc", isPresent: false, tableSlot: 6, characterKey: "mara" },
      { seat: "NPC2", kind: "npc", isPresent: true, slotEmpty: true }
    ]);
  });

  it("marks a seat present or out of the scene in seatSlots and its seatPresent mirror", () => {
    const draft = applyToDraft(seated, { op: "seatPresence", seat: "NPC1", present: true });
    expect(draft.sessionScene.seatSlots).toMatchObject({ NPC1: { characterKey: "mara", isPresent: true, tableSlot: 6 } });
    expect(draft.sessionScene.seatPresent).toEqual({ Pink: false, NPC1: true });
  });

  it("moves a seat holder to another chair, swapping with whoever sits there", () => {
    const swapped = applyToDraft(seated, { op: "seatMove", seat: "Red", chair: 6 });
    expect(swapped.sessionScene.seatSlots).toMatchObject({ Red: { tableSlot: 6 }, NPC1: { characterKey: "mara", tableSlot: 1 } });
    const moved = applyToDraft(seated, { op: "seatMove", seat: "NPC1", chair: 8 });
    expect(moved.sessionScene.seatSlots).toMatchObject({ NPC1: { tableSlot: 8 }, Red: { tableSlot: 1 } });
    expect(applyToDraft(seated, { op: "seatMove", seat: "NPC2", chair: 4 })).toBe(seated);
  });

  it("seats an NPC in an empty chair on a free NPC seat, present, and takes them off the stage", () => {
    const staged = applyToDraft(seated, { op: "stage", changes: { victor: { u: 0.4, v: 0.4 } } });
    const draft = applyToDraft(staged, { op: "seatNpc", characterKey: "victor", chair: 7 });
    expect(draft.sessionScene.seatSlots).toMatchObject({ NPC2: { characterKey: "victor", tableSlot: 7, isPresent: true } });
    expect((draft.sessionScene.seatSlots as Record<string, Record<string, unknown>>).NPC2).not.toHaveProperty("slotEmpty");
    expect(draft.sessionScene.seatPresent).toMatchObject({ NPC2: true });
    expect(draftStage(draft)).toEqual([]);
    expect(applyToDraft(seated, { op: "seatNpc", characterKey: "victor", chair: 1 })).toBe(seated);
  });

  it("moves an already seated NPC to the empty chair instead of taking a second seat", () => {
    const draft = applyToDraft(seated, { op: "seatNpc", characterKey: "mara", chair: 7 });
    expect(draft.sessionScene.seatSlots).toMatchObject({ NPC1: { characterKey: "mara", tableSlot: 7, isPresent: true }, NPC2: { slotEmpty: true } });
  });

  it("unseats an NPC and frees their chair", () => {
    const draft = applyToDraft(seated, { op: "unseatNpc", seat: "NPC1" });
    expect(draft.sessionScene.seatSlots).toMatchObject({ NPC1: { slotEmpty: true } });
    expect(draft.sessionScene.seatPresent).toMatchObject({ NPC1: false });
  });
});

describe("draft Scatter layout", () => {
  const stagePack = (label: string, u: number): StagePack => ({
    familyId: label,
    label,
    far: false,
    slots: [0, 1, 2].map((index) => ({ snapIndex: index, isAnchor: index === 1, u: u + (index - 1) * 0.02, v: 0.3 })),
    center: { u, v: 0.3 }
  });
  const packs = [stagePack("Mid Center", 0.5), stagePack("CENTER", 0.2), stagePack("Far Left", 0.8)];
  const on = (pack: StagePack, index = 1): Record<string, unknown> => {
    const slot = pack.slots[index]!;
    return { ...stageToBoard(slot.u, slot.v), npcLightMode: "STANDARD" };
  };
  const [midCenter, center, farLeft] = packs as [StagePack, StagePack, StagePack];
  const live = [{ seat: "Purple", kind: "pc" as const, isPresent: true, tableSlot: 3, charKey: "rook" }];
  const table = scene("t", {
    sessionScene: {
      tableKey: "Table A",
      seatSlots: {
        Red: { characterKey: "lucien", tableSlot: 1, isPresent: true },
        Pink: { characterKey: "aishe", tableSlot: 7, isPresent: false, isPlayingNPC: true, npcCharacterKey: "drake" },
        Purple: { tableSlot: 3 },
        NPC1: { characterKey: "mara", tableSlot: 6 },
        NPC2: { slotEmpty: true }
      },
      npcWorld: { placements: { victor: on(midCenter), drake: on(midCenter, 0), hob: on(center), ivy: on(center, 0) } },
      scatterPlacements: { scatter1: { centerCharacters: { stale: { slot: 1 } }, orbitCharacters: [] } }
    }
  });
  const scattered = draftTable(table, "Scatter", live, packs);
  const area = (draft: LibraryScene, group: number): Record<string, Record<string, unknown>> =>
    (draft.sessionScene.scatterPlacements as Record<string, Record<string, Record<string, unknown>>>)[`scatter${group}`]!;

  it("lays out fresh groups when the table goes to Scatter: PCs one to a group, NPCs by chair, then by stage pack", () => {
    expect(scattered.placementMode).toBe("scatter");
    expect(draftScatterGroups(scattered)).toEqual([
      { group: 1, pcs: [{ characterKey: "lucien", slot: 1 }], npcs: [{ characterKey: "hob", slot: 1 }, { characterKey: "ivy", slot: 2 }] },
      { group: 2, pcs: [{ characterKey: "aishe", slot: 1 }], npcs: [{ characterKey: "victor", slot: 1 }] },
      { group: 3, pcs: [{ characterKey: "rook", slot: 1 }], npcs: [] },
      { group: 4, pcs: [], npcs: [] },
      { group: 5, pcs: [], npcs: [] },
      { group: 6, pcs: [], npcs: [{ characterKey: "mara", slot: 1 }] }
    ]);
    expect(area(scattered, 2).centerCharacters).toEqual({ aishe: { slot: 1, isPlayingNPC: true, isPresent: false, characterKey: "drake" } });
    expect(area(scattered, 1).orbitCharacters).toEqual({ hob: { slot: 1, npcLightMode: "STANDARD" }, ivy: { slot: 2, npcLightMode: "STANDARD" } });
  });

  it("seeds a Scatter draft that has no stored layout, and leaves the rest alone", () => {
    const bare = scene("b", { placementMode: "scatter", sessionScene: { seatSlots: { Red: { characterKey: "lucien", tableSlot: 4 } } } });
    expect(draftScatterGroups(withScatterPack(bare, [], packs))[3]?.pcs).toEqual([{ characterKey: "lucien", slot: 1 }]);
    const disconnected = withScatterPack(bare, [{ seat: "Red", kind: "pc", isPresent: true, absentFromSession: true }], packs);
    expect(draftScatterGroups(disconnected).flatMap((group) => group.pcs)).toEqual([]);
    expect(withScatterPack(scattered, [], packs)).toBe(scattered);
    expect(withScatterPack(table, [], packs)).toBe(table);
    const stored = scene("s", { placementMode: "scatter", sessionScene: { scatterPlacements: { scatter1: { centerCharacters: [], orbitCharacters: { b: { slot: 2 }, a: { slot: 1 } } } } } });
    expect(draftScatterGroups(stored)[0]).toEqual({ group: 1, pcs: [], npcs: [{ characterKey: "a", slot: 1 }, { characterKey: "b", slot: 2 }] });
  });

  it("moves characters between groups into the lowest free slot, as the live table does", () => {
    const moved = applyToDraft(applyToDraft(scattered, { op: "scatterPlace", characterKey: "lucien", kind: "pc", group: 3 }), { op: "scatterPlace", characterKey: "hob", kind: "npc", group: 4 });
    expect(area(moved, 3).centerCharacters).toEqual({
      rook: { slot: 1, isPlayingNPC: false, isPresent: true },
      lucien: { slot: 2, isPlayingNPC: false, isPresent: true }
    });
    expect(area(moved, 1)).toEqual({ centerCharacters: {}, orbitCharacters: { ivy: { slot: 2, npcLightMode: "STANDARD" } } });
    expect(area(moved, 4).orbitCharacters).toEqual({ hob: { slot: 1, npcLightMode: "STANDARD" } });
    expect(applyToDraft(scattered, { op: "scatterPlace", characterKey: "rook", kind: "pc", group: 3 })).toBe(scattered);
    expect(applyToDraft(scattered, { op: "scatterPlace", characterKey: "rook", kind: "pc" })).toBe(scattered);
    expect(applyToDraft(scattered, { op: "scatterPlace", characterKey: "rook", kind: "pc", group: 7 })).toBe(scattered);
    expect(applyToDraft(table, { op: "scatterPlace", characterKey: "hob", kind: "npc", group: 2 })).toBe(table);
  });

  it("refuses a sixth PC in a group", () => {
    const full = Object.fromEntries(["a", "b", "c", "d", "e"].map((key, index) => [key, { slot: index + 1 }]));
    const crowded = scene("c", { placementMode: "scatter", sessionScene: { scatterPlacements: { scatter1: { centerCharacters: full, orbitCharacters: {} }, scatter2: { centerCharacters: { f: { slot: 1 } }, orbitCharacters: {} } } } });
    expect(applyToDraft(crowded, { op: "scatterPlace", characterKey: "f", kind: "pc", group: 1 })).toBe(crowded);
  });

  it("takes an NPC moved out of every group out of the scene: off the stage and out of their chair", () => {
    const cleared = applyToDraft(applyToDraft(scattered, { op: "scatterPlace", characterKey: "mara", kind: "npc" }), { op: "scatterPlace", characterKey: "victor", kind: "npc" });
    expect(draftScatterGroups(cleared).flatMap((group) => group.npcs.map((npc) => npc.characterKey))).toEqual(["hob", "ivy"]);
    expect(cleared.sessionScene.seatSlots).toMatchObject({ NPC1: { slotEmpty: true } });
    expect(draftStage(cleared).map((npc) => npc.characterKey)).toEqual(["drake", "hob", "ivy"]);
  });

  it("puts NPCs who only stood in groups onto free stage packs when the table leaves Scatter", () => {
    const added = applyToDraft(applyToDraft(scattered, { op: "scatterPlace", characterKey: "zed", kind: "npc", group: 2 }), { op: "scatterPlace", characterKey: "yul", kind: "npc", group: 4 });
    const standard = draftTable(added, "Table B", live, packs);
    expect(standard.placementMode).toBe("standard");
    expect("scatterPlacements" in standard.sessionScene).toBe(false);
    expect(standard.sessionScene.tableKey).toBe("Table A");
    const placements = (standard.sessionScene.npcWorld as Record<string, Record<string, unknown>>).placements!;
    expect(placements).toEqual({ victor: on(midCenter), drake: on(midCenter, 0), hob: on(center), ivy: on(center, 0), zed: on(farLeft) });
    const onScatterTable = scene("x", { placementMode: "scatter", sessionScene: { tableKey: "Scatter" } });
    expect(draftTable(onScatterTable, "Table B", [], packs).sessionScene.tableKey).toBe("Table B");
  });
});
