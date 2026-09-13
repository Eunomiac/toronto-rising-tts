import type { ControlBoardSnaps, PolarToken } from "./types.js";

const protectedCenterFamilyId = (snaps: ControlBoardSnaps): string | null => {
  const ring1 = snaps.polar.filter((snap) => snap.ringIndex === 1 && snap.isAnchor);
  const first = ring1[0];
  if (!first) {
    return null;
  }
  let best = first;
  let bestDist = Math.abs(best.u - 0.5);
  for (const snap of ring1) {
    const dist = Math.abs(snap.u - 0.5);
    if (dist < bestDist) {
      best = snap;
      bestDist = dist;
    }
  }
  return best.familyId;
};

const evictionPriority = (snaps: ControlBoardSnaps, destFamilyId: string): string[] => {
  const protectedId = protectedCenterFamilyId(snaps);
  const families = new Map<string, { ringIndex: number; u: number }>();
  for (const snap of snaps.polar) {
    if (!snap.isAnchor) {
      continue;
    }
    families.set(snap.familyId, { ringIndex: snap.ringIndex, u: snap.u });
  }
  const soleOnRing = (ringIndex: number): string | null => {
    const ids = [...families.entries()].filter(([, row]) => row.ringIndex === ringIndex).map(([id]) => id);
    return ids.length === 1 ? ids[0] ?? null : null;
  };
  const out: string[] = [];
  const push = (id: string | null): void => {
    if (id && id !== destFamilyId && id !== protectedId && !out.includes(id)) {
      out.push(id);
    }
  };
  push(soleOnRing(3));
  push(soleOnRing(6));
  push(soleOnRing(4));
  push(soleOnRing(5));
  const mid = [...families.entries()]
    .filter(([, row]) => row.ringIndex === 2)
    .sort((a, b) => a[1].u - b[1].u);
  if (mid[0]) {
    push(mid[0][0]);
  }
  if (mid.length > 1) {
    const last = mid[mid.length - 1];
    if (last) {
      push(last[0]);
    }
  }
  const center = [...families.entries()]
    .filter(([, row]) => row.ringIndex === 1)
    .sort((a, b) => a[1].u - b[1].u);
  for (const [id] of center) {
    push(id);
  }
  for (const id of families.keys()) {
    push(id);
  }
  return out;
};

const familySnaps = (snaps: ControlBoardSnaps, familyId: string) =>
  snaps.polar.filter((snap) => snap.familyId === familyId).sort((a, b) => Math.abs(a.familyK) - Math.abs(b.familyK) || a.familyK - b.familyK);

export const polarTokensInFamily = (
  tokens: PolarToken[],
  familyId: string,
  snaps: ControlBoardSnaps
): PolarToken[] =>
  tokens.filter((token) => {
    const snap = snaps.polar.find((row) => row.snapIndex === token.snapIndex);
    return snap?.familyId === familyId;
  });

export const relocatePolarFamily = (
  tokens: PolarToken[],
  sourceFamilyId: string,
  destFamilyId: string,
  snaps: ControlBoardSnaps
): PolarToken[] => {
  if (sourceFamilyId === destFamilyId) {
    return tokens;
  }
  const destOccupied = tokens.filter((token) => {
    const snap = snaps.polar.find((row) => row.snapIndex === token.snapIndex);
    return snap?.familyId === destFamilyId;
  });
  const sourceTokens = tokens.filter((token) => {
    const snap = snaps.polar.find((row) => row.snapIndex === token.snapIndex);
    return snap?.familyId === sourceFamilyId;
  });
  const next = tokens.map((token) => ({ ...token }));
  const occupied = new Set(next.map((token) => token.snapIndex));

  const moveToken = (characterKey: string, snapIndex: number, light?: PolarToken["npcLightMode"]): void => {
    const row = next.find((token) => token.characterKey === characterKey);
    if (!row) {
      return;
    }
    occupied.delete(row.snapIndex);
    row.snapIndex = snapIndex;
    occupied.add(snapIndex);
    if (light) {
      row.npcLightMode = light;
    }
  };

  if (destOccupied.length > 0) {
    const priority = evictionPriority(snaps, destFamilyId);
    let moveIndex = 0;
    for (const familyId of priority) {
      const empty = familySnaps(snaps, familyId).filter((snap) => !occupied.has(snap.snapIndex));
      for (const snap of empty) {
        const occupant = destOccupied[moveIndex];
        if (!occupant) {
          break;
        }
        moveToken(occupant.characterKey, snap.snapIndex, "OFF");
        moveIndex += 1;
      }
      if (moveIndex >= destOccupied.length) {
        break;
      }
    }
  }

  const destEmpty = familySnaps(snaps, destFamilyId).filter((snap) => !occupied.has(snap.snapIndex));
  const limit = Math.min(sourceTokens.length, destEmpty.length);
  for (let i = 0; i < limit; i += 1) {
    const mover = sourceTokens[i];
    const dest = destEmpty[i];
    if (!mover || !dest) {
      break;
    }
    moveToken(mover.characterKey, dest.snapIndex);
  }
  return next;
};

export const placeKeysOnPolarFamily = (
  tokens: PolarToken[],
  keys: readonly string[],
  destFamilyId: string,
  snaps: ControlBoardSnaps
): PolarToken[] => {
  const uniqueKeys = [...new Set(keys.filter((key) => key.trim() !== ""))];
  if (uniqueKeys.length === 0) {
    return tokens;
  }
  const next = tokens
    .filter((token) => !uniqueKeys.includes(token.characterKey))
    .map((token) => ({ ...token }));
  const destOccupied = next.filter((token) => {
    const snap = snaps.polar.find((row) => row.snapIndex === token.snapIndex);
    return snap?.familyId === destFamilyId;
  });
  const occupied = new Set(next.map((token) => token.snapIndex));
  const moveToken = (characterKey: string, snapIndex: number, light?: PolarToken["npcLightMode"]): void => {
    const row = next.find((token) => token.characterKey === characterKey);
    if (!row) {
      return;
    }
    occupied.delete(row.snapIndex);
    row.snapIndex = snapIndex;
    occupied.add(snapIndex);
    if (light) {
      row.npcLightMode = light;
    }
  };
  if (destOccupied.length > 0) {
    const priority = evictionPriority(snaps, destFamilyId);
    let moveIndex = 0;
    for (const familyId of priority) {
      const empty = familySnaps(snaps, familyId).filter((snap) => !occupied.has(snap.snapIndex));
      for (const snap of empty) {
        const occupant = destOccupied[moveIndex];
        if (!occupant) {
          break;
        }
        moveToken(occupant.characterKey, snap.snapIndex, "OFF");
        moveIndex += 1;
      }
      if (moveIndex >= destOccupied.length) {
        break;
      }
    }
  }
  const destSnaps = familySnaps(snaps, destFamilyId);
  const limit = Math.min(uniqueKeys.length, destSnaps.length);
  for (let i = 0; i < limit; i += 1) {
    const key = uniqueKeys[i];
    const dest = destSnaps[i];
    if (!key || !dest) {
      break;
    }
    const existing = next.find((token) => token.snapIndex === dest.snapIndex);
    if (existing) {
      continue;
    }
    next.push({
      characterKey: key,
      snapIndex: dest.snapIndex,
      npcLightMode: dest.defaultLightMode === "STANDARD" ? "STANDARD" : "OFF"
    });
  }
  return next;
};
