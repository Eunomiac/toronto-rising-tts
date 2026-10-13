import { parseSceneStatus, type LibraryScene } from "../../shared/sceneLibrary";
import type { ClockDatetime, GenericNpc, ScatterGroup, ScatterMember, SceneSlice, SeatRow, StageNpc } from "../worldState";
import type { ScenesCommand, SoundLane } from "./commands";
import { isSeatColor, NPC_SEATS, playlistLabel } from "../catalogVocab";
import type { SoundView } from "./liveScene";
import { fillOrder } from "./stage";
import { boardToStage, stageToBoard, type StagePack, type StageSlot } from "./stageFrame";

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

/** Soundscape wind layer for a strength (0 none … 3 max); a cold hour takes the winter layer (`ChronicleWeather.setOverride`). */
const windCatalogKey = (strength: 0 | 1 | 2 | 3, cold: boolean): string =>
  strength === 0 ? "none" : `${cold ? "windWinter" : "wind"}${WIND_LEVEL[strength]}`;

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
  return isSeatColor(seat) || npcOf(row) !== undefined ? row.tableSlot : undefined;
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
        ...withSession(scene, {
          placementMode: "standard",
          ...(command.key === "Table B" && scene.sessionScene.tableKey !== "Scatter" ? {} : { tableKey: command.key })
        }),
        placementMode: "standard"
      };
    case "conditions":
      return withSession(scene, { conditions: [...command.ids] });
    case "weatherOverride": {
      if ("release" in command) {
        return withSession(withNarrative(scene, {}, ["rain", "wind", "thunderstorm"]), { chronicleWeatherFollowSchedule: true, chronicleWeatherManualHold: false });
      }
      const wind = windCatalogKey(command.wind, command.cold);
      return withSession(withNarrative(scene, { rain: command.rain, wind, thunderstorm: command.thunder }), {
        chronicleWeatherFollowSchedule: false,
        chronicleWeatherManualHold: true
      });
    }
    case "clockTo":
      return withSession(scene, { clock: { ...command.datetime, isPresentDay: false } });
    case "seatPresence": {
      // Same pair TTS keeps: `seatSlots[seat].isPresent` wins, `seatPresent` mirrors it.
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
    case "scatterPlace":
      return placeInDraftScatter(scene, command);
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
    if (isSeatColor(seat)) {
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
    playlist: playlistLabel(music ?? "main"),
    musicPlaying: true,
    featuredKey: undefined,
    featuredPlaying: false,
    ambient,
    levels: Object.fromEntries(LANES.map((lane) => [lane, 100])) as Record<SoundLane, number>,
    playing: Object.fromEntries(LANES.map((lane) => [lane, lane === "music" || (lane === "location" && ambient !== undefined)])) as Record<SoundLane, boolean>
  };
};

/* ---------- Scatter layout (`sessionScene.scatterPlacements`, which TTS plays as stored) ---------- */

/** `ScatterLayout.groupCount()`. */
const GROUPS = [1, 2, 3, 4, 5, 6] as const;
/** A group's PC places (`ScatterLayout.nextFreePcWorldSlot`). */
const GROUP_PCS = 5;

/** Occupied stage packs take Scatter groups in this order (`ScatterOccupancy.POLAR_FAMILY_ORDER`). */
const POLAR_FAMILY_ORDER = [
  "CENTER", "Mid Center", "Mid Left", "Mid Right", "Center Left", "Center Right", "Far Center-Left", "Far Center-Right", "Far Left", "Far Right"
];

/** One group: PCs (by charKey) in `centerCharacters`, NPCs in `orbitCharacters`, each row holding its `slot`. */
type ScatterArea = { readonly centerCharacters: Record<string, unknown>; readonly orbitCharacters: Record<string, unknown> };

const draftIsScatter = (scene: LibraryScene): boolean => scene.placementMode === "scatter" || scene.sessionScene.tableKey === "Scatter";

const draftPack = (scene: LibraryScene): Row | undefined =>
  isRecord(scene.sessionScene.scatterPlacements) ? scene.sessionScene.scatterPlacements : undefined;

/** A copy of one group; an empty Lua table arrives as `[]`. */
const areaOf = (pack: Row, group: number): ScatterArea => {
  const area = pack[`scatter${group}`];
  return {
    centerCharacters: isRecord(area) && isRecord(area.centerCharacters) ? { ...area.centerCharacters } : {},
    orbitCharacters: isRecord(area) && isRecord(area.orbitCharacters) ? { ...area.orbitCharacters } : {}
  };
};

const packOf = (areas: readonly ScatterArea[]): Row => Object.fromEntries(areas.map((area, index) => [`scatter${index + 1}`, area]));

const slotNumber = (row: unknown): number | undefined => (isRecord(row) && typeof row.slot === "number" ? row.slot : undefined);

/** The lowest slot nobody in `rows` holds, up to `max`. */
const freeSlot = (rows: Row, max = Number.MAX_SAFE_INTEGER): number | undefined => {
  const taken = new Set(Object.values(rows).map(slotNumber));
  for (let slot = 1; slot <= max; slot += 1) {
    if (!taken.has(slot)) {
      return slot;
    }
  }
  return undefined;
};

const membersBySlot = (rows: Row): ScatterMember[] =>
  Object.entries(rows)
    .map(([characterKey, row]): ScatterMember => {
      const slot = slotNumber(row);
      return slot === undefined ? { characterKey } : { characterKey, slot };
    })
    .sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99) || a.characterKey.localeCompare(b.characterKey));

/** The draft's Scatter groups as the push's group list, the way `world_snapshot` reads the table's. */
export const draftScatterGroups = (scene: LibraryScene): readonly ScatterGroup[] => {
  const pack = draftPack(scene) ?? {};
  return GROUPS.map((group) => {
    const area = areaOf(pack, group);
    return { group, pcs: membersBySlot(area.centerCharacters), npcs: membersBySlot(area.orbitCharacters) };
  });
};

/** A numbered chair's group, cycling past six (chair 7 → group 1), as `ScatterOccupancy.tableSlotToGroup`. */
const chairGroup = (chair: number): number => ((chair - 1) % GROUPS.length) + 1;

const polarRank = (pack: StagePack): number => {
  const rank = POLAR_FAMILY_ORDER.indexOf(pack.label);
  return rank < 0 ? POLAR_FAMILY_ORDER.length : rank;
};

/** The pack slot nearest a stage placement (control board u, v), and that slot's place in the pack's fill order. */
const nearestPackSlot = (u: number, v: number, packs: readonly StagePack[]): { pack: StagePack; order: number } | undefined => {
  const at = boardToStage(u, v);
  let best: { pack: StagePack; order: number; d: number } | undefined;
  for (const pack of packs) {
    for (const [order, slot] of fillOrder(pack).entries()) {
      const d = Math.hypot(slot.u - at.u, slot.v - at.v);
      if (!best || d < best.d) {
        best = { pack, order, d };
      }
    }
  }
  return best ? { pack: best.pack, order: best.order } : undefined;
};

/**
 * The Scatter layout a scene starts with when its table goes to Scatter (`ScatterOccupancy` does the same in TTS):
 * connected PCs spread one to a group (their chair's group when no PC has it yet, otherwise the lowest group with no
 * PC), seated NPCs around their chair's group, then stage NPCs: their authored `scatterGroup`, or their stage pack's
 * group (occupied packs take groups in `POLAR_FAMILY_ORDER`, cycling past six). TTS puts a PC who connects later into
 * an empty group when the scene plays. `seats` are the draft's seat rows (`draftSeatRows`).
 */
export const defaultScatterPack = (scene: LibraryScene, seats: readonly SeatRow[], packs: readonly StagePack[]): Row => {
  const areas: ScatterArea[] = GROUPS.map(() => ({ centerCharacters: {}, orbitCharacters: {} }));
  const placed = new Set<string>();
  const byChair = (a: SeatRow, b: SeatRow): number => (a.tableSlot ?? 99) - (b.tableSlot ?? 99);
  const noPc = (area: ScatterArea | undefined): boolean => area !== undefined && Object.keys(area.centerCharacters).length === 0;
  for (const pc of seats.filter((row) => row.kind === "pc" && row.absentFromSession !== true).sort(byChair)) {
    const own = pc.tableSlot !== undefined && pc.tableSlot >= 1 ? areas[chairGroup(pc.tableSlot) - 1] : undefined;
    const area = noPc(own) ? own : areas.find(noPc);
    if (!pc.charKey || !area) {
      continue;
    }
    const playing = pc.playingNpcKey;
    area.centerCharacters[pc.charKey] = { slot: 1, isPlayingNPC: playing !== undefined, isPresent: pc.isPresent, ...(playing ? { characterKey: playing } : {}) };
    placed.add(pc.charKey);
    if (playing) {
      placed.add(playing);
    }
  }
  const join = (group: number, npcKey: string): void => {
    const orbit = areas[group - 1]?.orbitCharacters;
    if (orbit && !placed.has(npcKey)) {
      placed.add(npcKey);
      orbit[npcKey] = { slot: Object.keys(orbit).length + 1, npcLightMode: "STANDARD" };
    }
  };
  for (const npc of seats.filter((row) => row.kind === "npc").sort(byChair)) {
    if (npc.characterKey && npc.slotEmpty !== true && npc.tableSlot !== undefined && npc.tableSlot >= 1) {
      join(chairGroup(npc.tableSlot), npc.characterKey);
    }
  }
  const staged: { key: string; pack: StagePack | undefined; order: number }[] = [];
  for (const [key, row] of Object.entries(draftPlacements(scene)).sort(([a], [b]) => a.localeCompare(b))) {
    if (isRecord(row) && typeof row.scatterGroup === "number") {
      join(row.scatterGroup, key);
    } else if (isRecord(row) && typeof row.u === "number" && typeof row.v === "number") {
      const near = nearestPackSlot(row.u, row.v, packs);
      staged.push({ key, pack: near?.pack, order: near?.order ?? 0 });
    }
  }
  const claimed = [...new Set(staged.flatMap((entry) => (entry.pack ? [entry.pack] : [])))].sort((a, b) => polarRank(a) - polarRank(b));
  const fewestNpcs = (): number =>
    GROUPS.reduce((best, group) => (Object.keys(areas[group - 1]?.orbitCharacters ?? {}).length < Object.keys(areas[best - 1]?.orbitCharacters ?? {}).length ? group : best), 1);
  for (const entry of staged.sort((a, b) => a.order - b.order)) {
    join(entry.pack ? (claimed.indexOf(entry.pack) % GROUPS.length) + 1 : fewestNpcs(), entry.key);
  }
  return packOf(areas);
};

/**
 * A Scatter draft with no stored layout gets the starting one (`defaultScatterPack`), so its groups show and can be
 * edited. `live` is the table's seat push (PC charKeys the draft's seats leave out).
 */
export const withScatterPack = (scene: LibraryScene, live: readonly SeatRow[], packs: readonly StagePack[]): LibraryScene =>
  draftIsScatter(scene) && !draftPack(scene)
    ? withSession(scene, { scatterPlacements: defaultScatterPack(scene, draftSeatRows(scene, live), packs) })
    : scene;

/**
 * Off Scatter: NPCs who only stood in groups (not on the stage, not in a chair) go onto the stage packs nobody holds,
 * a pack per group in `POLAR_FAMILY_ORDER`, spilling onto the next (`ScatterOccupancy.restoreStash`); NPCs past the
 * last pack leave the stage. The layout is dropped.
 */
const leaveScatter = (scene: LibraryScene, packs: readonly StagePack[]): LibraryScene => {
  const pack = draftPack(scene) ?? {};
  const { scatterPlacements: _layout, ...rest } = scene.sessionScene;
  const left: LibraryScene = { ...scene, sessionScene: rest };
  const placements: Record<string, unknown> = { ...draftPlacements(left) };
  const slots = draftSeatSlots(left);
  const seated = new Set(NPC_SEATS.flatMap((seat) => {
    const npc = seatChair(seat, slots[seat]) === undefined ? undefined : npcOf(slots[seat]);
    return npc ? [npc] : [];
  }));
  const held = new Set(Object.values(placements).flatMap((row) =>
    isRecord(row) && typeof row.u === "number" && typeof row.v === "number" ? [nearestPackSlot(row.u, row.v, packs)?.pack] : []));
  const free = packs.filter((entry) => !held.has(entry)).sort((a, b) => polarRank(a) - polarRank(b));
  for (const group of GROUPS) {
    let open: StageSlot[] = [];
    for (const { characterKey } of membersBySlot(areaOf(pack, group).orbitCharacters)) {
      if (characterKey in placements || seated.has(characterKey)) {
        continue;
      }
      if (open.length === 0) {
        const next = free.shift();
        if (!next) {
          break;
        }
        open = [...fillOrder(next)];
      }
      const slot = open.shift();
      if (slot) {
        placements[characterKey] = { ...stageToBoard(slot.u, slot.v), npcLightMode: "STANDARD" };
      }
    }
  }
  return withPlacements(left, placements);
};

/** The draft after a table pick: going to Scatter lays out fresh groups (a stored layout is a stale earlier one), leaving it puts the groups away. */
export const draftTable = (scene: LibraryScene, key: string, live: readonly SeatRow[], packs: readonly StagePack[]): LibraryScene => {
  const next = applyToDraft(scene, { op: "table", key });
  if (draftIsScatter(next) === draftIsScatter(scene)) {
    return next;
  }
  if (!draftIsScatter(next)) {
    return leaveScatter(next, packs);
  }
  const { scatterPlacements: _stale, ...rest } = next.sessionScene;
  return withScatterPack({ ...next, sessionScene: rest }, live, packs);
};

/** An NPC out of every group leaves the scene: off the stage, out of their chair, and (a generic) out of the draft. */
const withoutNpc = (scene: LibraryScene, npcKey: string): LibraryScene => {
  const placements: Record<string, unknown> = { ...draftPlacements(scene) };
  const membership: Record<string, unknown> = { ...draftMembership(scene) };
  delete placements[npcKey];
  delete membership[npcKey];
  const slots = draftSeatSlots(scene);
  const seat = NPC_SEATS.find((key) => npcOf(slots[key]) === npcKey);
  const unseated = seat === undefined ? scene : withSession(scene, { seatSlots: { ...slots, [seat]: { slotEmpty: true } } });
  return withNpcWorld(unseated, { placements, genericMembership: membership });
};

/**
 * A Scatter move in the draft's layout, as `ScatterMode.movePcToGroup` / `moveNpcToGroup` make it live: the character
 * takes the lowest free slot in the new group (a PC keeps its row, and a full group of five PCs refuses), and an NPC
 * moved out of every group leaves the scene. Drafts without a stored layout are seeded first (`withScatterPack`).
 */
const placeInDraftScatter = (scene: LibraryScene, command: Extract<ScenesCommand, { op: "scatterPlace" }>): LibraryScene => {
  const pack = draftPack(scene);
  const { characterKey, kind, group } = command;
  if (!pack || !draftIsScatter(scene) || (group === undefined ? kind === "pc" : !GROUPS.some((entry) => entry === group))) {
    return scene;
  }
  const areas = GROUPS.map((entry) => areaOf(pack, entry));
  const side = (area: ScatterArea): Record<string, unknown> => (kind === "pc" ? area.centerCharacters : area.orbitCharacters);
  const from = areas.findIndex((area) => characterKey in side(area));
  if (group !== undefined && from === group - 1) {
    return scene;
  }
  const prior = areas[from]?.centerCharacters[characterKey];
  for (const area of areas) {
    delete area.centerCharacters[characterKey];
    delete area.orbitCharacters[characterKey];
  }
  const target = group === undefined ? undefined : areas[group - 1];
  if (!target) {
    return withoutNpc(withSession(scene, { scatterPlacements: packOf(areas) }), characterKey);
  }
  if (kind === "pc") {
    const slot = freeSlot(target.centerCharacters, GROUP_PCS);
    if (slot === undefined) {
      return scene;
    }
    target.centerCharacters[characterKey] = { ...(isRecord(prior) ? prior : { isPlayingNPC: false, isPresent: true }), slot };
  } else {
    target.orbitCharacters[characterKey] = { slot: freeSlot(target.orbitCharacters), npcLightMode: "STANDARD" };
  }
  return withSession(scene, { scatterPlacements: packOf(areas) });
};