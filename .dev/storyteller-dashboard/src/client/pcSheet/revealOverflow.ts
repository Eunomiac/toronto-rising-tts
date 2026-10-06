import type { MouseEvent } from "react";

const SHIFT_VAR = "--pc-reveal-shift";
const EDGE_PADDING = 4;

/**
 * Hover handlers for an ellipsis-truncated header whose first child is the text span. When the text
 * is cut off, `.pc-revealed` lets the span spill out in full, shifted to stay inside the scroll area. Shift is in unscaled page pixels (the page is drawn with `scale(1.25)`).
 */
export const revealOverflowProps = {
  onMouseEnter: (event: MouseEvent<HTMLElement>): void => {
    const el = event.currentTarget;
    const text = el.firstElementChild;
    if (!(text instanceof HTMLElement) || el.scrollWidth <= el.clientWidth) {
      return;
    }
    el.classList.add("pc-revealed");
    const bounds = (el.closest(".pc-sheet-scroll") ?? el.closest(".pc-page"))?.getBoundingClientRect();
    if (!bounds) {
      return;
    }
    const scale = el.getBoundingClientRect().width / el.offsetWidth || 1;
    const rect = text.getBoundingClientRect();
    const pad = EDGE_PADDING * scale;
    let shift = Math.min(0, bounds.right - pad - rect.right);
    shift += Math.max(0, bounds.left - (rect.left + shift));
    if (shift !== 0) {
      el.style.setProperty(SHIFT_VAR, `${shift / scale}px`);
    }
  },
  onMouseLeave: (event: MouseEvent<HTMLElement>): void => {
    event.currentTarget.classList.remove("pc-revealed");
    event.currentTarget.style.removeProperty(SHIFT_VAR);
  }
};
