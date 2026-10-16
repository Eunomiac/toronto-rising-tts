import { gsap } from "gsap";
import { useLayoutEffect, useMemo, useRef, type ReactElement } from "react";
import { dragHelpTitle, helpBulletsFor } from "./helpLegend";
import type { DragKind } from "./types";

type Props = {
  readonly dragKind: DragKind;
  readonly open: boolean;
};

/**
 * Upper-strip legend: lists every meaningful drop for the active drag.
 * Sits over When / Weather / Sound (nothing is dropped there).
 */
export const DragHelpPanel = ({ dragKind, open }: Props): ReactElement => {
  const rootRef = useRef<HTMLDivElement>(null);
  const bullets = useMemo(() => helpBulletsFor(dragKind), [dragKind]);
  const title = dragHelpTitle(dragKind);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) {
      return;
    }
    const ctx = gsap.context(() => {
      if (open) {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: -18 },
          { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out", overwrite: "auto" }
        );
      } else {
        gsap.to(el, {
          autoAlpha: 0,
          y: -12,
          duration: 0.16,
          ease: "power2.in",
          overwrite: "auto"
        });
      }
    }, el);
    return () => ctx.revert();
  }, [open, dragKind]);

  return (
    <div
      ref={rootRef}
      className="tr-dnd-help"
      aria-hidden={!open}
      aria-live="polite"
    >
      <header className="tr-dnd-help__head">
        <p className="tr-dnd-help__eyebrow">Drop guide</p>
        <h2 className="tr-dnd-help__title">{title}</h2>
      </header>
      <ul className="tr-dnd-help__list">
        {bullets.map((bullet) => (
          <li key={`${bullet.drop}:${bullet.text}`} className="tr-dnd-help__item">
            <span className="tr-dnd-help__where">{bullet.dropLabel}</span>
            <span className="tr-dnd-help__what">{bullet.text}</span>
          </li>
        ))}
      </ul>
      {bullets.length === 0 && <p className="tr-dnd-help__empty">No drop targets for this drag.</p>}
    </div>
  );
};
