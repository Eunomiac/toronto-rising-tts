import { useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { masonryLayout } from "./masonryLayout.js";

export type MasonryItem = { readonly key: string; readonly node: ReactNode };

type Props = {
  readonly items: readonly MasonryItem[];
  readonly columns: number;
  readonly columnGap: number;
  readonly rowGap: number;
};

const sameHeights = (a: readonly (readonly number[])[], b: readonly (readonly number[])[]): boolean =>
  a.length === b.length && a.every((row, i) => row.length === b[i]?.length && row.every((h, s) => h === b[i]?.[s]));

/**
 * Box grid that measures every box at each possible span (in a hidden copy), then positions the
 * real boxes with `masonryLayout`. Gaps are in CSS pixels of the unscaled page.
 */
export const Masonry = ({ items, columns, columnGap, rowGap }: Props): ReactElement => {
  const host = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<readonly (readonly number[])[]>([]);
  const [, setFontsLoaded] = useState(0);

  const cols = Math.min(columns, items.length);
  const colWidth = cols > 0 ? (width - columnGap * (cols - 1)) / cols : 0;
  const spanWidth = (span: number): number => colWidth * span + columnGap * (span - 1);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) {
      return undefined;
    }
    const update = (): void => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const remeasure = (): void => setFontsLoaded((n) => n + 1);
    document.fonts.addEventListener("loadingdone", remeasure);
    return () => document.fonts.removeEventListener("loadingdone", remeasure);
  }, []);

  // Runs after every render: content edits change heights without changing keys.
  useLayoutEffect(() => {
    const layer = measure.current;
    if (!layer || width === 0) {
      return;
    }
    const next = items.map((_, i) =>
      Array.from({ length: cols }, (_, s) => (layer.children[i * cols + s] as HTMLElement | undefined)?.offsetHeight ?? 0));
    setHeights((prev) => (sameHeights(prev, next) ? prev : next));
  });

  const ready = width > 0 && heights.length === items.length && heights.every((row) => row.length === cols);
  const layout = ready ? masonryLayout(heights, columns, rowGap) : null;

  return (
    <div ref={host} className="pc-masonry" style={{ height: layout?.height ?? 0 }}>
      <div ref={measure} className="pc-masonry-measure" aria-hidden="true" inert>
        {width > 0
          ? items.flatMap((item) => Array.from({ length: cols }, (_, s) => (
            <div key={`${item.key}:${s}`} style={{ width: spanWidth(s + 1) }}>{item.node}</div>
          )))
          : null}
      </div>
      {layout
        ? items.map((item, i) => {
          const box = layout.placements[i];
          return box ? (
            <div
              key={item.key}
              className="pc-masonry-item"
              style={{ left: box.col * (colWidth + columnGap), top: box.top, width: spanWidth(box.span), height: box.height }}
            >
              {item.node}
            </div>
          ) : null;
        })
        : null}
    </div>
  );
};
