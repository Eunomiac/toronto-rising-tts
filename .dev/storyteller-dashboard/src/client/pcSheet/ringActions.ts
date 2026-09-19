import type { ApplyCommand, DamageMode, RingAction, RingTarget, SeatSnapshot } from "./types.js";

export const formatBadge = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

const traitButtons = (
  seat: SeatSnapshot,
  family: "attributes" | "skills" | "bloodPotency",
  key: string,
  includeBadge: boolean
): readonly RingAction[] => {
  const color = seat.color;
  const baseImage = family === "bloodPotency" ? "buttons/bp_base.webp" : "buttons/trait_base.webp";
  const left = (field: "base" | "temp" | "disabled", delta: number): ApplyCommand => ({
    op: "dotDelta",
    color,
    family,
    key,
    field,
    delta
  });
  const actions: RingAction[] = [
    {
      id: "base",
      label: "Base",
      image: baseImage,
      left: left("base", 1),
      right: left("base", -1)
    },
    {
      id: "temp",
      label: "Temp",
      image: "buttons/trait_temp.webp",
      left: left("temp", 1),
      right: left("temp", -1)
    },
    {
      id: "disable",
      label: "Disable",
      image: "buttons/trait_disable.webp",
      left: left("disabled", 1),
      right: left("disabled", -1)
    }
  ];
  if (includeBadge) {
    const current = seat.badges[key] ?? 0;
    actions.push({
      id: "badge",
      label: "Badge",
      badgeText: current === 0 ? "+0" : formatBadge(current),
      left: { op: "badgeDelta", color, key, delta: 1 },
      right: { op: "badgeDelta", color, key, delta: -1 }
    });
  }
  return actions;
};

const damageButtons = (seat: SeatSnapshot, which: "health" | "willpower"): readonly RingAction[] => {
  const color = seat.color;
  const mode = (value: DamageMode): ApplyCommand => ({
    op: "damage",
    color,
    which,
    mode: value
  });
  const actions: RingAction[] = [
    {
      id: "sup",
      label: "Superficial",
      image: "buttons/tracker_sup.webp",
      left: mode("addSuper"),
      right: mode("removeSuper")
    },
    {
      id: "agg",
      label: "Aggravated",
      image: "buttons/tracker_agg.webp",
      left: mode("addAgg"),
      right: mode("removeAgg")
    },
    {
      id: "clear",
      label: "Clear",
      image: "buttons/tracker_clear.webp",
      left: mode("clearSuper"),
      right: mode("clearAgg")
    }
  ];
  if (which === "health") {
    actions.push({
      id: "mend",
      label: "Mend",
      image: "buttons/tracker_mend.webp",
      left: mode("mend"),
      right: mode("mend"),
      closeOnPick: true
    });
  } else {
    actions.push({
      id: "refresh",
      label: "Refresh",
      image: "buttons/tracker_refresh.webp",
      left: mode("refresh"),
      right: mode("refresh"),
      closeOnPick: true
    });
  }
  return actions;
};

export const actionsForRing = (seat: SeatSnapshot, target: RingTarget): readonly RingAction[] => {
  if (target.kind === "trait") {
    return traitButtons(seat, target.family, target.key, true);
  }
  if (target.kind === "bloodPotency") {
    return traitButtons(seat, "bloodPotency", "bloodPotency", false);
  }
  if (target.kind === "damage") {
    return damageButtons(seat, target.which);
  }
  const color = seat.color;
  return [
    {
      id: "stain",
      label: "Stain",
      image: "buttons/humanity_stain.webp",
      left: { op: "humanity", color, kind: "stain", delta: 1 },
      right: { op: "humanity", color, kind: "stain", delta: -1 }
    },
    {
      id: "base",
      label: "Humanity",
      image: "buttons/humanity_base.webp",
      left: { op: "humanity", color, kind: "base", delta: 1 },
      right: { op: "humanity", color, kind: "base", delta: -1 }
    },
    {
      id: "remorse",
      label: "Remorse",
      image: "buttons/humanity_remorse.webp",
      left: { op: "humanity", color, kind: "remorse", remorse: "pass" },
      right: { op: "humanity", color, kind: "remorse", remorse: "fail" }
    }
  ];
};
