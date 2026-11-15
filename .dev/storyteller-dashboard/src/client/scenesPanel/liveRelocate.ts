import type { LibraryScene } from "../../shared/sceneLibrary";
import type { LabLocation } from "./glance";
import type { SeatingEdit } from "./transitionSeating";

/** Library row with a new district/site, ready for the seating strip before a relocate fork. */
export const withLocation = (row: LibraryScene, location: LabLocation): LibraryScene => ({
  ...row,
  sessionScene: {
    ...row.sessionScene,
    districtKey: location.districtKey,
    siteKey: location.siteKey,
    // Drop a skybox override so the new site's skybox wins on play.
    skyboxOverride: undefined
  }
});

/** Title for the forked scene at the new site (`Base — Site`, numbered when taken). */
export const relocateTitle = (base: string, siteName: string, titles: readonly string[]): string => {
  const stem = siteName.trim() ? `${base} — ${siteName.trim()}` : base;
  if (!titles.includes(stem)) {
    return stem;
  }
  let n = 2;
  while (titles.includes(`${stem} (${n})`)) {
    n += 1;
  }
  return `${stem} (${n})`;
};

/** Next free fork key (`base_2`, `_3`, …) given the keys already in the library. */
export const nextForkKey = (base: string, keys: ReadonlySet<string>): string => {
  let n = 2;
  let candidate = `${base}_${n}`;
  while (keys.has(candidate)) {
    n += 1;
    candidate = `${base}_${n}`;
  }
  return candidate;
};

/**
 * Forked ongoing library row at the new location: new key/title, seating from the strip when it changed,
 * linked for write-back. The prior row is left for the caller to unlink.
 */
export const buildRelocatedScene = (
  live: LibraryScene,
  location: LabLocation,
  newKey: string,
  newTitle: string,
  edit?: SeatingEdit
): LibraryScene => {
  const relocated = withLocation(
    { ...live, key: newKey, title: newTitle, status: "ongoing", linked: true },
    location
  );
  return edit ? edit(relocated) : relocated;
};
