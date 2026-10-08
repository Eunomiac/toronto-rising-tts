import type { HeadshotCrop } from "../../shared/headshotCrop";
import { figurineUrl, headshotImgStyle, resetHeadshotCrop, resolveHeadshot, saveHeadshotCrop, type ResolvedHeadshot } from "./headshots";

const STAGE = 560;
const RING = 360;
const PREVIEW_SIZES = [34, 56, 96] as const;
const MIN_SIZE = 0.02;
const MAX_SIZE = 1.5;

const CONFIDENCE_LABEL: Record<ResolvedHeadshot["auto"]["confidence"], string> = {
  confident: "confident",
  probable: "probably right",
  guessed: "guessed"
};

const describe = (resolved: ResolvedHeadshot, reset: boolean): string => {
  if (resolved.source === "manual" && !reset) {
    return "Using your saved correction.";
  }
  const { confidence, reason } = resolved.auto;
  return `Automatic crop: ${CONFIDENCE_LABEL[confidence]}${reason ? ` (${reason})` : ""}.`;
};

const sameCrop = (a: HeadshotCrop, b: HeadshotCrop): boolean =>
  Math.abs(a.cx - b.cx) < 1e-6 && Math.abs(a.cy - b.cy) < 1e-6 && Math.abs(a.size - b.size) < 1e-6;

let openEditor: HTMLDivElement | null = null;

/**
 * Drag-and-scale editor for one figurine's token crop. Drag moves the figurine behind the ring, the mouse
 * wheel scales it around the pointer. Closing (Save, ×, Escape, or clicking outside) saves any change;
 * Cancel discards it. Reset to automatic removes the saved correction.
 */
export const openHeadshotEditor = async (characterKey: string, label: string): Promise<void> => {
  openEditor?.remove();
  const resolved = await resolveHeadshot(characterKey);
  const { aspect } = resolved;
  const start = resolved.crop;
  let crop: HeadshotCrop = { ...start };
  let reset = false;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop headshot-editor-backdrop";
  openEditor = backdrop;
  const card = document.createElement("div");
  card.className = "modal-card headshot-editor";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", `Token crop for ${label}`);

  const header = document.createElement("div");
  header.className = "modal-header";
  const heading = document.createElement("h2");
  heading.textContent = `Token crop: ${label}`;
  const closeX = document.createElement("button");
  closeX.type = "button";
  closeX.textContent = "×";
  closeX.setAttribute("aria-label", "Save and close");
  header.append(heading, closeX);

  const stage = document.createElement("div");
  stage.className = "headshot-editor-stage";
  stage.style.width = `${STAGE}px`;
  stage.style.height = `${STAGE}px`;
  const figure = document.createElement("img");
  figure.className = "headshot-editor-figure";
  figure.src = figurineUrl(characterKey);
  figure.alt = label;
  figure.draggable = false;
  const ring = document.createElement("div");
  ring.className = "headshot-editor-ring";
  ring.style.width = `${RING}px`;
  ring.style.height = `${RING}px`;
  stage.append(figure, ring);

  const side = document.createElement("div");
  side.className = "headshot-editor-side";
  const status = document.createElement("p");
  status.className = "headshot-editor-status";
  const help = document.createElement("p");
  help.className = "headshot-editor-help";
  help.textContent = "Drag to move. Scroll to zoom. Closing saves; Cancel discards.";
  const previews = document.createElement("div");
  previews.className = "headshot-editor-previews";
  const previewImgs = PREVIEW_SIZES.map((size) => {
    const windowEl = document.createElement("span");
    windowEl.className = "headshot headshot-editor-preview";
    windowEl.style.width = `${size}px`;
    windowEl.style.height = `${size}px`;
    const img = document.createElement("img");
    img.src = figurineUrl(characterKey);
    img.alt = "";
    img.draggable = false;
    windowEl.append(img);
    previews.append(windowEl);
    return img;
  });
  const error = document.createElement("p");
  error.className = "headshot-editor-error";
  const actions = document.createElement("div");
  actions.className = "headshot-editor-actions";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Reset to automatic";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "primary";
  saveButton.textContent = "Save & close";
  actions.append(resetButton, cancelButton, saveButton);
  side.append(status, help, previews, error, actions);

  const body = document.createElement("div");
  body.className = "modal-body headshot-editor-body";
  body.append(stage, side);
  card.append(header, body);
  backdrop.append(card);
  document.body.append(backdrop);

  const scale = (): number => RING / crop.size;
  const paint = (): void => {
    const pxPerHeight = scale();
    const imgW = aspect * pxPerHeight;
    figure.style.width = `${imgW}px`;
    figure.style.left = `${STAGE / 2 - crop.cx * imgW}px`;
    figure.style.top = `${STAGE / 2 - crop.cy * pxPerHeight}px`;
    const style = headshotImgStyle(crop, aspect);
    for (const img of previewImgs) {
      Object.assign(img.style, style);
    }
    status.textContent = sameCrop(crop, start) || reset ? describe(resolved, reset) : "Unsaved changes.";
  };
  paint();

  let busy = false;
  const close = async (save: boolean): Promise<void> => {
    if (busy) {
      return;
    }
    const changed = !sameCrop(crop, reset ? resolved.auto.crop : start);
    try {
      busy = true;
      error.textContent = "";
      if (save && changed) {
        await saveHeadshotCrop(characterKey, crop);
      } else if (save && reset && resolved.source === "manual") {
        await resetHeadshotCrop(characterKey);
      }
    } catch (failure: unknown) {
      busy = false;
      error.textContent = failure instanceof Error ? failure.message : "Saving failed.";
      return;
    }
    document.removeEventListener("keydown", onKey);
    backdrop.remove();
    if (openEditor === backdrop) {
      openEditor = null;
    }
  };

  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      void close(true);
    }
  };
  document.addEventListener("keydown", onKey);
  closeX.addEventListener("click", () => void close(true));
  saveButton.addEventListener("click", () => void close(true));
  cancelButton.addEventListener("click", () => void close(false));
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      void close(true);
    }
  });
  resetButton.addEventListener("click", () => {
    crop = { ...resolved.auto.crop };
    reset = true;
    paint();
  });

  let drag: { x: number; y: number; crop: HeadshotCrop } | null = null;
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    stage.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, y: event.clientY, crop };
  });
  stage.addEventListener("pointermove", (event) => {
    if (!drag) {
      return;
    }
    const pxPerHeight = RING / drag.crop.size;
    crop = {
      ...drag.crop,
      cx: drag.crop.cx - (event.clientX - drag.x) / (aspect * pxPerHeight),
      cy: drag.crop.cy - (event.clientY - drag.y) / pxPerHeight
    };
    reset = false;
    paint();
  });
  const endDrag = (): void => {
    drag = null;
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const mx = event.clientX - rect.left - STAGE / 2;
      const my = event.clientY - rect.top - STAGE / 2;
      const before = scale();
      const u = crop.cx + mx / (aspect * before);
      const v = crop.cy + my / before;
      const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, crop.size * Math.exp(event.deltaY * 0.0015)));
      const after = RING / size;
      crop = { cx: u - mx / (aspect * after), cy: v - my / after, size };
      reset = false;
      paint();
    },
    { passive: false }
  );
};
