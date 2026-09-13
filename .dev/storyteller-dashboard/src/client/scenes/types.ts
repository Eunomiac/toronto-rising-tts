export type PlacementMode = "standard" | "scatter";

export type PlayerColor = "Brown" | "Orange" | "Red" | "Pink" | "Purple";

export type NpcLightMode = "OFF" | "STANDARD";

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
};

export type SceneCatalogs = {
  readonly generatedBy: string;
  readonly playerColors: readonly PlayerColor[];
  readonly npcSeats: readonly string[];
  readonly pcs: readonly CatalogCharacter[];
  readonly namedNpcs: readonly CatalogCharacter[];
  readonly districts: readonly { readonly key: string; readonly name: string }[];
  readonly sites: readonly CatalogSite[];
  readonly tables: readonly { readonly key: string; readonly slotCapacity: number }[];
  readonly lightModes: readonly string[];
  readonly skyboxes: readonly { readonly key: string; readonly display: string }[];
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
  readonly defaultLightMode: NpcLightMode | string;
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

export type ControlBoardSnaps = {
  readonly generatedBy: string;
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

export type SeatSlotRow = {
  characterKey: string;
  isPlayingNPC: boolean;
  isPresent: boolean;
  tableSlot?: number;
  npcCharacterKey?: string;
  absentFromSession?: boolean;
  slotEmpty?: boolean;
};

export type PolarToken = {
  characterKey: string;
  snapIndex: number;
  npcLightMode: NpcLightMode;
};

export type ScatterCenterRow = {
  slot: number;
  isPlayingNPC: boolean;
  isPresent: boolean;
  characterKey?: string;
};

export type ScatterOrbitRow = {
  slot: number;
  npcLightMode: NpcLightMode;
};

export type ScatterAreaDraft = {
  centerCharacters: Record<string, ScatterCenterRow>;
  orbitCharacters: Record<string, ScatterOrbitRow>;
};

export type SceneDraft = {
  sceneKey: string;
  title: string;
  placementMode: PlacementMode;
  tableKey: string;
  lightingPresetKey: string;
  isTopFogActive: boolean;
  districtKey: string;
  siteKey: string;
  skyboxOverride: string;
  clockPresentDay: boolean;
  clockYear: number;
  clockMonth: number;
  clockDay: number;
  clockHour: number;
  clockMinute: number;
  conditions: string[];
  locationTrack: string;
  backgroundMood: string;
  weatherKey: string;
  weatherRain: "none" | "rainLight" | "rainHeavy";
  weatherWind: "none" | "low" | "med" | "max";
  weatherThunder: boolean;
  weatherSnow: "none" | "light" | "medium" | "heavy";
  standard: {
    seatSlots: Record<string, SeatSlotRow>;
    polar: PolarToken[];
    paletteNpcKeys: string[];
  };
  scatter: {
    areas: Record<string, ScatterAreaDraft>;
    paletteNpcKeys: string[];
  };
};
