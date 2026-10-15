import type { CSSProperties, ReactElement } from "react";
import { sheetArtUrl } from "./layout.js";
import type { DotSlot } from "./paint.js";

type Props = {
  readonly slots: readonly DotSlot[];
  readonly large?: boolean;
};

export const DotLine = ({ slots, large = false }: Props): ReactElement => (
  <span className={`pc-dots${large ? " large" : ""}`}>
    {slots.map((slot, index) => (
      <span
        key={index}
        className={`pc-dot${slot.active ? " on" : ""}`}
        style={slot.active && slot.image
          ? { "--pc-dot": `url("${sheetArtUrl(slot.image)}")` } as CSSProperties
          : undefined}
      />
    ))}
  </span>
);
