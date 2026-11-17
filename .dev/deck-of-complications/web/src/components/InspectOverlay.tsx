import { useEffect } from "react";
import type { PublicGameView } from "../engine/game";

type Slot = NonNullable<PublicGameView["slots"][number]>;

export function InspectOverlay({
  slot,
  onClose,
}: {
  slot: Slot;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const src = `/assets/cards/${slot.imageStem}${slot.enhanced ? "_enhanced" : ""}.webp`;

  return (
    <div className="inspect-overlay" role="dialog" aria-label={slot.name}>
      <button type="button" className="inspect-backdrop" onClick={onClose} aria-label="Close" />
      <div className="inspect-card">
        <img src={src} alt={slot.name} />
        <p>
          {slot.name}
          {slot.enhanced ? " · Enhanced" : ""}
          {slot.negated ? " · Negated" : ""}
        </p>
      </div>
    </div>
  );
}
