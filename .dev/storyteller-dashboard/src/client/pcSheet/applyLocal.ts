import type { ApplyCommand, Rating, SeatSnapshot, SheetSnapshot, Tracker } from "./types.js";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.floor(value)));

const bumpRating = (rating: Rating | undefined, field: "base" | "temp", delta: number, max: number): Rating => {
  const current = rating ?? { base: 0, temp: 0 };
  return {
    ...current,
    [field]: clamp(current[field] + delta, field === "temp" ? -10 : 0, max)
  };
};

const bumpTrackerDamage = (tracker: Tracker, maxBoxes: number, superficialDelta: number, aggravatedDelta: number): Tracker => {
  const aggravated = clamp(tracker.aggravated + aggravatedDelta, 0, maxBoxes);
  const remaining = maxBoxes - aggravated;
  const superficial = clamp(tracker.superficial + superficialDelta, 0, remaining);
  return { ...tracker, aggravated, superficial };
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
    case "damage": {
      if (command.which === "health") {
        return { ...seat, health: bumpTrackerDamage(seat.health, seat.healthMax, command.superficialDelta, command.aggravatedDelta) };
      }
      return { ...seat, willpower: bumpTrackerDamage(seat.willpower, seat.willpowerMax, command.superficialDelta, command.aggravatedDelta) };
    }
    case "humanity": {
      if (command.kind === "clearStains") {
        return { ...seat, humanity: { ...seat.humanity, stains: 0 } };
      }
      if (command.kind === "stain") {
        return { ...seat, humanity: { ...seat.humanity, stains: clamp(seat.humanity.stains + (command.delta ?? 0), 0, 10) } };
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
    default:
      return seat;
  }
};

export const applyLocal = (snapshot: SheetSnapshot, command: ApplyCommand): SheetSnapshot => ({
  ok: true,
  seats: snapshot.seats.map((seat) => (seat.color === command.color ? patchSeat(seat, command) : seat))
});
