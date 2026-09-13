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

const liftToDragLayer = (el: HTMLElement, boardFrame: HTMLElement, dragLayer: HTMLElement, pickup: boolean): void => {
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
};

const leaveFadedOrigin = (el: HTMLElement): void => {
  const origin = el.cloneNode(true) as HTMLElement;
  origin.classList.add("scenes-token-origin");
  origin.removeAttribute("id");
  origin.style.pointerEvents = "none";
  origin.style.opacity = "0.38";
  el.parentElement?.insertBefore(origin, el);
};

const playDropPulse = (el: HTMLElement, done: () => void): void => {
  gsap.fromTo(
    el,
    { scale: 1.12 },
    {
      scale: 0.92,
      duration: 0.08,
      yoyo: true,
      repeat: 1,
      ease: "power2.out",
      onComplete: done
    }
  );
};

export type BindBoardDragOptions = {
  readonly boardFrame: HTMLElement;
  readonly dragLayer: HTMLElement;
  readonly pickup: boolean;
  readonly leaveOrigin?: boolean;
  readonly dropPulse?: boolean;
  readonly onMove: (clientX: number, clientY: number) => void;
  readonly onEnd: (clientX: number, clientY: number) => void;
  readonly onDragStart?: () => void;
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
      liftToDragLayer(el, options.boardFrame, options.dragLayer, options.pickup);
      this.update(true);
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
      options.onMove(event.clientX, event.clientY);
    },
    onDragEnd() {
      const event = this.pointerEvent as PointerEvent;
      const finish = (): void => options.onEnd(event.clientX, event.clientY);
      if (options.dropPulse !== false) {
        playDropPulse(el, finish);
        return;
      }
      finish();
    }
  });
  instances.push(...created);
};

export { gsap };
