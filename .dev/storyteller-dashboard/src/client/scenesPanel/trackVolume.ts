import trackVolumes from "../../../data/track-volumes.json";

const playlistCatalog = (key: string): number | undefined => {
  const level = (trackVolumes.playlists as Record<string, number>)[key];
  return typeof level === "number" ? level : undefined;
};

const clipCatalog = (key: string | undefined): number | undefined => {
  if (!key) {
    return undefined;
  }
  const level = (trackVolumes.clips as Record<string, number>)[key];
  return typeof level === "number" ? level : undefined;
};

const playlistClipKeys = (key: string): readonly string[] =>
  (trackVolumes.playlistClips as Record<string, readonly string[]>)[key] ?? [];

/** 0–100 slider value. A saved override is the clip's volume; otherwise the catalog level. */
export const clipVolume = (
  key: string | undefined,
  saved?: Readonly<Record<string, number>>
): number | undefined => {
  if (key && saved) {
    const override = saved[key];
    if (typeof override === "number" && Number.isFinite(override)) {
      return Math.round(Math.min(1, Math.max(0, override)) * 100);
    }
  }
  return clipCatalog(key);
};

/**
 * The volume a background playlist plays at. Every clip shares the catalog level. A saved override replaces
 * it. When the clips disagree, one shared override is that playlist's level; otherwise the clip now playing.
 */
export const playlistVolume = (
  key: string,
  saved?: Readonly<Record<string, number>>,
  playingClip?: string
): number | undefined => {
  const catalog = playlistCatalog(key);
  const clips = playlistClipKeys(key);
  if (clips.length === 0) {
    return catalog;
  }
  const proper = clips.map((clip) => {
    const level = clipVolume(clip, saved);
    return level === undefined ? catalog : level;
  });
  const first = proper[0];
  if (typeof first === "number" && proper.every((level) => level === first)) {
    return first;
  }
  if (playingClip && clips.includes(playingClip)) {
    const playing = clipVolume(playingClip, saved);
    return playing === undefined ? catalog : playing;
  }
  const overrides = clips
    .map((clip) => saved?.[clip])
    .filter((volume): volume is number => typeof volume === "number" && Number.isFinite(volume))
    .map((volume) => Math.round(Math.min(1, Math.max(0, volume)) * 100));
  const shared = overrides[0];
  if (typeof shared === "number" && overrides.every((level) => level === shared)) {
    return shared;
  }
  return catalog;
};

export const sliderPercent = (volume: number): number => Math.round(Math.min(1, Math.max(0, volume)) * 100);
