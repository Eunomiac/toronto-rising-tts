export type DebugNoteStatus = 'open' | 'done';

export type MapNoteAnchor = {
  readonly kind: 'map';
  readonly longitude: number;
  readonly latitude: number;
};

export type InterfaceNoteAnchor = {
  readonly kind: 'interface';
  readonly surface: string;
  readonly x: number;
  readonly y: number;
};

export type DebugNoteAnchor = MapNoteAnchor | InterfaceNoteAnchor;

export type DebugNoteContext = {
  readonly url: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly selectedDistrict: string | null;
  readonly map?: {
    readonly center: readonly [number, number];
    readonly zoom: number;
  };
};

export type DebugNote = {
  readonly id: number;
  readonly anchor: DebugNoteAnchor;
  readonly text: string;
  readonly status: DebugNoteStatus;
  /** Agent answer, written directly into the tracked note file between rounds. */
  readonly reply?: string;
  readonly context: DebugNoteContext;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DebugNoteFile = {
  readonly nextId: number;
  readonly notes: readonly DebugNote[];
};

export type DebugNoteCreate = Pick<DebugNote, 'anchor' | 'text' | 'context'>;
export type DebugNotePatch = Partial<Pick<DebugNote, 'text' | 'status' | 'reply'>>;

export const MAX_DEBUG_NOTE_LENGTH = 4000;
