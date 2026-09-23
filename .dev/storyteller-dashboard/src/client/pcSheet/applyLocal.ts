import { humanityHasImpairedSlot } from "./paint.js";
import type { ApplyCommand, DamageMode, Rating, SeatSnapshot, SheetSnapshot, Tracker } from "./types.js";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.floor(value)));

const emptyRating = (): Rating => ({ base: 0, temp: 0, disabled: 0 });

const bumpRating = (rating: Rating | undefined, field: "base" | "temp" | "disabled", delta: number, max: number): Rating => {
  const current = rating ?? emptyRating();
  const min = field === "temp" ? -max : 0;
  return {
    ...current,
    [field]: clamp(current[field] + delta, min, max)
  };
};

const applyTrackDeltasV5 = (tracker: Tracker, maxBoxes: number, ds: number, da: number): Tracker => {
  let superficial = Math.max(0, tracker.superficial + ds);
  let aggravated = Math.max(0, tracker.aggravated + da);
  const total = superficial + aggravated;
  if (total <= maxBoxes) {
    return { ...tracker, superficial, aggravated };
  }
  const overflow = total - maxBoxes;
  let nextSuper = superficial - Math.min(superficial, overflow);
  const remainder = overflow - (superficial - nextSuper);
  let nextAgg = aggravated - remainder;
  if (nextAgg < 0) {
    nextAgg = 0;
  }
  for (let i = 0; i < overflow; i += 1) {
    if (nextSuper > 0) {
      nextSuper -= 1;
      nextAgg += 1;
    }
  }
  return { ...tracker, superficial: nextSuper, aggravated: nextAgg };
};

const effectiveAttribute = (seat: SeatSnapshot, key: string): number => {
  const rating = seat.attributes[key] ?? emptyRating();
  return rating.base + rating.temp - rating.disabled + (seat.badges[key] ?? 0);
};

const deltasForDamageMode = (seat: SeatSnapshot, which: "health" | "willpower", mode: DamageMode): { ds: number; da: number } | null => {
  switch (mode) {
    case "addSuper":
      return { ds: 1, da: 0 };
    case "addAgg":
      return { ds: 0, da: 1 };
    case "removeSuper":
      return { ds: -1, da: 0 };
    case "removeAgg":
      return { ds: 0, da: -1 };
    case "clearSuper":
      return { ds: -99, da: 0 };
    case "clearAgg":
      return { ds: 0, da: -99 };
    case "mend":
      if (which !== "health") {
        return null;
      }
      return { ds: -seat.mending, da: 0 };
    case "refresh": {
      if (which !== "willpower") {
        return null;
      }
      const x = Math.max(effectiveAttribute(seat, "resolve"), effectiveAttribute(seat, "composure"));
      return { ds: -x, da: 0 };
    }
    default:
      return null;
  }
};

const patchSeat = (seat: SeatSnapshot, command: ApplyCommand): SeatSnapshot => {
  switch (command.op) {
    case "dotDelta": {
      if (command.family === "bloodPotency") {
        return { ...seat, bloodPotency: bumpRating(seat.bloodPotency, command.field, command.delta, 10) };
      }
      const bag = command.family === "attributes" ? { ...seat.attributes } : { ...seat.skills };
      bag[command.key] = bumpRating(bag[command.key], command.field, command.delta, 5);
      return command.family === "attributes" ? { ...seat, attributes: bag } : { ...seat, skills: bag };
    }
    case "badgeDelta": {
      const next = clamp((seat.badges[command.key] ?? 0) + command.delta, -5, 5);
      return { ...seat, badges: { ...seat.badges, [command.key]: next } };
    }
    case "damage": {
      const deltas = deltasForDamageMode(seat, command.which, command.mode);
      if (deltas === null) {
        return seat;
      }
      if (command.which === "health") {
        return { ...seat, health: applyTrackDeltasV5(seat.health, seat.healthMax, deltas.ds, deltas.da) };
      }
      return { ...seat, willpower: applyTrackDeltasV5(seat.willpower, seat.willpowerMax, deltas.ds, deltas.da) };
    }
    case "humanity": {
      if (command.kind === "remorse") {
        const base = command.remorse === "fail"
          ? clamp(seat.humanity.base - 1, 0, 10)
          : seat.humanity.base;
        return { ...seat, humanity: { ...seat.humanity, stains: 0, base }, humanityMax: base };
      }
      if (command.kind === "stain") {
        const delta = command.delta ?? 0;
        if (delta > 0 && humanityHasImpairedSlot(seat.humanityMax, seat.humanity.stains)) {
          return seat;
        }
        return { ...seat, humanity: { ...seat.humanity, stains: clamp(seat.humanity.stains + delta, 0, 10) } };
      }
      const base = clamp(seat.humanity.base + (command.delta ?? 0), 0, 10);
      return { ...seat, humanity: { ...seat.humanity, base }, humanityMax: base };
    }
    case "xp":
      return { ...seat, xp: clamp(seat.xp + command.delta, 0, 999) };
    case "hunger":
      return { ...seat, hunger: clamp(seat.hunger + command.delta, 0, seat.hungerMax) };
    case "desire":
      return { ...seat, desire: command.text };
    case "absent":
      return { ...seat, absentFromSession: command.value };
    case "deferAutoSeat":
      return { ...seat, deferAutoSeat: command.value };
    case "deferConnect":
      return { ...seat, deferConnect: command.value };
    case "toggleFrenzy":
      return { ...seat, hudFrenzy: !seat.hudFrenzy };
    case "toggleBlindfold":
      return { ...seat, hudBlindfold: !seat.hudBlindfold };
    case "torporClear":
      return { ...seat, torpor: false };
    case "mergeSeat":
      return command.seat.color === seat.color ? command.seat : seat;
    default:
      return seat;
  }
};

export const applyLocal = (snapshot: SheetSnapshot, command: ApplyCommand): SheetSnapshot => ({
  ok: true,
  seats: snapshot.seats.map((seat) => (seat.color === command.color ? patchSeat(seat, command) : seat))
});
