import { describe, expect, it } from "vitest";
import type { LibraryScene } from "../../shared/sceneLibrary";
import { deckScenes, displayTitle, entryPlan, forkPreviewScene, libraryRank, nightLabel, templateCopy, templateCopyTitle, uniqueSceneTitle } from "./sceneStatus";

const scene = (key: string, extra: Partial<LibraryScene> = {}): LibraryScene => ({
  key,
  title: key,
  placementMode: "standard",
  linked: false,
  status: "new",
  sessionScene: { clock: { isPresentDay: true } },
  ...extra
});

const at = (day: number, hour: number, minute = 0): Record<string, unknown> =>
  ({ year: 2026, month: 10, day, hour, minute, isPresentDay: false });

describe("entryPlan", () => {
  const present = new Date(2026, 9, 10, 1, 30);

  it("asks about a new scene, offering its own time only when it was given one", () => {
    expect(entryPlan(scene("a"), present)).toEqual({ kind: "menu", showScene: false });
    expect(entryPlan(scene("a", { sessionScene: { clock: at(9, 22) } }), present)).toEqual({ kind: "menu", showScene: true });
    expect(entryPlan(scene("a", { status: "template" }), present)).toEqual({ kind: "menu", showScene: false });
  });

  it("switches straight back to an ongoing scene: ×5 to Now from tonight, ×2 from an earlier night", () => {
    expect(entryPlan(scene("a", { status: "ongoing", sessionScene: { clock: at(9, 22) } }), present))
      .toEqual({ kind: "switch", clock: { from: "scene", plusMinutes: 0, pace: "x5" } });
    expect(entryPlan(scene("a", { status: "ongoing", sessionScene: { clock: at(8, 23) } }), present))
      .toEqual({ kind: "switch", clock: { from: "scene", plusMinutes: 0, pace: "x2" } });
  });

  it("starts an ongoing scene with no time of its own at Now", () => {
    expect(entryPlan(scene("a", { status: "ongoing" }), present))
      .toEqual({ kind: "switch", clock: { from: "present", plusMinutes: 0, pace: "x2" } });
  });
});

describe("templates", () => {
  it("lets a template share a name with an ordinary scene, and numbers a real duplicate", () => {
    const rows = [
      scene("live", { title: "Elysium", status: "ongoing" }),
      scene("tpl", { title: "Elysium", status: "template" }),
      scene("other", { title: "Elysium (2)", status: "new" })
    ];
    expect(uniqueSceneTitle("Elysium", { key: "tpl", status: "template" }, rows)).toBe("Elysium");
    expect(uniqueSceneTitle("Elysium", { key: "fresh", status: "new" }, rows)).toBe("Elysium (3)");
    expect(uniqueSceneTitle("  Vestibule  ", { key: "fresh", status: "new" }, rows)).toBe("Vestibule");
  });
  it("show in brackets", () => {
    expect(displayTitle({ title: "Elysium", status: "template" })).toBe("[Elysium]");
    expect(displayTitle({ title: "Elysium", status: "new" })).toBe("Elysium");
  });

  it("date their copies by the night (hours before noon belong to the evening before)", () => {
    expect(nightLabel(new Date(2026, 9, 12, 21, 0))).toBe("Oct 12");
    expect(nightLabel(new Date(2026, 9, 13, 3, 0))).toBe("Oct 12");
    expect(templateCopyTitle("Elysium", "Oct 12", [])).toBe("Elysium (Oct 12)");
    expect(templateCopyTitle("Elysium", "Oct 12", ["Elysium (Oct 12)"])).toBe("Elysium (Oct 12) (2)");
  });

  it("copy as a new, unlinked scene under a fresh key", () => {
    const template = scene("elysium", { title: "Elysium", status: "template", sessionScene: { siteKey: "S" } });
    const copy = templateCopy(template, "Oct 12", [template]);
    expect(copy).toEqual({ ...template, key: "elysiumOct12", title: "Elysium (Oct 12)", linked: false, status: "new" });
  });
});

describe("forkPreviewScene", () => {
  it("copies the preview into a new unlinked scene and does not share its contents", () => {
    const source = scene("elysium", {
      title: "Elysium",
      status: "ongoing",
      linked: true,
      sessionScene: { siteKey: "S", npcWorld: { placements: {} } }
    });
    const copy = forkPreviewScene(source, [source]);
    expect(copy.key).toBe("elysiumCopy");
    expect(copy.title).toBe("Elysium copy");
    expect(copy.status).toBe("new");
    expect(copy.linked).toBe(false);
    (copy.sessionScene.npcWorld as { placements: Record<string, unknown> }).placements.extra = 1;
    expect(source.sessionScene).toEqual({ siteKey: "S", npcWorld: { placements: {} } });
    expect(forkPreviewScene(source, [source, copy]).title).toBe("Elysium copy (2)");
  });
});

describe("deckScenes", () => {
  it("lists the table's scene, every ongoing scene, then deck entries that are new or templates", () => {
    const rows = [
      scene("old", { status: "ongoing" }),
      scene("fresh"),
      scene("done", { status: "ended" }),
      scene("tpl", { title: "Elysium", status: "template" })
    ];
    const deck = [{ key: "fresh", title: "fresh" }, { key: "done", title: "done" }, { key: "tpl", title: "Elysium" }, { key: "old", title: "old" }];
    expect(deckScenes(rows, deck, { key: "live", title: "Live" })).toEqual([
      { key: "live", title: "Live", status: "ongoing" },
      { key: "old", title: "old", status: "ongoing" },
      { key: "fresh", title: "fresh", status: "new" },
      { key: "tpl", title: "[Elysium]", status: "template" }
    ]);
  });
});

describe("libraryRank", () => {
  it("puts ongoing scenes first, then deck scenes, then the rest", () => {
    expect(libraryRank("ongoing", false)).toBe(0);
    expect(libraryRank("template", true)).toBe(1);
    expect(libraryRank("new", false)).toBe(2);
  });
});
