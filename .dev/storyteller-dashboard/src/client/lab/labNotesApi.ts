import type { LabNote, LabNoteCreate, LabNoteFile, LabNotePatch } from "../../shared/labNote";

const request = async (method: string, query: string, body?: unknown): Promise<readonly LabNote[]> => {
  const response = await fetch(`/api/lab-notes${query}`, {
    method,
    ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {})
  });
  const json = (await response.json()) as LabNoteFile & { error?: string };
  if (!response.ok) {
    throw new Error(json.error ?? `Lab notes request failed (${response.status}).`);
  }
  return json.notes;
};

export const listLabNotes = (): Promise<readonly LabNote[]> => request("GET", "");
export const addLabNote = (note: LabNoteCreate): Promise<readonly LabNote[]> => request("POST", "", note);
export const patchLabNote = (id: number, patch: LabNotePatch): Promise<readonly LabNote[]> => request("PATCH", `?id=${id}`, patch);
export const deleteLabNote = (id: number): Promise<readonly LabNote[]> => request("DELETE", `?id=${id}`);
