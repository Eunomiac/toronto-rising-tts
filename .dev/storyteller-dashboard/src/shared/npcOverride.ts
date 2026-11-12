/**
 * Per-NPC overrides set from the roster's token configuration window. `name` and `color` are drawn into the
 * spotlight token art; `name`, `cardScale` (Custom Figurine card scale, the npcs_data `figurine.scale` that
 * defaults to 53), `seatedY` (world Y at a table seat, default -52.89) and `yLevelDelta` (added to
 * every world placement Y) reach TTS through generated `lib/npc_overrides.ttslua`. Unset fields keep the defaults.
 */
export type NpcOverride = {
  readonly name?: string;
  readonly color?: string;
  readonly cardScale?: number;
  readonly seatedY?: number;
  /** Added to stage / scatter / seat figurine world Y whenever this NPC is placed. Default 0 (omit). */
  readonly yLevelDelta?: number;
};

export type NpcOverrideFile = { readonly overrides: Readonly<Record<string, NpcOverride>> };

export const NPC_OVERRIDE_KEY_PATTERN = /^[A-Za-z0-9_]{1,80}$/;
export const NPC_NAME_MAX = 60;
export const CARD_SCALE_RANGE = [1, 500] as const;
export const SEATED_Y_RANGE = [-120, 20] as const;
export const Y_LEVEL_DELTA_RANGE = [-40, 40] as const;

const COLOR_PATTERN = /^#[0-9a-f]{6}$/;

const inRange = (value: unknown, [min, max]: readonly [number, number]): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const round = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * The override in `value`, normalized (trimmed name, lower-case colour, rounded numbers), or an error message.
 * Absent, null and blank fields are left out; an empty result means "no override".
 */
export const parseNpcOverride = (value: unknown): NpcOverride | string => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "Expected an object with name, color, cardScale, seatedY or yLevelDelta.";
  }
  const raw = value as Record<string, unknown>;
  const out: { name?: string; color?: string; cardScale?: number; seatedY?: number; yLevelDelta?: number } = {};
  if (raw.name !== undefined && raw.name !== null) {
    if (typeof raw.name !== "string" || raw.name.trim().length > NPC_NAME_MAX) {
      return `name must be text of at most ${NPC_NAME_MAX} characters.`;
    }
    if (raw.name.trim() !== "") {
      out.name = raw.name.trim();
    }
  }
  if (raw.color !== undefined && raw.color !== null && raw.color !== "") {
    const color = typeof raw.color === "string" ? raw.color.toLowerCase() : "";
    if (!COLOR_PATTERN.test(color)) {
      return "color must be a #rrggbb hex colour.";
    }
    out.color = color;
  }
  if (raw.cardScale !== undefined && raw.cardScale !== null) {
    if (!inRange(raw.cardScale, CARD_SCALE_RANGE)) {
      return `cardScale must be a number from ${CARD_SCALE_RANGE[0]} to ${CARD_SCALE_RANGE[1]}.`;
    }
    out.cardScale = round(raw.cardScale);
  }
  if (raw.seatedY !== undefined && raw.seatedY !== null) {
    if (!inRange(raw.seatedY, SEATED_Y_RANGE)) {
      return `seatedY must be a number from ${SEATED_Y_RANGE[0]} to ${SEATED_Y_RANGE[1]}.`;
    }
    out.seatedY = round(raw.seatedY);
  }
  if (raw.yLevelDelta !== undefined && raw.yLevelDelta !== null) {
    if (!inRange(raw.yLevelDelta, Y_LEVEL_DELTA_RANGE)) {
      return `yLevelDelta must be a number from ${Y_LEVEL_DELTA_RANGE[0]} to ${Y_LEVEL_DELTA_RANGE[1]}.`;
    }
    const delta = round(raw.yLevelDelta);
    if (delta !== 0) {
      out.yLevelDelta = delta;
    }
  }
  return out;
};

export const isEmptyNpcOverride = (override: NpcOverride): boolean => Object.keys(override).length === 0;
