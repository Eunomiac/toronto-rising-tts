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

const clipPlaylist = (key: string | undefined): string | undefined => {
  if (!key) {
    return undefined;
  }
  const playlist = (trackVolumes.clipPlaylists as Record<string, string>)[key];
  return typeof playlist === "string" ? playlist : undefined;
};

/** 0–100. Location ambience is stored on the clip. Other clips are not looked up here. */
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
 * Music, featured, rain, and wind. A saved playlist level applies to every clip in that playlist.
 * A clip-only level is used when the playlist has not been saved (levels from before playlist storage).
 */
export const playedVolume = (
  key: string | undefined,
  saved?: Readonly<Record<string, number>>
): number | undefined => {
  const playlist = clipPlaylist(key);
  if (playlist && saved) {
    const override = saved[playlist];
    if (typeof override === "number" && Number.isFinite(override)) {
      return Math.round(Math.min(1, Math.max(0, override)) * 100);
    }
  }
  return clipVolume(key, saved);
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
  if (saved) {
    const direct = saved[key];
    if (typeof direct === "number" && Number.isFinite(direct)) {
      return Math.round(Math.min(1, Math.max(0, direct)) * 100);
    }
  }
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
