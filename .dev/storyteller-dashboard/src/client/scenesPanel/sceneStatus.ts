import type { LibraryScene, SceneStatus } from "../../shared/sceneLibrary";
import type { SceneClock } from "./commands";
import { draftClock, newSceneKey } from "./library";
import { toDate } from "./liveScene";
import { defaultPace, nightOf, sceneTimeOf } from "./sceneClock";

/**
 * How a scene starts when the Storyteller switches to it. An ongoing scene goes straight back to its own time
 * (×5 to Now when that is earlier tonight, ×2 from an earlier night). A new scene (or a template's copy) asks:
 * the Now row with travel time, plus the Scene Time row only when the scene was given a time of its own.
 */
export type EntryPlan =
  | { readonly kind: "switch"; readonly clock: SceneClock }
  | { readonly kind: "menu"; readonly showScene: boolean };

export const entryPlan = (row: LibraryScene | undefined, present: Date | undefined): EntryPlan => {
  if (row?.status === "ongoing") {
    const own = sceneTimeOf(row);
    if (!own) {
      return { kind: "switch", clock: { from: "present", plusMinutes: 0, pace: "x2" } };
    }
    return { kind: "switch", clock: { from: "scene", plusMinutes: 0, pace: defaultPace(toDate(own), present) } };
  }
  return { kind: "menu", showScene: row !== undefined && draftClock(row) !== null };
};

/** Template names show in square brackets. */
export const displayTitle = (row: Pick<LibraryScene, "title" | "status">): string =>
  row.status === "template" ? `[${row.title}]` : row.title;

/** "Oct 12": the in-game night a time belongs to (hours before noon count as the evening before). */
export const nightLabel = (at: Date): string => nightOf(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** A template's title plus the night it is played, numbered "(2)" … when that title is taken. */
export const templateCopyTitle = (template: string, night: string, titles: readonly string[]): string => {
  const base = `${template} (${night})`;
  if (!titles.includes(base)) {
    return base;
  }
  let n = 2;
  while (titles.includes(`${base} (${n})`)) {
    n += 1;
  }
  return `${base} (${n})`;
};

/** The fresh scene a template plays as: its content under a dated title and a new key, starting out new. */
export const templateCopy = (template: LibraryScene, night: string, rows: readonly LibraryScene[]): LibraryScene => {
  const title = templateCopyTitle(template.title, night, rows.map((row) => row.title));
  return { ...template, key: newSceneKey(title, rows.map((row) => row.key)), title, linked: false, status: "new" };
};

/** A live scene in the phase bar: the table's, an ongoing one, or a new scene or template put on the deck. */
export type DeckScene = { readonly key: string; readonly title: string; readonly status: SceneStatus };

/**
 * The phase bar's live scenes: the table's scene, every ongoing scene (they are always on deck), then the deck
 * file's new scenes and templates, in the same order as the Play a Scene list (library order; deck entries with
 * no library row last). Ended scenes never show.
 */
export const deckScenes = (
  rows: readonly LibraryScene[],
  deck: readonly { readonly key: string; readonly title: string }[],
  current: { readonly key: string; readonly title: string } | null
): readonly DeckScene[] => {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const out: DeckScene[] = [];
  const add = (scene: DeckScene): void => {
    if (!out.some((known) => known.key === scene.key)) {
      out.push(scene);
    }
  };
  if (current) {
    add({ ...current, status: "ongoing" });
  }
  rows.filter((row) => row.status === "ongoing").forEach((row) => add({ key: row.key, title: displayTitle(row), status: "ongoing" }));
  const libraryIndex = (key: string): number => {
    const index = rows.findIndex((row) => row.key === key);
    return index < 0 ? rows.length : index;
  };
  [...deck].sort((a, b) => libraryIndex(a.key) - libraryIndex(b.key)).forEach((entry) => {
    const row = byKey.get(entry.key);
    const status = row?.status ?? "new";
    if (status === "new" || status === "template") {
      add({ key: entry.key, title: row ? displayTitle(row) : entry.title, status });
    }
  });
  return out;
};

/** The Play a Scene list order: ongoing scenes, then new scenes and templates on the deck, then the rest. */
export const libraryRank = (status: SceneStatus, onDeck: boolean): number => (status === "ongoing" ? 0 : onDeck ? 1 : 2);
