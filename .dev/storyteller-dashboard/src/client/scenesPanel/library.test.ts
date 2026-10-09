import { describe, expect, it } from "vitest";
import type { LibraryScene } from "../../shared/sceneLibrary";
import { applyToDraft, draftSceneSlice, draftStage, mergeFromTts, newLibraryScene, newSceneKey, newSceneTitle, parseTtsLibrarySnapshot, sceneKeyFromTitle, scenesFromTts } from "./library";

const scene = (key: string, extra: Partial<LibraryScene> = {}): LibraryScene => ({
  key,
  title: key,
  placementMode: "standard",
  linked: false,
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
    draft = applyToDraft(draft, { op: "weatherOverride", rain: "rainHeavy", wind: 2, thunder: true });
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
    expect(draft.sessionScene.npcWorld).toEqual({ placements: {}, other: 1 });
  });
});
