import { useEffect, useMemo, useRef, useState } from "react";
import type { LibraryScene, SceneStatus } from "../../shared/sceneLibrary";
import type { LabLocation, LibraryActions, LibraryEntry, LinkMenu } from "./glance";
import { sceneDeckSnapshot, setSceneDeckSection, useSceneDeck } from "../sceneDeck";
import {
  pullScenesFromTts,
  putLibraryScene,
  removeLibraryScene,
  sceneLibrarySnapshot,
  seedSceneLibraryFromTts,
  setLibraryScenes,
  useSceneLibrary,
  useSceneLibraryStatus
} from "../sceneLibrary";
import type { SceneSlice } from "../worldState";
import type { SceneClock, ScenesCommand } from "./commands";
import { newLibraryScene, newSceneKey, newSceneTitle } from "./library";
import { nightLabel, templateCopy } from "./sceneStatus";
import type { SeatingEdit } from "./transitionSeating";

/** How long the table's scene must be quiet before its library row is read back from TTS. */
const WRITE_BACK_DELAY_MS = 1500;

const upsertCommand = (row: LibraryScene): ScenesCommand => ({
  op: "upsertScene",
  key: row.key,
  title: row.title,
  placementMode: row.placementMode,
  sessionScene: row.sessionScene,
  status: row.status
});

const locationOf = (row: LibraryScene): LabLocation | undefined => {
  const { districtKey, siteKey } = row.sessionScene;
  return typeof districtKey === "string" && typeof siteKey === "string" ? { districtKey, siteKey } : undefined;
};

const message = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

/**
 * While a linked scene is on the table, TTS writes it into its library row; the dashboard reads that row back
 * after the scene changes, and reads the previous row once more when the table switches or ends a scene (or the
 * link changes), so the master copy keeps what was played. TTS's last write lands as the row unlinks (stage edits
 * and the running scene clock included), so these reads take TTS's copy whether or not the row is still linked.
 */
const useWriteBack = (scene: SceneSlice | undefined, onError: (text: string) => void): void => {
  const pending = useRef(new Set<string>());
  const last = useRef<{ key: string | undefined; linked: boolean }>({ key: undefined, linked: false });
  const errorRef = useRef(onError);
  errorRef.current = onError;
  useEffect(() => {
    const key = scene?.liveKey;
    const linked = scene?.liveLinked === true;
    const previous = last.current;
    last.current = { key, linked };
    if (previous.key && (previous.key !== key || previous.linked !== linked)) {
      pending.current.add(previous.key);
    }
    if (key && (linked || previous.key !== key || previous.linked !== linked)) {
      pending.current.add(key);
    }
    if (pending.current.size === 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const keys = [...pending.current];
      pending.current.clear();
      pullScenesFromTts(keys, true).catch((reason: unknown) => errorRef.current(`Could not read the scene library back from TTS: ${message(reason)}`));
    }, WRITE_BACK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [scene]);
};

/**
 * The scene library and preview panels for the live Scenes tab. The dashboard's library is the master copy:
 * Play and Save send the row to TTS (`upsertScene`) first. Previews are drafts kept in the scene deck file until
 * saved, played or discarded. Playing a template plays a dated copy of it (`templateCopy`); the template stays.
 */
export const useLibraryActions = ({ scene, present, sendBatch, removeFromDeck }: {
  scene: SceneSlice | undefined;
  /** Present day, which dates a template's copy. */
  present: Date | null;
  /** Sends the queue, then these commands, in one batch. */
  sendBatch: (commands: readonly ScenesCommand[]) => void;
  removeFromDeck: (key: string) => void;
}) => {
  const library = useSceneLibrary();
  const status = useSceneLibraryStatus();
  const { previews } = useSceneDeck();
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useWriteBack(scene, setNotice);

  const findRow = (key: string): LibraryScene | undefined => sceneLibrarySnapshot().scenes.find((row) => row.key === key);
  const findDraft = (key: string): LibraryScene | undefined => sceneDeckSnapshot().previews.find((row) => row.key === key);
  const setPreviews = (next: readonly LibraryScene[]): void => setSceneDeckSection("previews", next);
  const addToDeck = (row: LibraryScene): void => {
    const deck = sceneDeckSnapshot().deck;
    if (!deck.some((entry) => entry.key === row.key)) {
      setSceneDeckSection("deck", [...deck, { key: row.key, title: row.title }]);
    }
  };
  const closeDraft = (key: string): void => {
    const rest = sceneDeckSnapshot().previews.filter((row) => row.key !== key);
    setPreviews(rest);
    if (rest.length === 0) {
      setPreviewKey(null);
    }
  };
  const saveDraft = (key: string, then: readonly ScenesCommand[] = [], edit?: SeatingEdit): LibraryScene | undefined => {
    const draft = findDraft(key);
    if (draft) {
      // A saved scene's status moves on without its draft (TTS marks it ongoing or ended).
      const saved = findRow(key);
      const kept = saved ? { ...draft, status: saved.status } : draft;
      const row = edit ? edit(kept) : kept;
      putLibraryScene(row);
      sendBatch([upsertCommand(row), ...then]);
      closeDraft(key);
      return row;
    }
    return undefined;
  };

  /** The template stays as it was; the seating strip's `edit` goes into the dated copy. */
  const playTemplate = (template: LibraryScene, clock: SceneClock, edit?: SeatingEdit): void => {
    if (!present) {
      setNotice(`TTS has no present day yet, so “${template.title}” cannot be dated.`);
      return;
    }
    const night = nightLabel(clock.from === "present" ? new Date(present.getTime() + clock.plusMinutes * 60_000) : present);
    const dated = templateCopy(template, night, [...sceneLibrarySnapshot().scenes, ...sceneDeckSnapshot().previews]);
    const copy = edit ? edit(dated) : dated;
    putLibraryScene(copy);
    sendBatch([upsertCommand(copy), { op: "playScene", key: copy.key, ...clock }]);
  };

  /** `edit` (the seating strip's) is written into the played row before it goes to TTS. */
  const play = (key: string, clock: SceneClock, edit?: SeatingEdit): void => {
    if ((findRow(key) ?? findDraft(key))?.status === "template") {
      const template = findDraft(key) ? saveDraft(key) : findRow(key);
      if (template) {
        playTemplate(template, clock, edit);
      }
      return;
    }
    const row = findRow(key);
    if (row) {
      const played = edit ? edit(row) : row;
      if (played !== row) {
        putLibraryScene(played);
      }
      sendBatch([upsertCommand(played), { op: "playScene", key, ...clock }]);
    } else if (findDraft(key)) {
      saveDraft(key, [{ op: "playScene", key, ...clock }], edit);
    } else {
      sendBatch([{ op: "playScene", key, ...clock }]);
    }
  };

  /** Template choice, the archive, and ending a deck scene that is not on the table. */
  const setStatus = (key: string, status: SceneStatus): void => {
    const draft = findDraft(key);
    if (draft) {
      setPreviews(sceneDeckSnapshot().previews.map((row) => (row.key === key ? { ...row, status } : row)));
    }
    const row = findRow(key);
    if (!row) {
      return;
    }
    putLibraryScene({ ...row, status });
    sendBatch([{ op: "setSceneStatus", key, status }]);
    if (status === "ended") {
      removeFromDeck(key);
    }
  };

  const openPreview = (key: string): void => {
    if (!findDraft(key)) {
      const row = findRow(key);
      if (!row) {
        setNotice(`“${key}” is not in the dashboard's scene library yet.`);
        return;
      }
      setPreviews([...sceneDeckSnapshot().previews, row]);
    }
    setPreviewKey(key);
  };

  const prepare = (location: LabLocation, districtName: string, siteName: string): void => {
    const rows = [...sceneLibrarySnapshot().scenes, ...sceneDeckSnapshot().previews];
    const title = newSceneTitle(districtName, siteName, rows.map((row) => row.title));
    const key = newSceneKey(title, rows.map((row) => row.key));
    const template = (scene?.liveKey ? findRow(scene.liveKey) : undefined) ?? sceneLibrarySnapshot().scenes[0];
    setPreviews([...sceneDeckSnapshot().previews, newLibraryScene(template, key, title, location)]);
    setPreviewKey(key);
  };

  const rename = (key: string, title: string): void => {
    const row = findRow(key);
    if (!row) {
      return;
    }
    const renamed = { ...row, title };
    putLibraryScene(renamed);
    sendBatch([upsertCommand(renamed)]);
    const { deck, notes } = sceneDeckSnapshot();
    setSceneDeckSection("deck", deck.map((entry) => (entry.key === key ? { key, title } : entry)));
    const docs = notes[row.title];
    if (docs && !notes[title]) {
      const { [row.title]: _moved, ...rest } = notes;
      setSceneDeckSection("notes", { ...rest, [title]: docs });
    }
  };

  const actions: LibraryActions = {
    rename,
    setStatus,
    setOnDeck: (key, on) => {
      const row = findRow(key);
      if (on && row) {
        addToDeck(row);
      } else if (!on) {
        removeFromDeck(key);
      }
    },
    remove: (key) => {
      removeLibraryScene(key);
      removeFromDeck(key);
      sendBatch([{ op: "deleteScene", key }]);
    },
    move: (key, by) => {
      const rows = [...sceneLibrarySnapshot().scenes];
      const index = rows.findIndex((row) => row.key === key);
      const [row] = rows.splice(index, 1);
      if (row) {
        rows.splice(Math.max(0, Math.min(rows.length, index + by)), 0, row);
        setLibraryScenes(rows);
      }
    },
    ...(status.error
      ? { note: { text: status.error, ...(status.loaded && !library.seeded ? { retry: () => void seedSceneLibraryFromTts() } : {}) } }
      : !status.loaded
        ? { note: { text: "Loading the scene library…" } }
        : {})
  };

  const entries = useMemo((): readonly LibraryEntry[] => {
    const known = new Set(library.scenes.map((row) => row.key));
    return [...library.scenes, ...previews.filter((row) => !known.has(row.key))].map((row) => {
      const location = locationOf(row);
      const editing = previews.some((draft) => draft.key === row.key);
      return { key: row.key, title: row.title, status: row.status, editing, saved: known.has(row.key), ...(location ? { location } : {}) };
    });
  }, [library.scenes, previews]);

  const liveKey = scene?.liveKey;
  const linkMenu: LinkMenu | undefined = liveKey
    ? {
      linked: scene?.liveLinked === true,
      onUnlink: () => sendBatch([{ op: "unlinkScene" }]),
      onFork: (newTitle, oldTitle) => {
        const row = findRow(liveKey);
        if (row && oldTitle && oldTitle !== row.title) {
          putLibraryScene({ ...row, title: oldTitle });
        }
        removeFromDeck(liveKey);
        sendBatch([{ op: "forkScene", newTitle, ...(oldTitle ? { oldTitle } : {}) }]);
      }
    }
    : undefined;

  return {
    rows: library.scenes,
    entries,
    actions,
    setStatus,
    /** A saved scene's status, else its draft's. */
    statusOf: (key: string): SceneStatus | undefined => (library.scenes.find((row) => row.key === key) ?? previews.find((row) => row.key === key))?.status,
    linkMenu,
    previews,
    previewKey,
    notice,
    clearNotice: () => setNotice(null),
    savedRow: (key: string) => library.scenes.find((row) => row.key === key),
    play,
    openPreview,
    closePreview: () => setPreviewKey(null),
    prepare,
    updateDraft: (key: string, update: (row: LibraryScene) => LibraryScene) =>
      setPreviews(sceneDeckSnapshot().previews.map((row) => (row.key === key ? update(row) : row))),
    saveDraft: (key: string) => void saveDraft(key),
    deckDraft: (key: string) => {
      const saved = saveDraft(key);
      if (saved) {
        addToDeck(saved);
      }
    },
    playDraft: (key: string, clock: SceneClock, edit?: SeatingEdit) => {
      if ((findRow(key) ?? findDraft(key))?.status === "template") {
        play(key, clock, edit);
      } else {
        saveDraft(key, [{ op: "playScene", key, ...clock }], edit);
      }
    },
    discardDraft: closeDraft
  };
};
