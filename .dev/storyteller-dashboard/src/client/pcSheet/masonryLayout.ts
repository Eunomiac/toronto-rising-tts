export type MasonryPlacement = {
  readonly col: number;
  readonly span: number;
  readonly top: number;
  readonly height: number;
};

export type MasonryLayout = {
  readonly columns: number;
  readonly placements: readonly MasonryPlacement[];
  readonly height: number;
};

/**
 * Packs boxes into at most `maxColumns` columns, favouring horizontal growth to save height.
 * `heights[i][s - 1]` is box i's natural height when it spans s columns.
 *
 * 1. Tallest first, each into the shortest column.
 * 2. Each column's bottom box (highest first) widens into neighbouring columns that end above it.
 * 3. Every box stretches down to the box beneath it, or to the bottom of the grid.
 */
export const masonryLayout = (
  heights: readonly (readonly number[])[],
  maxColumns: number,
  rowGap: number
): MasonryLayout => {
  const columns = Math.min(maxColumns, heights.length);
  if (columns === 0) {
    return { columns: 0, placements: [], height: 0 };
  }
  const natural = (i: number, span: number): number => heights[i]?.[span - 1] ?? 0;
  const placed: MasonryPlacement[] = [];
  const bottoms: number[] = Array.from({ length: columns }, () => 0);
  const lastInColumn: number[] = Array.from({ length: columns }, () => -1);

  const order = heights.map((_, i) => i).sort((a, b) => natural(b, 1) - natural(a, 1) || a - b);
  for (const i of order) {
    let col = 0;
    for (let c = 1; c < columns; c += 1) {
      if ((bottoms[c] ?? 0) < (bottoms[col] ?? 0)) {
        col = c;
      }
    }
    const top = lastInColumn[col] === -1 ? 0 : (bottoms[col] ?? 0) + rowGap;
    placed[i] = { col, span: 1, top, height: natural(i, 1) };
    bottoms[col] = top + natural(i, 1);
    lastInColumn[col] = i;
  }

  const freeAt = (col: number, top: number): boolean => (bottoms[col] ?? 0) + rowGap <= top;
  const candidates = [...new Set(lastInColumn)].sort((a, b) => (placed[a]?.top ?? 0) - (placed[b]?.top ?? 0));
  for (const i of candidates) {
    const box = placed[i];
    if (!box || lastInColumn[box.col] !== i) {
      continue;
    }
    let first = box.col;
    let last = box.col;
    while (last + 1 < columns && freeAt(last + 1, box.top)) {
      last += 1;
    }
    while (first > 0 && freeAt(first - 1, box.top)) {
      first -= 1;
    }
    if (first === last) {
      continue;
    }
    const span = last - first + 1;
    const widened = { col: first, span, top: box.top, height: natural(i, span) };
    placed[i] = widened;
    for (let c = first; c <= last; c += 1) {
      bottoms[c] = widened.top + widened.height;
      lastInColumn[c] = i;
    }
  }

  const height = Math.max(...placed.map((box) => box.top + box.height));
  const overlaps = (a: MasonryPlacement, b: MasonryPlacement): boolean => a.col < b.col + b.span && b.col < a.col + a.span;
  const placements = placed.map((box, i) => {
    let limit = height;
    placed.forEach((other, j) => {
      if (j !== i && other.top > box.top && overlaps(box, other)) {
        limit = Math.min(limit, other.top - rowGap);
      }
    });
    return { ...box, height: Math.max(box.height, limit - box.top) };
  });
  return { columns, placements, height };
};
