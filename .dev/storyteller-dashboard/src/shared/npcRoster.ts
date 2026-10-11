import { parseRosterLayout, type RosterLayout } from "./sceneDeck.js";

/**
 * `data/npc-roster.json` (tracked). `groupLabels` names the roster groups that are not coteries (coterie names come
 * from `C.CHRONICLE_DATA.coteries`), `bosses` gives each group's default leader (it mirrors the "Boss?" column of the
 * chronicle sheet's NPCs tab), and `members` lists each named NPC's groups, primary first. The scene catalog
 * generator reads those three into `scene-catalogs.json`. `layout` is the roster tab's categories, colours and
 * picked leaders: the dashboard server writes it, and `npm run npc-art` reads it for token ring colours.
 */
export type NpcRoster = {
  readonly groupLabels: Readonly<Record<string, string>>;
  readonly bosses: Readonly<Record<string, string>>;
  readonly members: Readonly<Record<string, readonly string[]>>;
  readonly layout: RosterLayout;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const strings = (value: unknown, section: string): Record<string, string> => {
  if (!isRecord(value) || !Object.values(value).every((entry) => typeof entry === "string")) {
    throw new Error(`npc-roster.json ${section} must map keys to strings.`);
  }
  return value as Record<string, string>;
};

/** Refuses anything malformed: the roster is tracked data, so a bad file must be fixed, not quietly emptied. */
export const parseNpcRoster = (value: unknown): NpcRoster => {
  if (!isRecord(value)) {
    throw new Error("npc-roster.json must be a JSON object.");
  }
  const { members, layout } = value;
  if (!isRecord(members) || !Object.values(members).every((groups) => Array.isArray(groups) && groups.every((group) => typeof group === "string"))) {
    throw new Error("npc-roster.json members must map character keys to arrays of group keys.");
  }
  if (!isRecord(layout)) {
    throw new Error("npc-roster.json layout must be an object.");
  }
  return {
    groupLabels: strings(value.groupLabels, "groupLabels"),
    bosses: strings(value.bosses, "bosses"),
    members: members as Record<string, readonly string[]>,
    layout: parseRosterLayout(layout)
  };
};
