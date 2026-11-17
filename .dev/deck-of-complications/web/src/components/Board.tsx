import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { ClientRole } from "../engine/types";
import type { PublicGameView } from "../engine/game";
import type { GameIntent } from "../protocol";
import {
  dealFromAbove,
  discardOffBoard,
  introTable,
  leapToRead,
  tableRock,
} from "../motion";
import { playSfx } from "../audio/sfx";
import { CardSlot } from "./CardSlot";
import { CardActionPopover } from "./CardActionPopover";
import { CardRadialMenu } from "./CardRadialMenu";

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
  const stageRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null); // board-stack — tipped + rocked
  const gridRef = useRef<HTMLDivElement>(null);
  const dealtFor = useRef<string | null>(null);
  const rockRef = useRef<gsap.core.Timeline | null>(null);
  const prevSlots = useRef<(string | null)[]>([]);
  const leapDismiss = useRef<(() => void) | null>(null);

  const [popover, setPopover] = useState<DOMRect | null>(null);
  const [radial, setRadial] = useState<{ x: number; y: number } | null>(null);

  const closeMenus = useCallback(() => {
    setPopover(null);
    setRadial(null);
  }, []);

  const pauseRock = useCallback(() => {
    rockRef.current?.pause();
  }, []);

  const resumeRock = useCallback(() => {
    rockRef.current?.resume();
  }, []);

  useGSAP(
    () => {
      if (!tableRef.current) return;
      introTable(tableRef.current);
      rockRef.current?.kill();
      const startRock = window.setTimeout(() => {
        rockRef.current = tableRock(tableRef.current);
      }, 1100);

      if (dealtFor.current === view.id) {
        return () => window.clearTimeout(startRock);
      }
      dealtFor.current = view.id;
      prevSlots.current = view.slots.map((s) => s?.id ?? null);

      const run = () => {
        const slots = gridRef.current
          ? Array.from(gridRef.current.querySelectorAll(".card-slot:not(.empty)"))
          : [];
        dealFromAbove({
          slotEls: slots,
          tableEl: tableRef.current,
          onCardLand: () => playSfx("deal"),
        });
      };
      requestAnimationFrame(run);
      return () => {
        window.clearTimeout(startRock);
        rockRef.current?.kill();
      };
    },
    { scope: rootRef, dependencies: [view.id] },
  );

  // Discard / refill: cards that leave a slot slide off the bottom.
  useEffect(() => {
    const prev = prevSlots.current;
    const next = view.slots.map((s) => s?.id ?? null);
    if (prev.length === 10) {
      for (let i = 0; i < 10; i++) {
        if (prev[i] && prev[i] !== next[i]) {
          const el = gridRef.current?.querySelectorAll(".card-slot")[i];
          if (el && !el.classList.contains("empty")) {
            discardOffBoard(el, () => {
              // Replacement card drops in after abyss exit.
              const replacement = gridRef.current?.querySelectorAll(".card-slot")[i];
              if (replacement && !replacement.classList.contains("empty")) {
                dealFromAbove({
                  slotEls: [replacement],
                  tableEl: tableRef.current,
                  onCardLand: () => playSfx("deal"),
                });
              }
            });
          }
        }
      }
    }
    prevSlots.current = next;
  }, [view.slots, view.discardCount]);

  useEffect(
    () => () => {
      leapDismiss.current?.();
      leapDismiss.current = null;
    },
    [],
  );

  const canFlip =
    !view.ended &&
    view.mode === "stop" &&
    !view.exhausted &&
    (role === "player" || role === "storyteller");

  const storyteller = role === "storyteller";
  const playerChrome = role === "player";

  return (
    <div className="playmat-wrap" ref={rootRef}>
      <div className="table-stage" ref={stageRef}>
        <div className="board-stack" ref={tableRef}>
          <div className="board-thickness" aria-hidden />
          <div className="playmat" aria-label="Complications board">
            <div className="slot-grid" ref={gridRef}>
              {view.slots.map((slot, index) => (
                <CardSlot
                  key={slot?.id ?? `empty-${index}`}
                  slot={slot}
                  selected={!!slot && slot.id === view.selected}
                  canFlip={!!slot && !slot.up && canFlip}
                  storyteller={storyteller}
                  playerChrome={playerChrome}
                  onFlip={() => slot && onFlip(slot.id)}
                  onSelect={() => {
                    if (!slot?.up) return;
                    if (storyteller) {
                      onSelect(slot.id);
                      const el = gridRef.current?.querySelectorAll(".card-slot")[index];
                      if (el) setPopover(el.getBoundingClientRect());
                      setRadial(null);
                    }
                  }}
                  onContextMenu={(e) => {
                    if (!slot?.up || !storyteller) return;
                    onSelect(slot.id);
                    setRadial({ x: e.clientX, y: e.clientY });
                    setPopover(null);
                  }}
                  onFaceUpEnter={(el) => {
                    if (storyteller) return; // ST uses click menus; leap is player read aid
                    if (leapDismiss.current) return; // already reading — keep stable
                    pauseRock();
                    const { dismiss } = leapToRead({
                      source: el,
                      dimRoot: stageRef.current,
                    });
                    leapDismiss.current = dismiss;
                  }}
                  onFaceUpLeave={() => {
                    if (!leapDismiss.current) return;
                    const dismiss = leapDismiss.current;
                    leapDismiss.current = null;
                    dismiss();
                    resumeRock();
                  }}
                />
              ))}
            </div>
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
    </div>
  );
}
