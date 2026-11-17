import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import type { PublicGameView } from "../engine/game";
import {
  enhancePulse,
  magneticLift,
  negateFlash,
  physicalFlip,
  pressFeedback,
} from "../motion";

type Slot = NonNullable<PublicGameView["slots"][number]>;

function faceSrcFor(slot: Slot): string {
  return `/assets/cards/${slot.imageStem}${slot.enhanced ? "_enhanced" : ""}.webp`;
}

function overlaySrc(value: number): string {
  if (value < 0) return `/assets/overlays/overlay-revalue-neg${Math.abs(value)}.webp`;
  return `/assets/overlays/overlay-revalue-${value}.webp`;
}

export function CardSlot({
  slot,
  selected,
  highlighted,
  canFlip,
  storyteller,
  playerChrome,
  onFlip,
  onSelect,
  onContextMenu,
  onFaceUpEnter,
  onFaceUpLeave,
}: {
  slot: Slot | null;
  selected: boolean;
  highlighted?: boolean;
  canFlip: boolean;
  storyteller: boolean;
  playerChrome: boolean;
  onFlip: () => void;
  onSelect: () => void;
  onContextMenu: (e: ReactMouseEvent | { clientX: number; clientY: number; preventDefault(): void }) => void;
  onFaceUpEnter: (el: HTMLButtonElement) => void;
  onFaceUpLeave: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const wasUp = useRef(slot?.up ?? false);
  const wasEnhanced = useRef(!!slot?.enhanced);
  const wasNegated = useRef(!!slot?.negated);
  const trackedId = useRef(slot?.id ?? null);
  const longPress = useRef<number | null>(null);
  const flipping = useRef(false);

  // Reset transition trackers when this button hosts a different card id.
  useEffect(() => {
    if (!slot) return;
    if (trackedId.current !== slot.id) {
      trackedId.current = slot.id;
      wasUp.current = slot.up;
      wasEnhanced.current = slot.enhanced;
      wasNegated.current = slot.negated;
    }
  }, [slot]);

  useEffect(() => {
    if (!slot) return;
    if (slot.up && !wasUp.current) {
      wasUp.current = true;
      flipping.current = true;
      physicalFlip(ref.current, faceSrcFor(slot), () => {
        flipping.current = false;
      });
      return;
    }
    if (slot.up && wasUp.current) {
      ref.current?.classList.add("is-flipped");
    }
  }, [slot]);

  useEffect(() => {
    if (!slot) return;
    if (slot.enhanced && !wasEnhanced.current) {
      enhancePulse(ref.current);
    }
    wasEnhanced.current = slot.enhanced;
  }, [slot?.id, slot?.enhanced]);

  useEffect(() => {
    if (!slot) return;
    if (slot.negated && !wasNegated.current) {
      negateFlash(ref.current);
    }
    wasNegated.current = slot.negated;
  }, [slot?.id, slot?.negated]);

  if (!slot) {
    return <div className="card-slot empty" aria-hidden />;
  }

  const faceSrc = faceSrcFor(slot);
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
        slot.up || wasUp.current ? "face-up" : "face-down",
        slot.up || wasUp.current ? "is-flipped" : "",
        selected && storyteller ? "selected" : "",
        highlighted ? "highlight-pick" : "",
        canFlip ? "flippable" : "",
        playerChrome ? "player-chrome" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        if (flipping.current) return;
        pressFeedback(ref.current);
        if (!slot.up && canFlip) {
          flipping.current = true;
          const el = ref.current;
          physicalFlip(el, faceSrc, () => {
            wasUp.current = true;
            flipping.current = false;
            onFlip();
          });
          return;
        }
        if (slot.up) onSelect();
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
      onPointerEnter={() => {
        if (!ref.current) return;
        if (!slot.up && !wasUp.current) {
          magneticLift(ref.current, true);
          return;
        }
        if (slot.up || wasUp.current) {
          onFaceUpEnter(ref.current);
        }
      }}
      onPointerLeave={() => {
        if (longPress.current) window.clearTimeout(longPress.current);
        if (!slot.up && !wasUp.current) {
          magneticLift(ref.current, false);
          return;
        }
        onFaceUpLeave();
      }}
      disabled={slot.up || wasUp.current ? false : !canFlip}
      aria-label={
        slot.up || wasUp.current
          ? `${slot.name}${slot.enhanced ? " (enhanced)" : ""}${slot.negated ? " (negated)" : ""}`
          : `Face-down complication in slot ${slot.slot}`
      }
    >
      <span className="card-shadow" aria-hidden />
      <div className="card-flipper">
        <div className="face-back">
          <img src="/assets/card-back.webp" alt="" draggable={false} />
        </div>
        <div className="face-front">
          {/* Always mounted so flip/enhance share one image node (no orphan base face). */}
          <img className="card-face" src={faceSrc} alt="" draggable={false} />
          {(slot.up || wasUp.current) && slot.negated && (
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
        </div>
      </div>
    </button>
  );
}
