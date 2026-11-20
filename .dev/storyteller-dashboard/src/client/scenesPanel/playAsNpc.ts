import type { NpcTier } from "../../shared/npcStats";
import type { ScenesCommand } from "./commands";

export type PlayAsNpcAsk = {
  readonly color: string;
  readonly pcName: string;
  readonly npcKey: string;
  readonly npcLabel: string;
  readonly isGeneric: boolean;
  /** Tiers that have a stat block for this generic figure (empty → name-only generic). */
  readonly availableTiers: readonly NpcTier[];
  readonly seedRoleplayNotes: string;
  readonly seedDisplayName?: string;
  readonly seedTier?: NpcTier;
};

export type PlayAsNpcConfirm = {
  readonly color: string;
  readonly npcKey: string;
  readonly roleplayNotes: string;
  readonly displayName?: string;
  readonly tier?: NpcTier;
};

/** Build the live/draft command that marks a PC seat as playing an NPC. */
export const playAsNpcCommand = (confirm: PlayAsNpcConfirm): ScenesCommand => ({
  op: "playAsNpc",
  color: confirm.color,
  npcCharacterKey: confirm.npcKey,
  roleplayNotes: confirm.roleplayNotes,
  ...(confirm.displayName !== undefined && confirm.displayName.trim() !== ""
    ? { displayName: confirm.displayName.trim() }
    : {}),
  ...(confirm.tier !== undefined ? { tier: confirm.tier } : {}),
});

export const clearPlayAsNpcCommand = (color: string): ScenesCommand => ({
  op: "clearPlayAsNpc",
  color,
});

/** Which PC color currently portrays this NPC key (live seats push). */
export const colorPlayingNpc = (
  seats: readonly { readonly kind?: string; readonly color?: string; readonly playingNpcKey?: string }[],
  npcKey: string
): string | undefined => {
  for (const seat of seats) {
    if (seat.kind === "pc" && seat.playingNpcKey === npcKey && typeof seat.color === "string") {
      return seat.color;
    }
  }
  return undefined;
};
