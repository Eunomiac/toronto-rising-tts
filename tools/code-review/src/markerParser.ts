/**
 * Parses Toronto Rising pipeline region markers from a `.ttslua` source file.
 */
export type ParsedRegion = {
  regionNum: number;
  title: string;
  startLine: number;
  endLine: number;
  parentRegionNum: number | null;
  children: ParsedRegion[];
};

export type ParsedMarkerFile = {
  file: string;
  lineCount: number;
  roots: ParsedRegion[];
  flat: ParsedRegion[];
};

const REGION_OPEN = /^\s*--\s*#region\s+::==\s*\[(\d+)\]\s*(.+)\s+==::\s*$/u;
const REGION_CLOSE = /^\s*--\s*#endregion\s+::==\s*\[(\d+)\]\s*==::\s*$/u;

type StackEntry = {
  node: ParsedRegion;
};

/**
 * Parses markers and builds a region tree for one file.
 * Returns a structured result plus human-readable errors (empty when valid).
 */
export function parseMarkerFile(file: string, content: string): {
  parsed: ParsedMarkerFile | null;
  errors: string[];
} {
  const errors: string[] = [];
  const lines = content.split(/\r?\n/);
  /**
   * Editors typically append a final newline, which would otherwise create a trailing
   * empty line after the closing `#endregion`. That line is outside any region, so we
   * strip **only** empty trailing lines before validation.
   */
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  const lineCount = lines.length;
  const roots: ParsedRegion[] = [];
  const stack: StackEntry[] = [];
  const seenOpen = new Set<number>();

  const pushError = (lineNo: number, message: string): void => {
    errors.push(`${file}:${lineNo}: ${message}`);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const line = lines[i] ?? "";

    const openMatch = line.match(REGION_OPEN);
    const closeMatch = line.match(REGION_CLOSE);

    if (openMatch && closeMatch) {
      pushError(lineNo, "Line matches both #region and #endregion patterns.");
      continue;
    }

    if (openMatch) {
      const regionNum = Number(openMatch[1]);
      const rawTitle = openMatch[2] ?? "";
      const title = rawTitle.trim();
      if (!Number.isInteger(regionNum) || regionNum <= 0) {
        pushError(lineNo, `Invalid region number: ${openMatch[1]}`);
        continue;
      }
      if (seenOpen.has(regionNum)) {
        pushError(lineNo, `Duplicate #region open for id [${String(regionNum)}] in this file.`);
        continue;
      }
      if (title.length === 0) {
        pushError(lineNo, "Region title is empty.");
        continue;
      }

      seenOpen.add(regionNum);
      const parentEntry = stack[stack.length - 1];
      const parent = parentEntry?.node ?? null;
      const node: ParsedRegion = {
        regionNum,
        title,
        startLine: lineNo,
        endLine: -1,
        parentRegionNum: parent?.regionNum ?? null,
        children: [],
      };
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
      stack.push({ node });
      continue;
    }

    if (closeMatch) {
      const regionNum = Number(closeMatch[1]);
      if (!Number.isInteger(regionNum) || regionNum <= 0) {
        pushError(lineNo, `Invalid region number on #endregion: ${closeMatch[1]}`);
        continue;
      }
      const top = stack.pop();
      if (!top) {
        pushError(lineNo, `#endregion [${String(regionNum)}] does not match any open #region (stack empty).`);
        continue;
      }
      if (top.node.regionNum !== regionNum) {
        pushError(
          lineNo,
          `#endregion [${String(regionNum)}] mismatches open [#${String(top.node.regionNum)}] (expected closing in LIFO order).`,
        );
        stack.push(top);
        continue;
      }
      top.node.endLine = lineNo;
      continue;
    }
  }

  if (stack.length > 0) {
    const dangling = stack
      .map((entry) => entry.node.regionNum)
      .reverse()
      .join(", ");
    errors.push(`${file}: EOF: Unclosed #region markers (still open): ${dangling}`);
  }

  if (errors.length > 0) {
    return { parsed: null, errors };
  }

  const flat = flattenRegions(roots);
  for (const region of flat) {
    if (region.endLine < 0) {
      errors.push(`${file}: Internal error: region [${String(region.regionNum)}] missing endLine.`);
    }
  }
  if (errors.length > 0) {
    return { parsed: null, errors };
  }

  validateStructuralRules(file, lineCount, roots, errors);
  if (errors.length > 0) {
    return { parsed: null, errors };
  }

  return { parsed: { file, lineCount, roots, flat }, errors: [] };
}

function flattenRegions(roots: ParsedRegion[]): ParsedRegion[] {
  const out: ParsedRegion[] = [];
  const visit = (node: ParsedRegion): void => {
    out.push(node);
    for (const child of node.children) {
      visit(child);
    }
  };
  for (const root of roots) {
    visit(root);
  }
  return out;
}

function validateStructuralRules(
  file: string,
  lineCount: number,
  roots: ParsedRegion[],
  errors: string[],
): void {
  const push = (message: string): void => {
    errors.push(`${file}: ${message}`);
  };

  if (roots.length === 0) {
    if (lineCount > 0) {
      push("File has content but defines no root #region blocks.");
    }
    return;
  }

  const orderedRoots = [...roots].sort((a, b) => a.startLine - b.startLine);
  if (orderedRoots[0]?.startLine !== 1) {
    push(`First root #region must start on line 1 (found line ${String(orderedRoots[0]?.startLine)}).`);
  }
  const lastRoot = orderedRoots[orderedRoots.length - 1];
  if (lastRoot && lastRoot.endLine !== lineCount) {
    push(`Last root #endregion must end on the final line (${String(lineCount)}) (found line ${String(lastRoot.endLine)}).`);
  }

  for (let i = 0; i < orderedRoots.length - 1; i += 1) {
    const current = orderedRoots[i];
    const next = orderedRoots[i + 1];
    if (!current || !next) {
      continue;
    }
    if (current.endLine + 1 !== next.startLine) {
      push(
        `Root regions must be directly adjacent: end of [${String(current.regionNum)}] is line ${String(current.endLine)}, next root [${String(next.regionNum)}] starts line ${String(next.startLine)}.`,
      );
    }
  }

  for (const root of orderedRoots) {
    validateRegionSubtree(file, root, push);
  }
}

function validateRegionSubtree(file: string, region: ParsedRegion, push: (message: string) => void): void {
  if (region.children.length === 0) {
    return;
  }

  const orderedChildren = [...region.children].sort((a, b) => a.startLine - b.startLine);
  const first = orderedChildren[0];
  const last = orderedChildren[orderedChildren.length - 1];
  if (!first || !last) {
    push(`Region [${String(region.regionNum)}] declares children but none parsed.`);
    return;
  }

  if (region.startLine + 1 !== first.startLine) {
    push(
      `Strict adjacency: line after parent open [${String(region.regionNum)}] must be first child open (expected line ${String(region.startLine + 1)}, found ${String(first.startLine)}).`,
    );
  }

  if (last.endLine + 1 !== region.endLine) {
    push(
      `Strict adjacency: line after last child close must be parent close for [${String(region.regionNum)}] (expected parent end on line ${String(last.endLine + 1)}, found ${String(region.endLine)}).`,
    );
  }

  for (let i = 0; i < orderedChildren.length - 1; i += 1) {
    const current = orderedChildren[i];
    const next = orderedChildren[i + 1];
    if (!current || !next) {
      continue;
    }
    if (current.endLine + 1 !== next.startLine) {
      push(
        `Strict adjacency: sibling regions under [${String(region.regionNum)}] must be adjacent: [${String(current.regionNum)}] ends ${String(current.endLine)}, next [${String(next.regionNum)}] starts ${String(next.startLine)}.`,
      );
    }
  }

  for (const child of orderedChildren) {
    validateRegionSubtree(file, child, push);
  }
}
