import { SEAT_COLORS, type SeatColor, type SeatSnapshot, type SheetSnapshot } from "./types.js";

const isSeatColor = (value: unknown): value is SeatColor =>
  typeof value === "string" && (SEAT_COLORS as readonly string[]).includes(value);

/**
 * Merge one `pcSeat` push (Lua `DashPush.seat` → slim seat snapshot without `playerData`) into the
 * live sheet snapshot. The seat keeps its previous `playerData`, which only full fetches carry.
 * Returns the same snapshot when the push does not apply (offline sheet, bad color, no data).
 */
export const mergeSeatPush = (snapshot: SheetSnapshot, color: unknown, data: unknown): SheetSnapshot => {
  if (!snapshot.ok || !isSeatColor(color) || typeof data !== "object" || data === null) {
    return snapshot;
  }
  const index = snapshot.seats.findIndex((row) => row.color === color);
  const previous = index >= 0 ? snapshot.seats[index] : undefined;
  const next: SeatSnapshot = {
    ...(data as SeatSnapshot),
    color,
    playerData: previous?.playerData ?? {}
  };
  const seats = index >= 0
    ? snapshot.seats.map((row, i) => (i === index ? next : row))
    : [...snapshot.seats, next];
  return { ...snapshot, seats };
};
