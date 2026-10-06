import { useState, type MouseEvent, type ReactElement } from "react";
import { PageOne } from "./PageOne.js";
import { PageSix } from "./PageSix.js";
import { PageThree } from "./PageThree.js";
import { PageTwo } from "./PageTwo.js";
import type { ApplyCommand, RingTarget, SeatSnapshot, SheetSnapshot } from "./types.js";
import { XpModal } from "./XpModal.js";

/** Shared props for every sheet page component. */
export type PageContext = {
  readonly seat: SeatSnapshot;
  readonly snapshot: SheetSnapshot;
  readonly side: "left" | "right";
  readonly onRing: (event: MouseEvent<HTMLElement>, target: RingTarget) => void;
  /** Optimistic: paint locally, queue to TTS. */
  readonly apply: (command: ApplyCommand) => void;
  /** Modal edits: wait for TTS, throw the host error so the modal can show it. */
  readonly applyNow: (command: ApplyCommand) => Promise<void>;
};

export const SPREADS = [
  { label: "I · II", pages: [1, 2] },
  { label: "III · IV", pages: [3, 4] },
  { label: "V · VI", pages: [5, 6] }
] as const;

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

const Placeholder = ({ page, side }: { readonly page: number; readonly side: "left" | "right" }): ReactElement => (
  <article className={`pc-page pc-page-placeholder ${side}`} aria-hidden="true">
    <span>{ROMAN[page]}</span>
  </article>
);

const PageOneSlot = ({ ctx }: { readonly ctx: PageContext }): ReactElement => {
  const [addingXp, setAddingXp] = useState(false);
  const color = ctx.seat.color;
  return (
    <>
      <PageOne
        seat={ctx.seat}
        side={ctx.side}
        onRing={ctx.onRing}
        onHunger={(delta) => ctx.apply({ op: "hunger", color, delta })}
        onXp={() => setAddingXp(true)}
        onDesire={(text) => {
          if (text !== ctx.seat.desire) {
            ctx.apply({ op: "desire", color, text });
          }
        }}
      />
      {addingXp ? <XpModal seat={ctx.seat} snapshot={ctx.snapshot} send={ctx.applyNow} onClose={() => setAddingXp(false)} /> : null}
    </>
  );
};

export const renderPage = (page: number, ctx: PageContext): ReactElement => {
  switch (page) {
    case 1:
      return <PageOneSlot ctx={ctx} />;
    case 2:
      return <PageTwo ctx={ctx} />;
    case 3:
      return <PageThree ctx={ctx} />;
    case 6:
      return <PageSix ctx={ctx} />;
    default:
      return <Placeholder page={page} side={ctx.side} />;
  }
};
