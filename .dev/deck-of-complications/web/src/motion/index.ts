import gsap from "gsap";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function pressFeedback(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { scale: 1 },
    { scale: 0.97, duration: 0.07, yoyo: true, repeat: 1, ease: "power2.out" },
  );
}

/** Rest tip — mostly pitch toward the viewer, no static yaw skew. */
export function tableRestTip(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 14, y: 0 };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { x: 10, y: 0 };
  }
  if (window.matchMedia("(max-width: 900px), (max-height: 700px)").matches) {
    return { x: 12, y: 0 };
  }
  return { x: 14, y: 0 };
}

export function introTable(stage: Element | null) {
  if (!stage) return;
  const tip = tableRestTip();
  if (prefersReducedMotion()) {
    gsap.set(stage, { rotateX: tip.x, rotateY: 0, rotateZ: 0, y: 0, autoAlpha: 1 });
    return;
  }
  gsap.fromTo(
    stage,
    { rotateX: tip.x + 16, rotateY: 0, rotateZ: 0, y: 80, autoAlpha: 0.4 },
    {
      rotateX: tip.x,
      rotateY: 0,
      rotateZ: 0,
      y: 0,
      autoAlpha: 1,
      duration: 1.05,
      ease: "power3.out",
    },
  );
}

/** Gentle rock in 3D — pauses cleanly via returned tween. */
export function tableRock(table: Element | null): gsap.core.Timeline | null {
  if (!table || prefersReducedMotion()) return null;
  const tip = tableRestTip();
  gsap.set(table, { rotateX: tip.x, rotateY: 0, rotateZ: 0, transformOrigin: "50% 50%" });
  const tl = gsap.timeline({ repeat: -1, defaults: { ease: "sine.inOut" } });
  tl.to(table, { rotateX: tip.x + 1.2, rotateY: 1.5, rotateZ: 0.25, duration: 3.4 })
    .to(table, { rotateX: tip.x - 0.6, rotateY: -1.4, rotateZ: -0.2, duration: 3.8 })
    .to(table, { rotateX: tip.x + 0.5, rotateY: 0.8, rotateZ: 0.12, duration: 3.0 })
    .to(table, { rotateX: tip.x, rotateY: 0, rotateZ: 0, duration: 2.8 });
  return tl;
}

export function floatBob(els: Element[]): gsap.core.Timeline | null {
  if (!els.length || prefersReducedMotion()) return null;
  const tl = gsap.timeline({ repeat: -1 });
  els.forEach((el, i) => {
    tl.to(
      el,
      {
        y: i % 2 === 0 ? -7 : 6,
        rotate: i % 2 === 0 ? -1.2 : 1.4,
        duration: 2.8 + i * 0.35,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      },
      0,
    );
  });
  return tl;
}

export function tableJolt(table: Element | null) {
  if (!table || prefersReducedMotion()) return;
  gsap.fromTo(
    table,
    { y: 0 },
    { y: 4, duration: 0.07, yoyo: true, repeat: 1, ease: "power2.out" },
  );
}

/** Cards drop from above onto their slots. */
export function dealFromAbove(opts: {
  slotEls: Element[];
  tableEl?: Element | null;
  onCardLand?: (index: number) => void;
  onComplete?: () => void;
}) {
  const { slotEls, tableEl, onCardLand, onComplete } = opts;
  if (!slotEls.length) {
    onComplete?.();
    return;
  }
  if (prefersReducedMotion()) {
    gsap.set(slotEls, { autoAlpha: 1, y: 0, rotateX: 0 });
    onComplete?.();
    return;
  }

  const tl = gsap.timeline({ onComplete });
  slotEls.forEach((slot, i) => {
    gsap.set(slot, { autoAlpha: 0, y: -420 - (i % 5) * 30, rotateX: -28, scale: 0.92 });
    tl.to(
      slot,
      {
        autoAlpha: 1,
        y: 0,
        rotateX: 0,
        scale: 1,
        duration: 0.55,
        ease: "power3.in",
        onComplete: () => {
          gsap.fromTo(
            slot,
            { scaleY: 0.9 },
            { scaleY: 1, duration: 0.2, ease: "back.out(2.4)" },
          );
          if (i % 3 === 0) tableJolt(tableEl ?? null);
          onCardLand?.(i);
        },
      },
      i * 0.05,
    );
  });
}

/** Same rise the physical flip opens with — hover uses a smaller copy. */
const FLIP_RAISE = { y: -48, z: 60, scale: 1.06 } as const;
const HOVER_RAISE = { y: -14, z: 18, scale: 1.02 } as const;

/**
 * Face-down hover: same off-board raise as the start of physicalFlip
 * (y + z + scale on the slot), just a shorter distance.
 */
export function magneticLift(el: Element | null, on: boolean) {
  if (!el) return;
  const root = el as HTMLElement;
  // Undo any older flipper-only lift so it cannot fight the slot raise.
  const flipper = root.querySelector(".card-flipper");
  if (flipper) gsap.set(flipper, { y: 0, z: 0, scale: 1 });

  if (prefersReducedMotion()) {
    gsap.set(root, { y: 0, z: 0, scale: 1 });
    return;
  }

  gsap.killTweensOf(root);
  gsap.to(root, {
    y: on ? HOVER_RAISE.y : 0,
    z: on ? HOVER_RAISE.z : 0,
    scale: on ? HOVER_RAISE.scale : 1,
    duration: on ? 0.22 : 0.26,
    ease: on ? "power2.out" : "power2.in",
  });
}

/** Real face art is 630×879 (not the old 416×542 authoring note). */
export const CARD_ASPECT = 879 / 630;

/**
 * Face-up read hover: enlarge + flatten toward the player, anchored on the
 * slot's screen position (does not fly to viewport center).
 * Source slot stays an opacity-only hit plate so hover cannot flicker.
 */
export function leapToRead(opts: {
  source: HTMLElement;
  dimRoot: HTMLElement | null;
  onDone?: () => void;
}): { clone: HTMLElement; dismiss: () => void } {
  const { source, dimRoot } = opts;
  const rect = source.getBoundingClientRect();
  const img =
    (source.querySelector(".face-front img, .card-face") as HTMLImageElement | null)?.src ||
    "";

  dimRoot?.classList.add("stage-dimmed");
  source.classList.add("leap-source");

  const clone = document.createElement("div");
  clone.className = "leap-clone";
  clone.innerHTML = `<img src="${img}" alt="" draggable="false" />`;
  document.body.appendChild(clone);

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // True portrait from visual width (projected rect height is foreshortened).
  const startW = Math.max(rect.width, 1);
  const startH = startW * CARD_ASPECT;
  const startX = cx - startW / 2;
  const startY = cy - startH / 2;

  // Grow in place (~1.55×), then soft-clamp so edges stay near the cursor/slot.
  let targetW = startW * 1.55;
  let targetH = targetW * CARD_ASPECT;
  const pad = 12;
  const maxW = Math.min(window.innerWidth - pad * 2, startW * 1.75);
  const maxH = Math.min(window.innerHeight - pad * 2, startH * 1.75);
  if (targetW > maxW) {
    targetW = maxW;
    targetH = targetW * CARD_ASPECT;
  }
  if (targetH > maxH) {
    targetH = maxH;
    targetW = targetH / CARD_ASPECT;
  }
  let targetX = cx - targetW / 2;
  let targetY = cy - targetH / 2;
  targetX = Math.min(Math.max(pad, targetX), window.innerWidth - targetW - pad);
  targetY = Math.min(Math.max(pad, targetY), window.innerHeight - targetH - pad);

  gsap.set(clone, {
    position: "fixed",
    left: 0,
    top: 0,
    width: startW,
    height: startH,
    x: startX,
    y: startY,
    rotateX: 14,
    rotateY: 0,
    z: 0,
    zIndex: 80,
    borderRadius: 10,
    overflow: "visible",
    boxShadow: "0 28px 70px rgba(0,0,0,0.6)",
  });
  gsap.set(source, { opacity: 0 });

  const pose = {
    width: targetW,
    height: targetH,
    x: targetX,
    y: targetY,
    rotateX: 0,
    rotateY: 0,
  };

  if (prefersReducedMotion()) {
    gsap.set(clone, pose);
  } else {
    gsap.to(clone, {
      ...pose,
      duration: 0.42,
      ease: "power3.out",
    });
  }

  const dismiss = () => {
    const home = source.getBoundingClientRect();
    const hcx = home.left + home.width / 2;
    const hcy = home.top + home.height / 2;
    const homeW = Math.max(home.width, 1);
    const homeH = homeW * CARD_ASPECT;
    const finish = () => {
      clone.remove();
      gsap.set(source, { clearProps: "opacity" });
      source.classList.remove("leap-source");
      dimRoot?.classList.remove("stage-dimmed");
      opts.onDone?.();
    };
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    gsap.to(clone, {
      width: homeW,
      height: homeH,
      x: hcx - homeW / 2,
      y: hcy - homeH / 2,
      rotateX: 14,
      duration: 0.34,
      ease: "power2.in",
      onComplete: finish,
    });
  };

  return { clone, dismiss };
}

/**
 * Physical flip: leap up, rotateY 180 with face preloaded on the reverse side.
 */
export function physicalFlip(
  slotEl: HTMLElement | null,
  faceSrc: string,
  onDone?: () => void,
) {
  if (!slotEl) {
    onDone?.();
    return;
  }
  const flipper = slotEl.querySelector(".card-flipper") as HTMLElement | null;
  const front = slotEl.querySelector(".face-front") as HTMLElement | null;
  if (front && faceSrc) {
    let frontImg = front.querySelector("img") as HTMLImageElement | null;
    if (!frontImg) {
      frontImg = document.createElement("img");
      frontImg.alt = "";
      frontImg.draggable = false;
      front.insertBefore(frontImg, front.firstChild);
    }
    frontImg.src = faceSrc;
  }

  if (!flipper || prefersReducedMotion()) {
    slotEl.classList.add("is-flipped");
    onDone?.();
    return;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      slotEl.classList.add("is-flipped");
      gsap.set(flipper, { clearProps: "transform" });
      gsap.set(slotEl, { clearProps: "y,z,scale" });
      onDone?.();
    },
  });
  // Same raise language as magneticLift, full flip distance.
  gsap.killTweensOf(slotEl);
  tl.to(slotEl, {
    y: FLIP_RAISE.y,
    z: FLIP_RAISE.z,
    scale: FLIP_RAISE.scale,
    duration: 0.22,
    ease: "power2.out",
  });
  tl.to(
    flipper,
    {
      rotateY: 180,
      duration: 0.48,
      ease: "power2.inOut",
    },
    "-=0.04",
  );
  tl.to(
    slotEl,
    {
      y: 0,
      z: 0,
      scale: 1,
      duration: 0.28,
      ease: "power2.in",
    },
    "-=0.12",
  );
}

/** Discard: slide down the board, then fall into the abyss. */
export function discardOffBoard(
  slotEl: Element | null,
  onComplete?: () => void,
) {
  if (!slotEl) {
    onComplete?.();
    return;
  }
  if (prefersReducedMotion()) {
    gsap.set(slotEl, { autoAlpha: 0 });
    onComplete?.();
    return;
  }
  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(slotEl, { autoAlpha: 0, y: 0, rotateZ: 0 });
      onComplete?.();
    },
  });
  tl.to(slotEl, {
    y: 180,
    rotateZ: 8,
    duration: 0.45,
    ease: "power1.in",
  });
  tl.to(slotEl, {
    y: 520,
    rotateZ: 22,
    autoAlpha: 0,
    duration: 0.4,
    ease: "power2.in",
  });
}

export function enhancePulse(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { filter: "brightness(1)" },
    {
      filter: "brightness(1.35) saturate(1.15)",
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      ease: "power1.inOut",
    },
  );
}

export function negateFlash(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el.querySelector(".card-overlay.negated"),
    { autoAlpha: 0, scale: 1.12 },
    { autoAlpha: 1, scale: 1, duration: 0.32, ease: "power2.out" },
  );
}

export function totalsPunch(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { scale: 1 },
    { scale: 1.1, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" },
  );
}

export function waxSeal(el: Element | null) {
  if (!el) return;
  if (prefersReducedMotion()) {
    gsap.set(el, { autoAlpha: 1, scale: 1 });
    return;
  }
  gsap.fromTo(
    el,
    { autoAlpha: 0, scale: 1.4, rotate: -12 },
    { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.55, ease: "back.out(1.6)" },
  );
}

export function bannerIn(el: Element | null) {
  if (!el) return;
  if (prefersReducedMotion()) {
    gsap.set(el, { autoAlpha: 1, y: 0 });
    return;
  }
  gsap.fromTo(
    el,
    { autoAlpha: 0, y: 10 },
    { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" },
  );
}

export function menuFan(el: Element | null) {
  if (!el) return;
  if (prefersReducedMotion()) {
    gsap.set(el, { autoAlpha: 1, scale: 1 });
    return;
  }
  gsap.fromTo(
    el,
    { autoAlpha: 0, scale: 0.7 },
    { autoAlpha: 1, scale: 1, duration: 0.28, ease: "back.out(1.7)" },
  );
}

/** @deprecated kept for any leftover imports */
export function dealFromDeck(opts: {
  deckEl: Element | null;
  slotEls: Element[];
  tableEl?: Element | null;
  onCardLand?: (index: number) => void;
  onComplete?: () => void;
}) {
  dealFromAbove(opts);
}

export function burnReveal(slotEl: Element | null, onDone?: () => void) {
  physicalFlip(slotEl as HTMLElement | null, "", onDone);
}

export function selectLift(_el: Element | null, _on: boolean) {
  /* Player side: no selection outline / lift chrome. */
}

export function dealSlots(container: Element | null) {
  if (!container) return;
  dealFromAbove({
    slotEls: Array.from(container.querySelectorAll(".card-slot:not(.empty)")),
  });
}
