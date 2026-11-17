import { useEffect, useRef } from "react";
import type { PublicGameView } from "../engine/game";
import { flipCard, pressFeedback } from "../motion";

type Slot = NonNullable<PublicGameView["slots"][number]>;

function overlaySrc(value: number): string {
  if (value < 0) return `/assets/overlays/overlay-revalue-neg${Math.abs(value)}.webp`;
  return `/assets/overlays/overlay-revalue-${value}.webp`;
}

export function CardSlot({
  slot,
  selected,
  canFlip,
  onFlip,
  onSelect,
}: {
  slot: Slot | null;
  selected: boolean;
  canFlip: boolean;
  onFlip: () => void;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const wasUp = useRef(false);

  useEffect(() => {
    if (!slot) return;
    if (slot.up && !wasUp.current) {
      flipCard(ref.current);
    }
    wasUp.current = slot.up;
  }, [slot]);

  if (!slot) {
    return <div className="card-slot empty" aria-hidden />;
  }

  const face = slot.up
    ? `/assets/cards/${slot.imageStem}${slot.enhanced ? "_enhanced" : ""}.webp`
    : "/assets/card-back.webp";

  const showRevalue =
    slot.up &&
    slot.revalued &&
    Number.isInteger(slot.value) &&
    slot.value >= -5 &&
    slot.value <= 10;

  return (
    <button
      ref={ref}
      type="button"
      className={[
        "card-slot",
        slot.up ? "face-up" : "face-down",
        selected ? "selected" : "",
        canFlip ? "flippable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        pressFeedback(ref.current);
        if (!slot.up && canFlip) onFlip();
        else if (slot.up) onSelect();
      }}
      disabled={slot.up ? false : !canFlip}
      aria-label={
        slot.up
          ? `${slot.name}${slot.enhanced ? " (enhanced)" : ""}${slot.negated ? " (negated)" : ""}`
          : `Face-down complication in slot ${slot.slot}`
      }
    >
      <img className="card-face" src={face} alt="" draggable={false} />
      {slot.up && slot.negated && (
        <img
          className="card-overlay"
          src="/assets/overlays/overlay-negated.webp"
          alt=""
        />
      )}
      {showRevalue && (
        <img
          className="card-overlay revalue"
          src={overlaySrc(slot.value)}
          alt=""
        />
      )}
    </button>
  );
}
