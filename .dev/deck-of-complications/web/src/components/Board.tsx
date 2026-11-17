import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { ClientRole } from "../engine/types";
import type { PublicGameView } from "../engine/game";
import { dealSlots } from "../motion";
import { CardSlot } from "./CardSlot";

gsap.registerPlugin(useGSAP);

export function Board({
  view,
  role,
  onFlip,
  onSelect,
}: {
  view: PublicGameView;
  role: ClientRole;
  onFlip: (cardId: string) => void;
  onSelect: (cardId: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dealtFor = useRef<string | null>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      if (dealtFor.current === view.id) return;
      dealtFor.current = view.id;
      dealSlots(rootRef.current.querySelector(".slot-grid"));
    },
    { scope: rootRef, dependencies: [view.id] },
  );

  const canFlip =
    !view.ended &&
    view.mode === "stop" &&
    !view.exhausted &&
    (role === "player" || role === "storyteller");

  return (
    <div className="playmat-wrap" ref={rootRef}>
      <div
        className="playmat"
        style={{ backgroundImage: "url(/assets/playmat.webp)" }}
      >
        <div className="slot-grid">
          {view.slots.map((slot, index) => (
            <CardSlot
              key={slot?.id ?? `empty-${index}`}
              slot={slot}
              selected={!!slot && slot.id === view.selected}
              canFlip={!!slot && !slot.up && canFlip}
              onFlip={() => slot && onFlip(slot.id)}
              onSelect={() => {
                if (!slot?.up) return;
                if (role === "storyteller") onSelect(slot.id);
              }}
            />
          ))}
        </div>
        <div className="pile-meta">
          <span>Deck {view.deckCount}</span>
          <span>Discard {view.discardCount}</span>
        </div>
      </div>
    </div>
  );
}
