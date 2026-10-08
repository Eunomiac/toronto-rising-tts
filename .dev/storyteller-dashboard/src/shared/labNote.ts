/** Click-to-comment design feedback pinned on a Lab sketch (dev-only Lab tab). */
export type LabNoteStatus = "open" | "done";

export type LabNote = {
  readonly id: number;
  readonly sketch: string;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly status: LabNoteStatus;
  /** Agent answer, written straight into the JSON file between rounds. */
  readonly reply?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type LabNoteFile = { readonly notes: readonly LabNote[] };

export type LabNoteCreate = { readonly sketch: string; readonly x: number; readonly y: number; readonly text: string };

export type LabNotePatch = { readonly text?: string; readonly status?: LabNoteStatus };

export const MAX_LAB_NOTE_LENGTH = 4000;
