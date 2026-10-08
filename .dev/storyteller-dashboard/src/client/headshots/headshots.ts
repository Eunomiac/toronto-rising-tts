import type { HeadshotCrop, HeadshotCropFile } from "../../shared/headshotCrop";
import { ANALYSIS_HEIGHT, computeAutoCrop, type AutoCrop } from "./autoCrop";

/**
 * Figurine headshots for tokens: the automatic crop is measured in the browser from each cutout's alpha
 * channel; hand corrections from `data/headshot-crops.json` (via `/api/headshot-crops`) win over it.
 */

export type ResolvedHeadshot = {
  readonly crop: HeadshotCrop;
  /** Cutout width divided by height, needed to place the full image behind a crop window. */
  readonly aspect: number;
  readonly source: "manual" | "auto";
  readonly auto: AutoCrop;
};

type Analysis = { readonly auto: AutoCrop; readonly aspect: number };

const FALLBACK_CROP: HeadshotCrop = { cx: 0.5, cy: 0.085, size: 0.13 };
const FALLBACK_ASPECT = 0.3;

const analyses = new Map<string, Promise<Analysis>>();
const analysed = new Map<string, Analysis>();
let manual: Record<string, HeadshotCrop> = {};
let manualLoad: Promise<void> | null = null;
const listeners = new Set<(characterKey: string) => void>();

export const figurineUrl = (characterKey: string): string => `/catalogued-npc-images/${characterKey}.webp`;

const notify = (characterKey: string): void => {
  for (const listener of listeners) {
    listener(characterKey);
  }
};

export const subscribeHeadshots = (listener: (characterKey: string) => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });

const analyse = (characterKey: string): Promise<Analysis> => {
  const existing = analyses.get(characterKey);
  if (existing) {
    return existing;
  }
  const task = loadImage(figurineUrl(characterKey)).then((image) => {
    const scale = ANALYSIS_HEIGHT / image.naturalHeight;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = ANALYSIS_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D is unavailable.");
    }
    context.drawImage(image, 0, 0, width, ANALYSIS_HEIGHT);
    const pixels = context.getImageData(0, 0, width, ANALYSIS_HEIGHT).data;
    const result: Analysis = { auto: computeAutoCrop(pixels, width, ANALYSIS_HEIGHT), aspect: image.naturalWidth / image.naturalHeight };
    analysed.set(characterKey, result);
    return result;
  });
  analyses.set(characterKey, task);
  task.catch(() => analyses.delete(characterKey));
  return task;
};

const loadManual = (): Promise<void> => {
  if (!manualLoad) {
    manualLoad = fetch("/api/headshot-crops")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Headshot crops failed to load (${response.status}).`);
        }
        manual = { ...((await response.json()) as HeadshotCropFile).crops };
        for (const key of Object.keys(manual)) {
          notify(key);
        }
      });
  }
  return manualLoad;
};

const combine = (characterKey: string, analysis: Analysis): ResolvedHeadshot => {
  const saved = manual[characterKey];
  return saved
    ? { crop: saved, aspect: analysis.aspect, source: "manual", auto: analysis.auto }
    : { crop: analysis.auto.crop, aspect: analysis.aspect, source: "auto", auto: analysis.auto };
};

/** Synchronous answer when the cutout has already been measured, so re-rendered tokens never flash. */
export const peekHeadshot = (characterKey: string): ResolvedHeadshot | null => {
  const analysis = analysed.get(characterKey);
  return analysis ? combine(characterKey, analysis) : null;
};

let manualFailureReported = false;

/** Automatic crops never wait on the corrections file; a failed load is reported once (reload the page to retry). */
export const resolveHeadshot = async (characterKey: string): Promise<ResolvedHeadshot> => {
  const [analysis] = await Promise.all([
    analyse(characterKey),
    loadManual().catch((error: unknown) => {
      if (!manualFailureReported) {
        manualFailureReported = true;
        console.error("Headshot corrections unavailable; showing automatic crops only.", error);
      }
    })
  ]);
  return combine(characterKey, analysis);
};

const writeCrops = async (characterKey: string, init: RequestInit): Promise<void> => {
  const response = await fetch(`/api/headshot-crops?key=${encodeURIComponent(characterKey)}`, init);
  const body = (await response.json()) as HeadshotCropFile & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Saving the headshot failed (${response.status}).`);
  }
  manual = { ...body.crops };
  notify(characterKey);
};

export const saveHeadshotCrop = (characterKey: string, crop: HeadshotCrop): Promise<void> =>
  writeCrops(characterKey, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(crop) });

export const resetHeadshotCrop = (characterKey: string): Promise<void> => writeCrops(characterKey, { method: "DELETE" });

/**
 * Inline style for the full cutout `<img>` inside a crop window whose width is the crop square's side.
 * Horizontal values are % of the window width; `margin-top` % is also of the window width, which keeps the
 * maths aspect-independent when the window is not square.
 *
 * By default the crop centre sits in the middle of the window, less any `--headshot-reserve` (a label strip
 * along the bottom). Pass `crown` to pin the top of the head to the window's top edge instead.
 */
export const headshotImgStyle = (
  crop: HeadshotCrop,
  aspect: number,
  crown?: number
): Record<"width" | "left" | "top" | "marginTop", string> => ({
  width: `${(aspect / crop.size) * 100}%`,
  left: `${50 - ((crop.cx * aspect) / crop.size) * 100}%`,
  top: crown === undefined ? "calc((100% - var(--headshot-reserve, 0px)) / 2)" : "0",
  marginTop: `${-((crown ?? crop.cy) / crop.size) * 100}%`
});

export const fallbackImgStyle = (): ReturnType<typeof headshotImgStyle> => headshotImgStyle(FALLBACK_CROP, FALLBACK_ASPECT);

const applyStyle = (img: HTMLImageElement, style: ReturnType<typeof headshotImgStyle>): void => {
  img.style.width = style.width;
  img.style.left = style.left;
  img.style.top = style.top;
  img.style.marginTop = style.marginTop;
};

let domListening = false;

/**
 * Points a plain-DOM `<img>` at a figurine and keeps it cropped, including after a correction is saved.
 * The img must sit in a positioned, overflow-hidden window (see `.headshot` in `_headshots.scss`).
 */
export const bindHeadshotImg = (img: HTMLImageElement, characterKey: string): void => {
  img.dataset.headshotKey = characterKey;
  img.src = figurineUrl(characterKey);
  const ready = peekHeadshot(characterKey);
  applyStyle(img, ready ? headshotImgStyle(ready.crop, ready.aspect) : fallbackImgStyle());
  if (!domListening) {
    domListening = true;
    subscribeHeadshots((key) => {
      const resolved = peekHeadshot(key);
      if (!resolved) {
        return;
      }
      for (const el of document.querySelectorAll<HTMLImageElement>(`img[data-headshot-key="${CSS.escape(key)}"]`)) {
        applyStyle(el, headshotImgStyle(resolved.crop, resolved.aspect));
      }
    });
  }
  if (!ready) {
    resolveHeadshot(characterKey).then(
      (resolved) => {
        if (img.dataset.headshotKey === characterKey) {
          applyStyle(img, headshotImgStyle(resolved.crop, resolved.aspect));
        }
      },
      (error: unknown) => console.error(`Headshot for ${characterKey}:`, error)
    );
  }
};
