import { Draggable, gsap } from "./gsapSetup.js";

const PICKUP_BOARD_FRACTION = 0.05;

const instances: Draggable[] = [];

export const killBoardDrags = (dragLayer: HTMLElement): void => {
  for (const inst of instances) {
    inst.kill();
  }
  instances.length = 0;
  dragLayer.replaceChildren();
};

const pickupSizePx = (boardFrame: HTMLElement): number =>
  Math.max(28, boardFrame.getBoundingClientRect().width * PICKUP_BOARD_FRACTION);

type DragPointer = {
  x: number;
  y: number;
  update: (applyBounds?: boolean) => void;
  pointerEvent?: Event;
};

const liftToDragLayer = (
  el: HTMLElement,
  boardFrame: HTMLElement,
  dragLayer: HTMLElement,
  pickup: boolean,
  inst: DragPointer
): void => {
  const rect = el.getBoundingClientRect();
  dragLayer.append(el);
  el.classList.add("scenes-token-dragging");
  const size = pickup ? pickupSizePx(boardFrame) : Math.max(rect.width, 24);
  gsap.set(el, {
    position: "fixed",
    left: rect.left + rect.width / 2,
    top: rect.top + rect.height / 2,
    x: 0,
    y: 0,
    xPercent: -50,
    yPercent: -50,
    width: size,
    height: size,
    zIndex: 40
  });
  inst.x = 0;
  inst.y = 0;
  inst.update(true);
};

const leaveFadedOrigin = (el: HTMLElement): void => {
  const origin = el.cloneNode(true) as HTMLElement;
  origin.classList.add("scenes-token-origin");
  origin.removeAttribute("id");
  origin.style.pointerEvents = "none";
  origin.style.opacity = "0.38";
  el.parentElement?.insertBefore(origin, el);
};

export const pointerOnElement = (el: HTMLElement, clientX: number, clientY: number): boolean => {
  const rect = el.getBoundingClientRect();
  return pointInRect(rect, clientX, clientY);
};

type RectBox = { left: number; right: number; top: number; bottom: number };

export const pointInRect = (rect: RectBox, clientX: number, clientY: number): boolean =>
  clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;

/** Visible parchment: the cropped board image inside the wrap, not the full uncropped frame. */
export const pointerOnVisibleBoard = (
  wrap: HTMLElement,
  boardFrame: HTMLElement,
  clientX: number,
  clientY: number
): boolean => {
  const wrapRect = wrap.getBoundingClientRect();
  const frameRect = boardFrame.getBoundingClientRect();
  const left = Math.max(wrapRect.left, frameRect.left);
  const right = Math.min(wrapRect.right, frameRect.right);
  const top = Math.max(wrapRect.top, frameRect.top);
  const bottom = Math.min(wrapRect.bottom, frameRect.bottom);
  if (right <= left || bottom <= top) {
    return false;
  }
  return pointInRect({ left, right, top, bottom }, clientX, clientY);
};

export type BindBoardDragOptions = {
  readonly boardFrame: HTMLElement;
  readonly dragLayer: HTMLElement;
  readonly pickup: boolean;
  readonly leaveOrigin?: boolean;
  readonly clearCue?: boolean;
  readonly onMove: (clientX: number, clientY: number) => void;
  readonly onEnd: (clientX: number, clientY: number) => void;
  readonly onDragStart?: () => void;
  readonly onBoard?: (clientX: number, clientY: number) => boolean;
};

export const bindBoardDrag = (el: HTMLElement, options: BindBoardDragOptions): void => {
  const created = Draggable.create(el, {
    type: "x,y",
    zIndexBoost: false,
    minimumMovement: 3,
    cursor: "grab",
    activeCursor: "grabbing",
    onDragStart() {
      if (options.leaveOrigin === true) {
        leaveFadedOrigin(el);
      }
      liftToDragLayer(el, options.boardFrame, options.dragLayer, options.pickup, this as unknown as DragPointer);
      if (options.pickup) {
        gsap.fromTo(
          el,
          { scale: 0.92 },
          { scale: 1.12, duration: 0.07, yoyo: true, repeat: 1, ease: "power2.out" }
        );
      }
      options.onDragStart?.();
    },
    onDrag() {
      const event = this.pointerEvent as PointerEvent;
      if (options.clearCue === true) {
        const onBoard =
          options.onBoard?.(event.clientX, event.clientY) ??
          pointerOnElement(options.boardFrame, event.clientX, event.clientY);
        el.classList.toggle("scenes-token-will-clear", !onBoard);
      }
      options.onMove(event.clientX, event.clientY);
    },
    onDragEnd() {
      const event = this.pointerEvent as PointerEvent;
      gsap.killTweensOf(el);
      el.style.visibility = "hidden";
      options.onEnd(event.clientX, event.clientY);
    }
  });
  instances.push(...created);
};

export { gsap };
