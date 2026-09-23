/** Deep-merge for sheet JSON patches: objects merge; arrays and scalars replace. */
export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const deepMerge = <T>(base: T, patch: unknown): T => {
  if (patch === undefined) {
    return base;
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
    out[key] = deepMerge(baseRecord[key], value);
  }
  return out as T;
};
