/**
 * When several token backs are the same pixels, keep the alphabetically first NPC's file and point the others at it.
 * Lives outside model.ts so a change here does not change the token cache key and redraw every token.
 * A later redraw that changes one name or silhouette gives that NPC its own file again.
 */
export const tokenBackShareMap = (files: readonly { readonly key: string; readonly sha1: string }[]): Map<string, string> => {
  const byHash = new Map<string, string[]>();
  for (const file of files) {
    const keys = byHash.get(file.sha1) ?? [];
    keys.push(file.key);
    byHash.set(file.sha1, keys);
  }
  const shares = new Map<string, string>();
  for (const keys of byHash.values()) {
    if (keys.length < 2) continue;
    const canonical = [...keys].sort((a, b) => a.localeCompare(b))[0]!;
    for (const key of keys) {
      if (key !== canonical) shares.set(key, canonical);
    }
  }
  return shares;
};
