/** Deep-merge for playerData JSON patches: objects merge; arrays and scalars replace.
 *  JSON `null` deletes the key (JSON Merge Patch style).
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const deepMerge = <T>(base: T, patch: unknown): T => {
  if (patch === undefined) {
    return base;
  }
  if (patch === null) {
    // Caller must delete; returning null signals wipe of this slot.
    return null as T;
  }
  if (Array.isArray(patch)) {
    return patch as T;
  }
  if (!isPlainObject(patch)) {
    return patch as T;
  }
  const baseRecord: Record<string, unknown> = isPlainObject(base) ? { ...base } : {};
  const out: Record<string, unknown> = { ...baseRecord };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      delete out[key];
      continue;
    }
    out[key] = deepMerge(baseRecord[key], value);
  }
  return out as T;
};
