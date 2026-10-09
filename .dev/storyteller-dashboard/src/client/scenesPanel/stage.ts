import type { StageChange, StageChanges, StageLight } from "./commands";
import type { ScatterGroup } from "../worldState";
import { boardToStage, stageToBoard, type StagePack, type StagePoint, type StageSlot } from "./stageFrame";

/**
 * Stage editing geometry for the Scenes tab's wide board. Points are fractions of the drawn stage (`StagePoint`);
 * changes sent to TTS are control-board (u, v), converted with `stageToBoard`.
 */

/** Drag data from the roster: one NPC (`characterKey`) or a whole picker group (group key). */
export const NPC_DRAG_TYPE = "application/x-tr-npc";
export const GROUP_DRAG_TYPE = "application/x-tr-npc-group";

/** A token dropped within this many pixels of a slot lands on it. */
export const SNAP_PX = 18;

/** Below this fraction of the drawing the seat row floats; a token dropped there (or outside) leaves the stage. */
export const STAGE_FLOOR = 0.8;

/** A token on the stage as the board draws it. */
export type StageSpot = { readonly characterKey: string; readonly lit: boolean } & StagePoint;

export const isRemoval = (change: StageChange): change is { readonly remove: true } => "remove" in change;

export const offStage = (point: StagePoint): boolean => point.u < 0 || point.u > 1 || point.v < 0 || point.v > STAGE_FLOOR;

/** Slots in fill order: the anchor first, then outward, left before right. */
export const fillOrder = (pack: StagePack): readonly StageSlot[] => {
  const anchor = Math.max(0, pack.slots.findIndex((slot) => slot.isAnchor));
  return pack.slots
    .map((slot, index) => ({ slot, index }))
    .sort((a, b) => Math.abs(a.index - anchor) - Math.abs(b.index - anchor) || a.index - b.index)
    .map((entry) => entry.slot);
};

const pxDistance = (a: StagePoint, b: StagePoint, w: number, h: number): number => Math.hypot((a.u - b.u) * w, (a.v - b.v) * h);

/** The slot under a point, within `SNAP_PX`. */
export const slotNear = (point: StagePoint, packs: readonly StagePack[], w: number, h: number): { pack: StagePack; slot: StageSlot } | null => {
  let best: { pack: StagePack; slot: StageSlot; d: number } | null = null;
  for (const pack of packs) {
    for (const slot of pack.slots) {
      const d = pxDistance(point, slot, w, h);
      if (d <= SNAP_PX && (!best || d < best.d)) {
        best = { pack, slot, d };
      }
    }
  }
  return best ? { pack: best.pack, slot: best.slot } : null;
};

/** The pack whose slots are closest to a point (for group drops anywhere on the stage). */
export const nearestPack = (point: StagePoint, packs: readonly StagePack[], w: number, h: number): StagePack | null => {
  let best: { pack: StagePack; d: number } | null = null;
  for (const pack of packs) {
    const d = Math.min(...pack.slots.map((slot) => pxDistance(point, slot, w, h)));
    if (!best || d < best.d) {
      best = { pack, d };
    }
  }
  return best?.pack ?? null;
};

/** Pushed positions keep four places, so a snapped token sits within a hair of its slot. */
const ON_SLOT = 0.004;

const onSlot = (spot: StagePoint, slot: StagePoint): boolean => Math.abs(spot.u - slot.u) < ON_SLOT && Math.abs(spot.v - slot.v) < ON_SLOT;

/** The pack slot a token stands on, if any. */
export const slotOf = (spot: StagePoint, packs: readonly StagePack[]): { pack: StagePack; slot: StageSlot } | null => {
  for (const pack of packs) {
    const slot = pack.slots.find((entry) => onSlot(spot, entry));
    if (slot) {
      return { pack, slot };
    }
  }
  return null;
};

/** Where a token stands, in words: its pack, or a free spot. */
export const spotLabel = (spot: StagePoint, packs: readonly StagePack[]): string => slotOf(spot, packs)?.pack.label ?? "a free spot";

const toBoard = (slot: StagePoint, lightMode?: StageLight): StageChange => {
  const board = stageToBoard(slot.u, slot.v);
  return lightMode ? { u: board.u, v: board.v, lightMode } : { u: board.u, v: board.v };
};

/**
 * Put NPCs on a pack in order (the first on the anchor). Tokens already on the pack that are not among them
 * move, unlit, to the nearest free slots of other packs; NPCs beyond the pack's slots go to free slots nearby.
 * NPCs new to the stage come on lit; the rest keep their light.
 */
export const spreadOnPack = (keys: readonly string[], pack: StagePack, packs: readonly StagePack[], spots: readonly StageSpot[]): StageChanges => {
  const moving = new Set(keys);
  const changes: Record<string, StageChange> = {};
  const taken = new Set<StageSlot>();
  const stays = spots.filter((spot) => !moving.has(spot.characterKey));
  for (const spot of stays) {
    const found = slotOf(spot, packs);
    if (found && found.pack !== pack) {
      taken.add(found.slot);
    }
  }
  const elsewhere = packs
    .filter((other) => other !== pack)
    .flatMap((other) => fillOrder(other))
    .sort((a, b) => Math.hypot(a.u - pack.center.u, a.v - pack.center.v) - Math.hypot(b.u - pack.center.u, b.v - pack.center.v));
  const nextFree = (): StageSlot | undefined => {
    const slot = elsewhere.find((entry) => !taken.has(entry));
    if (slot) {
      taken.add(slot);
    }
    return slot;
  };
  const onStage = new Set(spots.map((spot) => spot.characterKey));
  const slots = fillOrder(pack);
  keys.forEach((key, index) => {
    const slot = slots[index] ?? nextFree();
    if (slot) {
      changes[key] = toBoard(slot, onStage.has(key) ? undefined : "STANDARD");
    }
  });
  for (const spot of stays) {
    if (pack.slots.some((slot) => onSlot(spot, slot))) {
      const slot = nextFree();
      changes[spot.characterKey] = slot ? toBoard(slot, "OFF") : { remove: true };
    }
  }
  return changes;
};

/** Move every token on one pack onto another, keeping their order from the anchor out. */
export const movePack = (from: StagePack, to: StagePack, packs: readonly StagePack[], spots: readonly StageSpot[]): StageChanges => {
  if (from === to) {
    return {};
  }
  const keys = fillOrder(from).flatMap((slot) => spots.filter((spot) => onSlot(spot, slot)).map((spot) => spot.characterKey));
  return keys.length === 0 ? {} : spreadOnPack(keys, to, packs, spots);
};

/**
 * Where Scatter group `group` (1-based) sits on the drawing: a ring of `count`, group 1 at the left (TTS puts it
 * at −X) and the rest clockwise, as seen from above.
 */
export const scatterCenter = (group: number, count: number): StagePoint => {
  const angle = ((270 + ((group - 1) * 360) / count) * Math.PI) / 180;
  return { u: 0.5 + 0.36 * Math.sin(angle), v: 0.38 - 0.27 * Math.cos(angle) };
};

export type ScatterMove = { readonly characterKey: string; readonly kind: "pc" | "npc"; readonly group?: number };

/** Scatter groups after one move: the character leaves every group, then joins `group` if given. */
export const moveInScatter = (groups: readonly ScatterGroup[], move: ScatterMove): readonly ScatterGroup[] =>
  groups.map((entry) => {
    const without = {
      ...entry,
      pcs: entry.pcs.filter((member) => member.characterKey !== move.characterKey),
      npcs: entry.npcs.filter((member) => member.characterKey !== move.characterKey)
    };
    if (entry.group !== move.group) {
      return without;
    }
    return move.kind === "pc"
      ? { ...without, pcs: [...without.pcs, { characterKey: move.characterKey }] }
      : { ...without, npcs: [...without.npcs, { characterKey: move.characterKey }] };
  });

/** Apply changes to the drawn tokens: moves, light flips, removals, and NPCs new to the stage. */
export const withChanges = (spots: readonly StageSpot[], changes: StageChanges): readonly StageSpot[] => {
  const out: StageSpot[] = [];
  for (const spot of spots) {
    const change = changes[spot.characterKey];
    if (!change) {
      out.push(spot);
    } else if (!isRemoval(change)) {
      out.push({ ...spot, ...boardToStage(change.u, change.v), lit: change.lightMode ? change.lightMode !== "OFF" : spot.lit });
    }
  }
  const known = new Set(spots.map((spot) => spot.characterKey));
  for (const [characterKey, change] of Object.entries(changes)) {
    if (!known.has(characterKey) && !isRemoval(change)) {
      out.push({ characterKey, ...boardToStage(change.u, change.v), lit: change.lightMode !== "OFF" });
    }
  }
  return out;
};
