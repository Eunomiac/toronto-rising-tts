import { readFile } from "node:fs/promises";
import path from "node:path";
import { createDataFileStore, type DataFileStore } from "./dataFileStore.js";
import { parseNpcRoster, type NpcRoster } from "../shared/npcRoster.js";
import { normalizeSceneDeckFile, parseRosterLayout, type SceneDeck, type SceneDeckFile } from "../shared/sceneDeck.js";

const readLegacyRoster = async (deckPath: string): Promise<unknown> => {
  let text: string;
  try {
    text = await readFile(deckPath, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
  const raw: unknown = JSON.parse(text);
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as { roster?: unknown }).roster : undefined;
};

/**
 * `/api/scene-deck` over two files: `<dataDir>/scene-deck.json` (git-ignored) keeps everything but the roster
 * layout, which is the `layout` of the tracked `<dataDir>/npc-roster.json`. A `roster` an older server left in
 * scene-deck.json is moved across (replacing `layout`) when the store is created.
 */
export const createSceneDeckStore = async (options: {
  readonly dataDir: string;
  readonly backupDir: string | null;
  readonly now?: () => Date;
}): Promise<DataFileStore<SceneDeck>> => {
  const { dataDir, backupDir, now } = options;
  const deckPath = path.join(dataDir, "scene-deck.json");
  const deck = createDataFileStore<SceneDeckFile>({
    filePath: deckPath,
    backupDir,
    backupPrefix: "scene-deck",
    normalize: normalizeSceneDeckFile,
    ...(now ? { now } : {})
  });
  const roster = createDataFileStore<NpcRoster>({
    filePath: path.join(dataDir, "npc-roster.json"),
    backupDir,
    backupPrefix: "npc-roster",
    normalize: parseNpcRoster,
    ...(now ? { now } : {})
  });

  const legacy = await readLegacyRoster(deckPath);
  if (legacy !== undefined) {
    await roster.patch({ layout: parseRosterLayout(legacy) });
    await deck.patch({});
    console.log("Moved the roster layout from scene-deck.json to npc-roster.json.");
  }

  const get = async (): Promise<SceneDeck> => {
    const [file, { layout }] = await Promise.all([deck.get(), roster.get()]);
    return { ...file, roster: layout };
  };
  return {
    get,
    patch: async ({ roster: layout, ...rest }) => {
      if (layout !== undefined) {
        await roster.patch({ layout });
      }
      if (Object.keys(rest).length > 0) {
        await deck.patch(rest);
      }
      return get();
    }
  };
};
