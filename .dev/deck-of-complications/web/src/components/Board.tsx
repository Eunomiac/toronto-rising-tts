import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { ClientRole } from "../engine/types";
import type { PublicGameView } from "../engine/game";
import type { GameIntent } from "../protocol";
import { dealFromDeck, introTable } from "../motion";
import { playSfx } from "../audio/sfx";
import { CardSlot } from "./CardSlot";
import { CardActionPopover } from "./CardActionPopover";
import { CardRadialMenu } from "./CardRadialMenu";
import { DeckProp, DiscardProp } from "./DeckProp";
import { InspectOverlay } from "./InspectOverlay";

gsap.registerPlugin(useGSAP);

export function Board({
  view,
  role,
  onFlip,
  onSelect,
  onIntent,
}: {
  view: PublicGameView;
  role: ClientRole;
  onFlip: (cardId: string) => void;
  onSelect: (cardId: string) => void;
  onIntent: (intent: GameIntent) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dealtFor = useRef<string | null>(null);
  const [popover, setPopover] = useState<DOMRect | null>(null);
  const [radial, setRadial] = useState<{ x: number; y: number } | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  const closeMenus = useCallback(() => {
    setPopover(null);
    setRadial(null);
  }, []);

  useGSAP(
    () => {
      if (!rootRef.current || !tableRef.current) return;
      introTable(tableRef.current);

      if (dealtFor.current === view.id) return;
      dealtFor.current = view.id;

      const run = () => {
        const slots = gridRef.current
          ? Array.from(gridRef.current.querySelectorAll(".card-slot:not(.empty)"))
          : [];
        dealFromDeck({
          deckEl: deckRef.current,
          slotEls: slots,
          tableEl: tableRef.current,
          onCardLand: () => playSfx("deal"),
        });
      };
      // Wait a frame so layout/CQ card sizes are settled.
      requestAnimationFrame(run);
    },
    { scope: rootRef, dependencies: [view.id] },
  );

  const canFlip =
    !view.ended &&
    view.mode === "stop" &&
    !view.exhausted &&
    (role === "player" || role === "storyteller");

  const storyteller = role === "storyteller";
  const inspectSlot = view.slots.find((s) => s?.id === inspectId) ?? null;

  return (
    <div className="playmat-wrap" ref={rootRef}>
      <div className="table-stage">
        <div className="playmat" ref={tableRef} aria-label="Complications board">
          <div className="board-props">
            <DeckProp ref={deckRef} count={view.deckCount} />
            <DiscardProp
              count={view.discardCount}
              refEl={(el) => {
                discardRef.current = el;
              }}
            />
          </div>
          <div className="slot-grid" ref={gridRef}>
            {view.slots.map((slot, index) => (
              <CardSlot
                key={slot?.id ?? `empty-${index}`}
                slot={slot}
                selected={!!slot && slot.id === view.selected}
                canFlip={!!slot && !slot.up && canFlip}
                storyteller={storyteller}
                onFlip={() => slot && onFlip(slot.id)}
                onSelect={() => {
                  if (!slot?.up) return;
                  if (storyteller) {
                    onSelect(slot.id);
                    const el = gridRef.current?.querySelectorAll(".card-slot")[index];
                    if (el) setPopover(el.getBoundingClientRect());
                    setRadial(null);
                  } else {
                    setInspectId(slot.id);
                  }
                }}
                onContextMenu={(e) => {
                  if (!slot?.up || !storyteller) return;
                  onSelect(slot.id);
                  setRadial({ x: e.clientX, y: e.clientY });
                  setPopover(null);
                }}
                onInspect={() => slot?.up && setInspectId(slot.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {storyteller && popover && view.selected && (
        <CardActionPopover
          view={view}
          anchor={popover}
          onIntent={(intent) => {
            onIntent(intent);
            if (intent.op === "discard" || intent.op === "select") closeMenus();
          }}
          onClose={closeMenus}
        />
      )}
      {storyteller && radial && (
        <CardRadialMenu
          x={radial.x}
          y={radial.y}
          onIntent={onIntent}
          onClose={closeMenus}
        />
      )}
      {inspectSlot && (
        <InspectOverlay slot={inspectSlot} onClose={() => setInspectId(null)} />
      )}
    </div>
  );
}
