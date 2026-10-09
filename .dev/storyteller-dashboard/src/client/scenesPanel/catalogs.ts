/** Shapes of `data/scene-catalogs.json` and `data/control-board-snaps.json` (generated from the TTS save and Lua catalogs). */

export type CatalogCharacter = {
  readonly characterKey: string;
  readonly fullName: string;
  readonly isPC: boolean;
  readonly groups: readonly string[];
  readonly groupRanks?: Readonly<Record<string, number>>;
  readonly pickerGroups: readonly string[];
};

export type CatalogSite = {
  readonly key: string;
  readonly name: string;
  readonly districtKey: string | null;
  readonly lightMode: string | null;
  readonly topFog: boolean | null;
  readonly isIndoors: boolean | null;
  readonly skybox: string | null;
  readonly locationTrack: string | null;
  readonly conditions: readonly string[];
};

export type MemoriamPeriod = {
  /** Skybox key the Memoriam payload sends (`lucien2`, …). */
  readonly key: string;
  /** Memoriam PC keys (`lucien`, `rashid`, `aishe`, `fomorach`, `blackCaesar`). */
  readonly characters: readonly string[];
  readonly startYear: number;
  readonly endYear: number;
  readonly location: string;
  readonly panels: readonly { readonly key: string; readonly display: string }[];
};

export type SceneCatalogs = {
  readonly generatedBy: string;
  readonly playerColors: readonly ("Brown" | "Orange" | "Red" | "Pink" | "Purple")[];
  readonly npcSeats: readonly string[];
  readonly pcs: readonly CatalogCharacter[];
  readonly namedNpcs: readonly CatalogCharacter[];
  readonly districts: readonly { readonly key: string; readonly name: string; readonly conditions: readonly string[] }[];
  readonly sites: readonly CatalogSite[];
  readonly tables: readonly { readonly key: string; readonly slotCapacity: number }[];
  readonly lightModes: readonly string[];
  readonly skyboxes: readonly { readonly key: string; readonly display: string }[];
  /** Memoriam periods (`SkyboxesCatalog.MemoriamSkyboxes`), earliest first. */
  readonly memoriamPeriods: readonly MemoriamPeriod[];
  readonly locationTracks: readonly { readonly key: string; readonly id: string }[];
  readonly backgroundMoods: readonly string[];
  readonly weatherConditions: readonly {
    readonly key: string;
    readonly label: string;
    readonly rain: string | null;
    readonly wind: string | null;
    readonly thunderEnabled: boolean;
  }[];
  readonly conditions: readonly { readonly id: string; readonly displayName: string }[];
  readonly pickerGroupLabels: Readonly<Record<string, string>>;
};

export type PolarSnap = {
  readonly snapIndex: number;
  readonly snapKind: "polar";
  readonly ringIndex: number;
  readonly rayIndex: number;
  readonly familyId: string;
  readonly familyK: number;
  readonly isAnchor: boolean;
  readonly u: number;
  readonly v: number;
  readonly defaultLightMode: string;
};

export type SeatSnap = {
  readonly snapIndex: number;
  readonly snapKind: "seat";
  readonly seatKey: string;
  readonly kind: "pc" | "npc" | string;
  readonly tableSlot: number;
  readonly u: number;
  readonly v: number;
};

export type ScatterSlot = {
  readonly slot: number;
  readonly u: number;
  readonly v: number;
};

export type StageBoardFingerprint = {
  readonly guid: string;
  readonly saveFileName: string;
  readonly source: string;
  readonly posX: number;
  readonly posZ: number;
  readonly scaleX: number;
  readonly scaleZ: number;
  readonly rotY: number;
  readonly halfWidthX: number;
  readonly halfDepthZ: number;
  readonly liveScaleZ?: number;
  readonly impliedScaleZ?: number;
  readonly controlScaleX?: number;
  readonly controlScaleZ?: number;
  readonly minimapRatioX?: number;
  readonly minimapRatioZ?: number;
};

export type ControlBoardSnaps = {
  readonly generatedBy: string;
  readonly stageBoard?: StageBoardFingerprint;
  readonly polar: readonly PolarSnap[];
  readonly seats: readonly SeatSnap[];
  readonly scatter: {
    readonly areaOrder: readonly string[];
    readonly areas: Record<
      string,
      {
        readonly origin: { readonly u: number; readonly v: number };
        readonly center: readonly ScatterSlot[];
        readonly orbit: readonly ScatterSlot[];
      }
    >;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseControlBoardSnaps = (value: unknown): ControlBoardSnaps => {
  if (!isRecord(value) || !Array.isArray(value.polar) || !Array.isArray(value.seats)) {
    throw new Error("control-board-snaps.json is missing polar/seats arrays.");
  }
  return value as ControlBoardSnaps;
};

const familyMeanU = (snaps: ControlBoardSnaps, familyId: string): number => {
  const members = snaps.polar.filter((snap) => snap.familyId === familyId);
  return members.length === 0 ? 0.5 : members.reduce((sum, member) => sum + member.u, 0) / members.length;
};

const centerFamilyIdOnRing = (snaps: ControlBoardSnaps, ringIndex: number): string | null => {
  const ids = [...new Set(snaps.polar.filter((snap) => snap.ringIndex === ringIndex).map((snap) => snap.familyId))];
  let best: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const id of ids) {
    const dist = Math.abs(familyMeanU(snaps, id) - 0.5);
    if (dist < bestDist) {
      best = id;
      bestDist = dist;
    }
  }
  return best;
};

/** The painted area name of a polar pack (`CENTER`, `Mid Left`, `Far Right`, …); matches the in-game snap CSV. */
export const polarAreaNameForFamily = (snaps: ControlBoardSnaps, familyId: string): string => {
  const ringIndex = snaps.polar.find((snap) => snap.familyId === familyId)?.ringIndex;
  if (ringIndex === 3) {
    return "Far Left";
  }
  if (ringIndex === 6) {
    return "Far Right";
  }
  if (ringIndex === 4) {
    return "Far Center-Left";
  }
  if (ringIndex === 5) {
    return "Far Center-Right";
  }
  if (ringIndex === 1 || ringIndex === 2) {
    const centerId = centerFamilyIdOnRing(snaps, ringIndex);
    if (familyId === centerId) {
      return ringIndex === 1 ? "CENTER" : "Mid Center";
    }
    if (familyMeanU(snaps, familyId) < (centerId ? familyMeanU(snaps, centerId) : 0.5)) {
      return ringIndex === 1 ? "Center Left" : "Mid Left";
    }
    return ringIndex === 1 ? "Center Right" : "Mid Right";
  }
  return familyId;
};
