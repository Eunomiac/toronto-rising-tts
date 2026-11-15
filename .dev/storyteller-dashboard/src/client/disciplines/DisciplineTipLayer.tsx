import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import {
  disciplineTipHtml,
  findDisciplineEntry,
  isDisciplineTermKey,
  loadDisciplinesCatalog,
  subscribeDisciplines,
  termKindFromKey,
  termNameFromKey
} from "./store.js";

const EDGE_MARGIN = 8;
const CURSOR_GAP = 18;

const termElement = (target: EventTarget | null): HTMLElement | null =>
  target instanceof Element ? target.closest<HTMLElement>("[data-term]") : null;

/** Hover tips for Power / Ritual / Ceremony names from the Disciplines catalog. */
export const DisciplineTipLayer = (): ReactElement | null => {
  const [html, setHtml] = useState<string | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLElement | null>(null);
  const pointer = useRef({ x: 0, y: 0 });

  const place = (): void => {
    const el = tipRef.current;
    if (!el) return;
    const { x, y } = pointer.current;
    const viewW = document.documentElement.clientWidth;
    const viewH = document.documentElement.clientHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const axis = (at: number, size: number, view: number): number => {
      let start = at + CURSOR_GAP;
      if (start + size > view - EDGE_MARGIN && at - CURSOR_GAP - size >= EDGE_MARGIN) {
        start = at - CURSOR_GAP - size;
      }
      return Math.max(EDGE_MARGIN, Math.min(start, view - EDGE_MARGIN - size));
    };
    el.style.left = `${axis(x, w, viewW)}px`;
    el.style.top = `${axis(y, h, viewH)}px`;
  };
  const placeRef = useRef(place);
  placeRef.current = place;

  useEffect(() => {
    loadDisciplinesCatalog().catch((error: unknown) => console.error("Disciplines catalog:", error));

    const refresh = (): void => {
      const el = hoverRef.current;
      const key = el?.dataset.term;
      // Power name inputs: tip while hovered, not while the field is focused for editing.
      if (!key || !isDisciplineTermKey(key) || el === document.activeElement) {
        setHtml(null);
        return;
      }
      const entry = findDisciplineEntry({
        kind: termKindFromKey(key),
        name: termNameFromKey(key),
        discipline: el?.dataset.discipline
      });
      setHtml(entry ? disciplineTipHtml(entry) : null);
    };

    const onOver = (event: MouseEvent): void => {
      const el = termElement(event.target);
      if (el === hoverRef.current) return;
      hoverRef.current = el;
      pointer.current = { x: event.clientX, y: event.clientY };
      refresh();
      placeRef.current();
    };
    const onMove = (event: MouseEvent): void => {
      if (hoverRef.current) {
        pointer.current = { x: event.clientX, y: event.clientY };
        placeRef.current();
      }
    };
    const onLeave = (event: MouseEvent): void => {
      if (event.relatedTarget === null) {
        hoverRef.current = null;
        setHtml(null);
      }
    };
    const onFocusChange = (): void => {
      refresh();
    };

    const unsubscribe = subscribeDisciplines(refresh);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseout", onLeave);
    document.addEventListener("focusin", onFocusChange);
    document.addEventListener("focusout", onFocusChange);
    return () => {
      unsubscribe();
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseout", onLeave);
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
    };
  }, []);

  useLayoutEffect(() => place(), [html]);

  return createPortal(
    <div
      ref={tipRef}
      className={`discipline-tip${html ? " on" : ""}`}
      aria-hidden="true"
      {...(html ? { dangerouslySetInnerHTML: { __html: html } } : {})}
    />,
    document.body
  );
};
