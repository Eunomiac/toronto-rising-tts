import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { PublicGameView } from "../engine/game";
import {
  burnReveal,
  enhancePulse,
  negateFlash,
  pressFeedback,
  selectLift,
} from "../motion";

type Slot = NonNullable<PublicGameView["slots"][number]>;

function overlaySrc(value: number): string {
  if (value < 0) return `/assets/overlays/overlay-revalue-neg${Math.abs(value)}.webp`;
  return `/assets/overlays/overlay-revalue-${value}.webp`;
}

export function CardSlot({
  slot,
  selected,
  canFlip,
  storyteller,
  onFlip,
  onSelect,
  onContextMenu,
  onInspect,
}: {
  slot: Slot | null;
  selected: boolean;
  canFlip: boolean;
  storyteller: boolean;
  onFlip: () => void;
  onSelect: () => void;
  onContextMenu: (e: ReactMouseEvent | { clientX: number; clientY: number; preventDefault(): void }) => void;
  onInspect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const wasUp = useRef(false);
  const wasEnhanced = useRef(false);
  const wasNegated = useRef(false);
  const [glare, setGlare] = useState({ x: 50, y: 40 });
  const longPress = useRef<number | null>(null);

  useEffect(() => {
    if (!slot) return;
    if (slot.up && !wasUp.current) {
      burnReveal(ref.current);
    }
    wasUp.current = slot.up;
  }, [slot]);

  useEffect(() => {
    selectLift(ref.current, selected);
  }, [selected]);

  useEffect(() => {
    if (!slot) return;
    if (slot.enhanced && !wasEnhanced.current) enhancePulse(ref.current);
    wasEnhanced.current = slot.enhanced;
  }, [slot]);

  useEffect(() => {
    if (!slot) return;
    if (slot.negated && !wasNegated.current) negateFlash(ref.current);
    wasNegated.current = slot.negated;
  }, [slot]);

  if (!slot) {
    return <div className="card-slot empty" aria-hidden />;
  }

  const faceSrc = `/assets/cards/${slot.imageStem}${slot.enhanced ? "_enhanced" : ""}.webp`;
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
      onDoubleClick={() => {
        if (slot.up) onInspect();
      }}
      onContextMenu={(e) => {
        if (!storyteller || !slot.up) return;
        e.preventDefault();
        onContextMenu(e);
      }}
      onPointerDown={(e) => {
        if (!storyteller || !slot.up || e.pointerType === "mouse") return;
        longPress.current = window.setTimeout(() => {
          onContextMenu({
            preventDefault() {},
            clientX: e.clientX,
            clientY: e.clientY,
          });
        }, 480);
      }}
      onPointerUp={() => {
        if (longPress.current) window.clearTimeout(longPress.current);
      }}
      onPointerLeave={() => {
        if (longPress.current) window.clearTimeout(longPress.current);
      }}
      onPointerMove={(e) => {
        if (!slot.up || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setGlare({
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
        });
      }}
      disabled={slot.up ? false : !canFlip}
      aria-label={
        slot.up
          ? `${slot.name}${slot.enhanced ? " (enhanced)" : ""}${slot.negated ? " (negated)" : ""}`
          : `Face-down complication in slot ${slot.slot}`
      }
    >
      <span className="card-shadow" aria-hidden />
      <img
        className="card-face"
        src={faceSrc}
        alt=""
        draggable={false}
        style={{ opacity: slot.up ? 1 : 0 }}
      />
      <img
        className="card-back"
        src="/assets/card-back.webp"
        alt=""
        draggable={false}
        style={{ opacity: slot.up ? 0 : 1 }}
      />
      {slot.up && (
        <span
          className="card-glare"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,240,200,0.35), transparent 45%)`,
          }}
          aria-hidden
        />
      )}
      {slot.up && slot.negated && (
        <img
          className="card-overlay negated"
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
