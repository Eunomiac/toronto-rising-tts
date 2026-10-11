import { parseSceneStatus, type LibraryScene } from "../../shared/sceneLibrary";
import type { ClockDatetime, GenericNpc, SceneSlice, SeatRow, StageNpc } from "../worldState";
import type { ScenesCommand, SoundLane } from "./commands";
import { LOCATION_MUSIC_LABEL, MOOD_LABEL, PC_COLORS, type SoundView } from "./liveScene";

/**
 * The dashboard's scene library (master copy) against TTS's `sceneLibrary`. Rows keep TTS's shape; the preview
 * panels edit a draft row through the same commands the live tab sends to TTS (`applyToDraft`).
 */

type Row = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);

/** `GlobalDashboardSceneLibrarySnapshot` reply: rows keyed by scene key, plus TTS's order. */
export type TtsLibrarySnapshot = {
  readonly order: readonly string[];
  readonly liveKey?: string;
  readonly scenes: Readonly<Record<string, unknown>>;
};

export const parseTtsLibrarySnapshot = (value: unknown): TtsLibrarySnapshot => {
  if (!isRecord(value) || value.ok !== true) {
    const error = isRecord(value) && typeof value.error === "string" ? value.error : "TTS did not return its scene library.";
    throw new Error(error);
  }
  return {
    order: Array.isArray(value.order) ? value.order.filter((key): key is string => typeof key === "string") : [],
    ...(typeof value.liveKey === "string" ? { liveKey: value.liveKey } : {}),
    // An empty Lua table encodes as `[]`.
    scenes: isRecord(value.scenes) ? value.scenes : {}
  };
};

/** TTS rows in TTS's order (rows missing from the order list last). */
export const scenesFromTts = (snapshot: TtsLibrarySnapshot): readonly LibraryScene[] => {
  const keys = [...snapshot.order.filter((key) => key in snapshot.scenes), ...Object.keys(snapshot.scenes).filter((key) => !snapshot.order.includes(key))];
  return keys.flatMap((key): LibraryScene[] => {
    const row = snapshot.scenes[key];
    if (!isRecord(row) || typeof row.title !== "string") {
      return [];
    }
    return [{
      key,
      title: row.title,
      placementMode: row.placementMode === "scatter" ? "scatter" : "standard",
      linked: row.receivesLiveWrites === true,
      status: parseSceneStatus(row.status),
      sessionScene: isRecord(row.sessionScene) ? row.sessionScene : {}
    }];
  });
};

/**
 * The dashboard copy after reading TTS rows. A row TTS writes from the live table (linked) replaces the dashboard's;
 * other shared rows keep the dashboard's content and take TTS's link flag and status (TTS marks scenes ongoing and
 * ended), unless `adopt` is set: the write-back read of a scene that just left the table (TTS wrote it one last
 * time as it unlinked). Rows only TTS has (a fork, an in-game import) are appended. Rows only the dashboard has
 * stay. Returns the same array when nothing changes.
 */
export const mergeFromTts = (local: readonly LibraryScene[], tts: readonly LibraryScene[], adopt = false): readonly LibraryScene[] => {
  const byKey = new Map(tts.map((scene) => [scene.key, scene]));
  let changed = false;
  const merged = local.map((scene) => {
    const theirs = byKey.get(scene.key);
    if (!theirs) {
      return scene;
    }
    const next = theirs.linked || adopt
      ? theirs
      : scene.linked || scene.status !== theirs.status
        ? { ...scene, linked: false, status: theirs.status }
        : scene;
    if (next !== scene && JSON.stringify(next) !== JSON.stringify(scene)) {
      changed = true;
      return next;
    }
    return scene;
  });
  const known = new Set(local.map((scene) => scene.key));
  const added = tts.filter((scene) => !known.has(scene.key));
  return changed || added.length > 0 ? [...merged, ...added] : local;
};

/** "District - Site", numbered "(2)", "(3)" … when that title is taken. ASCII hyphen: TTS saves non-ASCII as "?". */
export const newSceneTitle = (districtName: string, siteName: string, titles: readonly string[]): string => {
  const base = districtName ? `${districtName} - ${siteName}` : siteName;
  if (!titles.includes(base)) {
    return base;
  }
  let n = 2;
  while (titles.includes(`${base} (${n})`)) {
    n += 1;
  }
  return `${base} (${n})`;
};

/** camelCase ASCII key from a title (`The Elysium` → `theElysium`); prefixed `scene` when it would start with a digit. */
export const sceneKeyFromTitle = (title: string): string => {
  const words = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) {
    return "untitledScene";
  }
  const camel = words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
    })
    .join("");
  return /^[a-zA-Z]/.test(camel) ? camel : `scene${camel.slice(0, 1).toUpperCase()}${camel.slice(1)}`;
};

/** A TTS-safe key from the title, suffixed `_2`, `_3` … when taken. */
export const newSceneKey = (title: string, keys: readonly string[]): string => {
  const base = sceneKeyFromTitle(title);
  if (!keys.includes(base)) {
    return base;
  }
  let n = 2;
  while (keys.includes(`${base}_${n}`)) {
    n += 1;
  }
  return `${base}_${n}`;
};

/**
 * A new scene copies a starting row (the table's scene, or the first library row) so it has a full seat and stage
 * set-up, then takes the new location and starts clean: present day, no conditions, scheduled weather, site sky.
 */
export const newLibraryScene = (start: LibraryScene | undefined, key: string, title: string, location: { districtKey: string; siteKey: string }): LibraryScene => {
  const { skyboxOverride: _sky, soundscapeNarrative: _sound, ...rest } = start?.sessionScene ?? {};
  return {
    key,
    title,
    placementMode: start?.placementMode ?? "standard",
    linked: false,
    status: "new",
    sessionScene: {
      ...rest,
      districtKey: location.districtKey,
      siteKey: location.siteKey,
      clock: { isPresentDay: true },
      conditions: [],
      chronicleWeatherFollowSchedule: true,
      chronicleWeatherManualHold: false
    }
  };
};

const narrativeOf = (scene: LibraryScene): Row => (isRecord(scene.sessionScene.soundscapeNarrative) ? scene.sessionScene.soundscapeNarrative : {});

const withSession = (scene: LibraryScene, patch: Row): LibraryScene => ({ ...scene, sessionScene: { ...scene.sessionScene, ...patch } });

const withNarrative = (scene: LibraryScene, patch: Row, drop: readonly string[] = []): LibraryScene => {
  const narrative: Record<string, unknown> = { ...narrativeOf(scene), ...patch };
  drop.forEach((key) => delete narrative[key]);
  return withSession(scene, { soundscapeNarrative: narrative });
};

const WIND_LEVEL = ["", "Low", "Med", "Max"] as const;
const WINTER_MONTHS: ReadonlySet<number> = new Set([11, 12, 1, 2]);

/** Soundscape wind catalog key for a strength (0 none … 3 max); November–February use the winter variants. */
const windCatalogKey = (strength: 0 | 1 | 2 | 3, month: number): string =>
  strength === 0 ? "none" : `${WINTER_MONTHS.has(month) ? "windWinter" : "wind"}${WIND_LEVEL[strength]}`;

export const draftClock = (scene: LibraryScene): ClockDatetime | null => {
  const clock = scene.sessionScene.clock;
  if (!isRecord(clock) || clock.isPresentDay === true) {
    return null;
  }
  const { year, month, day, hour, minute } = clock;
  return typeof year === "number" && typeof month === "number" && typeof day === "number" && typeof hour === "number" && typeof minute === "number"
    ? { year, month, day, hour, minute }
    : null;
};

/** The draft follows present day (whatever it is when the scene is played) instead of a fixed time. */
export const draftAtPresentDay = (scene: LibraryScene): LibraryScene => withSession(scene, { clock: { isPresentDay: true } });

export const NPC_SEATS: readonly string[] = ["NPC1", "NPC2", "NPC3", "NPC4"];

export const draftSeatSlots = (scene: LibraryScene): Row => (isRecord(scene.sessionScene.seatSlots) ? scene.sessionScene.seatSlots : {});

const draftSeatPresent = (scene: LibraryScene): Row => (isRecord(scene.sessionScene.seatPresent) ? scene.sessionScene.seatPresent : {});

/** The seated NPC on an NPC seat row (none when the seat is empty). */
export const npcOf = (row: unknown): string | undefined =>
  isRecord(row) && row.slotEmpty !== true && typeof row.characterKey === "string" && row.characterKey !== "" ? row.characterKey : undefined;

/** The chair a seat row holds: a PC in session, or an NPC seat with someone in it. */
const seatChair = (seat: string, row: unknown): number | undefined => {
  if (!isRecord(row) || typeof row.tableSlot !== "number" || row.absentFromSession === true) {
    return undefined;
  }
  return PC_COLORS.includes(seat) || npcOf(row) !== undefined ? row.tableSlot : undefined;
};

/** The seat key (PC colour or NPC seat) holding a chair. */
export const holderOfChair = (slots: Row, chair: number): string | undefined =>
  Object.keys(slots).find((seat) => seatChair(seat, slots[seat]) === chair);

/** The draft row after one panel command; commands with no library meaning (volumes, spotlight …) change nothing. */
export const applyToDraft = (scene: LibraryScene, command: ScenesCommand): LibraryScene => {
  switch (command.op) {
    case "location":
      return withSession(scene, { districtKey: command.districtKey, siteKey: command.siteKey });
    case "skybox": {
      if (command.key !== "none") {
        return withSession(scene, { skyboxOverride: command.key });
      }
      const { skyboxOverride: _sky, ...rest } = scene.sessionScene;
      return { ...scene, sessionScene: rest };
    }
    case "topFog":
      return withSession(scene, { isTopFogActive: command.on });
    case "lighting":
      return withSession(scene, { lightingPresetKey: command.presetKey });
    case "table":
      if (command.key === "Scatter") {
        return { ...withSession(scene, { placementMode: "scatter" }), placementMode: "scatter" };
      }
      return {
        ...withSession(scene, { placementMode: "standard", ...(command.key === "Table B" ? {} : { tableKey: command.key }) }),
        placementMode: "standard"
      };
    case "conditions":
      return withSession(scene, { conditions: [...command.ids] });
    case "weatherOverride": {
      if ("release" in command) {
        return withSession(withNarrative(scene, {}, ["rain", "wind", "thunderstorm"]), { chronicleWeatherFollowSchedule: true, chronicleWeatherManualHold: false });
      }
      const month = draftClock(scene)?.month ?? new Date().getMonth() + 1;
      const wind = windCatalogKey(command.wind, month);
      return withSession(withNarrative(scene, { rain: command.rain, wind, thunderstorm: command.thunder }), {
        chronicleWeatherFollowSchedule: false,
        chronicleWeatherManualHold: true
      });
    }
    case "clockTo":
      return withSession(scene, { clock: { ...command.datetime, isPresentDay: false } });
    case "seatPresence": {
      // Same pair the TTS pending-row writer keeps: `seatSlots[seat].isPresent` wins, `seatPresent` mirrors it.
      const slots = draftSeatSlots(scene);
      const row = slots[command.seat];
      return withSession(scene, {
        seatSlots: { ...slots, [command.seat]: { ...(isRecord(row) ? row : {}), isPresent: command.present } },
        seatPresent: { ...draftSeatPresent(scene), [command.seat]: command.present }
      });
    }
    case "seatMove": {
      const slots = draftSeatSlots(scene);
      const row = slots[command.seat];
      const from = seatChair(command.seat, row);
      if (!isRecord(row) || from === undefined || from === command.chair) {
        return scene;
      }
      const holder = holderOfChair(slots, command.chair);
      const other = holder === undefined ? undefined : slots[holder];
      return withSession(scene, {
        seatSlots: {
          ...slots,
          [command.seat]: { ...row, tableSlot: command.chair },
          ...(holder !== undefined && isRecord(other) ? { [holder]: { ...other, tableSlot: from } } : {})
        }
      });
    }
    case "seatNpc": {
      // Generic NPCs stand on the stage; they never take chairs.
      if (command.characterKey in draftMembership(scene)) {
        return scene;
      }
      const slots = draftSeatSlots(scene);
      const own = NPC_SEATS.find((seat) => seatChair(seat, slots[seat]) !== undefined && npcOf(slots[seat]) === command.characterKey);
      const holder = holderOfChair(slots, command.chair);
      if (holder !== undefined && holder !== own) {
        return scene;
      }
      const seat = own ?? NPC_SEATS.find((key) => npcOf(slots[key]) === undefined);
      if (seat === undefined) {
        return scene;
      }
      const prior = slots[seat];
      const { slotEmpty: _empty, ...kept } = isRecord(prior) ? prior : {};
      const placements: Record<string, unknown> = { ...draftPlacements(scene) };
      delete placements[command.characterKey];
      return withNpcWorld(
        withSession(scene, {
          seatSlots: { ...slots, [seat]: { ...kept, characterKey: command.characterKey, tableSlot: command.chair, isPresent: true } },
          seatPresent: { ...draftSeatPresent(scene), [seat]: true }
        }),
        { placements }
      );
    }
    case "musicMood":
      return withNarrative(scene, { backgroundMusic: command.mood });
    case "locationMusic":
      return withNarrative(scene, { backgroundMusic: command.key });
    case "musicSilent":
      return withNarrative(scene, {}, ["backgroundMusic"]);
    case "ambience":
      return command.key === "none" ? withNarrative(scene, {}, ["location"]) : withNarrative(scene, { location: command.key });
    case "genericAdd": {
      const membership: Record<string, unknown> = { ...draftMembership(scene) };
      for (const key of command.keys) {
        membership[key] = { key, displayName: command.labels[key] ?? key };
      }
      return withNpcWorld(scene, { genericMembership: membership });
    }
    case "genericRename": {
      const membership = draftMembership(scene);
      return command.key in membership
        ? withNpcWorld(scene, { genericMembership: { ...membership, [command.key]: { key: command.key, displayName: command.name } } })
        : scene;
    }
    case "stage": {
      if ("reset" in command) {
        return scene;
      }
      const placements: Record<string, unknown> = "clear" in command ? {} : { ...draftPlacements(scene) };
      // A draft's generic NPC only exists to stand on the stage, so leaving it (or Clear) drops it from the scene.
      const membership: Record<string, unknown> = "clear" in command ? {} : { ...draftMembership(scene) };
      if ("changes" in command) {
        for (const [key, change] of Object.entries(command.changes)) {
          const before = placements[key];
          const prior = isRecord(before) ? before : {};
          if ("remove" in change) {
            delete placements[key];
            delete membership[key];
          } else {
            placements[key] = { u: change.u, v: change.v, npcLightMode: change.lightMode ?? str(prior.npcLightMode) ?? "STANDARD" };
          }
        }
      }
      return withNpcWorld(scene, { placements, genericMembership: membership });
    }
    default:
      return scene;
  }
};

const draftNpcWorld = (scene: LibraryScene): Row => (isRecord(scene.sessionScene.npcWorld) ? scene.sessionScene.npcWorld : {});

const withNpcWorld = (scene: LibraryScene, patch: Row): LibraryScene => withSession(scene, { npcWorld: { ...draftNpcWorld(scene), ...patch } });

/** The draft's generic NPCs (`sessionScene.npcWorld.genericMembership`), spawned by TTS when the scene plays. */
const draftMembership = (scene: LibraryScene): Row => {
  const membership = draftNpcWorld(scene).genericMembership;
  return isRecord(membership) ? membership : {};
};

/** The draft's generic NPCs as the push's generic list, so the preview board and roster read them like the table's. */
export const draftGenerics = (scene: LibraryScene): readonly GenericNpc[] =>
  Object.entries(draftMembership(scene)).map(([characterKey, row]) => ({
    characterKey,
    name: (isRecord(row) ? str(row.displayName) : undefined) ?? characterKey
  }));

/** The draft's stage placements (`sessionScene.npcWorld.placements`). */
const draftPlacements = (scene: LibraryScene): Readonly<Record<string, unknown>> => {
  const placements = draftNpcWorld(scene).placements;
  return isRecord(placements) ? placements : {};
};

/** Replace the draft's stage placements, keeping the rest of `npcWorld`. */
export const withPlacements = (scene: LibraryScene, placements: Readonly<Record<string, unknown>>): LibraryScene =>
  withNpcWorld(scene, { placements });

/** The saved row's placements, for a draft's Reset to Library. */
export const savedPlacements = (scene: LibraryScene | null): Readonly<Record<string, unknown>> => (scene ? draftPlacements(scene) : {});

/** The draft's stage as the push's stage list, so the preview board reads it like the table's. */
export const draftStage = (scene: LibraryScene): readonly StageNpc[] =>
  Object.entries(draftPlacements(scene)).flatMap(([characterKey, row]) => {
    if (!isRecord(row) || typeof row.u !== "number" || typeof row.v !== "number") {
      return [];
    }
    const lightMode = str(row.npcLightMode);
    return [{ characterKey, u: row.u, v: row.v, ...(lightMode ? { lightMode } : {}) }];
  });

const str = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/**
 * The draft's seating as push seat rows, so the preview's seat strip reads it like the table's. Who sits where and
 * who is present come from the draft; whether a PC is connected is the table's (`absentFromSession` from `live`).
 */
export const draftSeatRows = (scene: LibraryScene, live: readonly SeatRow[]): readonly SeatRow[] => {
  const slots = isRecord(scene.sessionScene.seatSlots) ? scene.sessionScene.seatSlots : {};
  const mirror = isRecord(scene.sessionScene.seatPresent) ? scene.sessionScene.seatPresent : {};
  return Object.entries(slots).flatMap(([seat, value]): SeatRow[] => {
    if (!isRecord(value)) {
      return [];
    }
    const table = live.find((row) => row.seat === seat);
    const tableSlot = typeof value.tableSlot === "number" ? value.tableSlot : table?.tableSlot;
    const isPresent = typeof value.isPresent === "boolean" ? value.isPresent : mirror[seat] !== false;
    const base = { seat, isPresent, ...(tableSlot !== undefined ? { tableSlot } : {}) };
    if (PC_COLORS.includes(seat)) {
      const charKey = str(value.characterKey) ?? table?.charKey;
      const playing = value.isPlayingNPC === true ? str(value.npcCharacterKey) : undefined;
      return [{
        ...base,
        kind: "pc",
        ...(charKey ? { charKey } : {}),
        ...(playing ? { playingNpcKey: playing } : {}),
        ...(table?.absentFromSession === true ? { absentFromSession: true } : {})
      }];
    }
    const characterKey = str(value.characterKey);
    return [{ ...base, kind: "npc", ...(characterKey ? { characterKey } : {}), ...(value.slotEmpty === true || !characterKey ? { slotEmpty: true } : {}) }];
  });
};

/** A draft row seen as TTS's scene slice, so the preview panels read it the way they read the table. */
export const draftSceneSlice = (scene: LibraryScene, indoors: boolean): SceneSlice => {
  const ss = scene.sessionScene;
  const narrative = narrativeOf(scene);
  const held = ss.chronicleWeatherManualHold === true && typeof narrative.rain === "string";
  const districtKey = str(ss.districtKey);
  const siteKey = str(ss.siteKey);
  const tableKey = str(ss.tableKey);
  const lightingPresetKey = str(ss.lightingPresetKey);
  const skyboxOverride = str(ss.skyboxOverride);
  const rain = str(narrative.rain);
  const wind = str(narrative.wind);
  return {
    liveKey: scene.key,
    liveTitle: scene.title,
    liveLinked: scene.linked,
    ...(districtKey ? { districtKey } : {}),
    ...(siteKey ? { siteKey } : {}),
    ...(tableKey ? { tableKey } : {}),
    placementMode: scene.placementMode,
    ...(lightingPresetKey ? { lightingPresetKey } : {}),
    ...(skyboxOverride ? { skyboxOverride } : {}),
    topFog: ss.isTopFogActive === true,
    conditions: Array.isArray(ss.conditions) ? ss.conditions.filter((id): id is string => typeof id === "string") : [],
    ...(held && rain && wind ? { weatherOverride: { rain, wind, thunder: narrative.thunderstorm === true } } : {}),
    weather: { ...(held && rain ? { rain } : {}), ...(held && wind ? { wind } : {}), thunder: held && narrative.thunderstorm === true, indoors }
  };
};

const LANES: readonly SoundLane[] = ["music", "location", "featured", "rain", "wind", "thunder"];

/** The draft's authored music and ambience as the mixer's view (volumes are the table's, not the scene's). */
export const draftSoundView = (scene: LibraryScene): SoundView => {
  const narrative = narrativeOf(scene);
  const music = str(narrative.backgroundMusic);
  const ambient = str(narrative.location);
  return {
    playlist: music ? MOOD_LABEL[music] ?? LOCATION_MUSIC_LABEL[music] ?? music : "Main",
    musicPlaying: true,
    featuredKey: undefined,
    featuredPlaying: false,
    ambient,
    levels: Object.fromEntries(LANES.map((lane) => [lane, 100])) as Record<SoundLane, number>,
    playing: Object.fromEntries(LANES.map((lane) => [lane, lane === "music" || (lane === "location" && ambient !== undefined)])) as Record<SoundLane, boolean>
  };
};