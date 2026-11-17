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
    { scale: 0.96, duration: 0.08, yoyo: true, repeat: 1, ease: "power2.out" },
  );
}

function tableTipDegrees(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 26, y: -6 };
  const styles = getComputedStyle(document.documentElement);
  const x = Number.parseFloat(styles.getPropertyValue("--table-tip-x")) || 26;
  const y = Number.parseFloat(styles.getPropertyValue("--table-tip-y")) || -6;
  return { x, y };
}

export function introTable(stage: Element | null) {
  if (!stage) return;
  const tip = tableTipDegrees();
  if (prefersReducedMotion()) {
    gsap.set(stage, { rotateX: tip.x, rotateY: tip.y, y: 0, autoAlpha: 1 });
    return;
  }
  gsap.fromTo(
    stage,
    { rotateX: tip.x + 20, rotateY: tip.y - 8, y: 70, autoAlpha: 0.35 },
    {
      rotateX: tip.x,
      rotateY: tip.y,
      y: 0,
      autoAlpha: 1,
      duration: 0.95,
      ease: "power3.out",
    },
  );
}

export function tableBreath(table: Element | null): gsap.core.Tween | null {
  if (!table || prefersReducedMotion()) return null;
  const tip = tableTipDegrees();
  return gsap.to(table, {
    rotateX: tip.x + 1.2,
    rotateY: tip.y - 0.6,
    duration: 4.5,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  });
}

export function tableJolt(table: Element | null) {
  if (!table || prefersReducedMotion()) return;
  gsap.fromTo(
    table,
    { y: 0 },
    { y: 3, duration: 0.06, yoyo: true, repeat: 1, ease: "power2.out" },
  );
}

/** Fade/stagger fallback when flight layer is unavailable. */
export function dealSlots(container: Element | null) {
  if (!container) return;
  const cards = container.querySelectorAll(".card-slot:not(.empty)");
  if (!cards.length) return;
  if (prefersReducedMotion()) {
    gsap.set(cards, { autoAlpha: 1, y: 0, scale: 1 });
    return;
  }
  gsap.fromTo(
    cards,
    { autoAlpha: 0, y: 28, scale: 0.9 },
    {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.45,
      stagger: { each: 0.04, from: "center" },
      ease: "power3.out",
    },
  );
}

export function dealFromDeck(opts: {
  deckEl: Element | null;
  slotEls: Element[];
  tableEl?: Element | null;
  onCardLand?: (index: number) => void;
  onComplete?: () => void;
}) {
  const { deckEl, slotEls, tableEl, onCardLand, onComplete } = opts;
  if (!deckEl || !slotEls.length) {
    onComplete?.();
    return;
  }
  if (prefersReducedMotion()) {
    slotEls.forEach((el) => gsap.set(el, { autoAlpha: 1 }));
    onComplete?.();
    return;
  }

  const deckRect = deckEl.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.className = "flight-layer";
  document.body.appendChild(layer);

  const tl = gsap.timeline({
    onComplete: () => {
      layer.remove();
      onComplete?.();
    },
  });

  slotEls.forEach((slot, i) => {
    gsap.set(slot, { autoAlpha: 0 });
    const target = slot.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "flight-card";
    ghost.style.backgroundImage = "url(/assets/card-back.webp)";
    layer.appendChild(ghost);

    const startX = deckRect.left + deckRect.width / 2 - target.width / 2;
    const startY = deckRect.top + deckRect.height / 2 - target.height / 2;

    gsap.set(ghost, {
      width: target.width,
      height: target.height,
      x: startX,
      y: startY,
      rotate: -12 + (i % 3) * 4,
      scale: 0.72,
      autoAlpha: 1,
    });

    tl.to(
      ghost,
      {
        x: target.left,
        y: target.top,
        rotate: 0,
        scale: 1,
        duration: 0.42,
        ease: "power3.inOut",
        onComplete: () => {
          gsap.set(slot, { autoAlpha: 1 });
          gsap.fromTo(
            slot,
            { scaleY: 0.92 },
            { scaleY: 1, duration: 0.18, ease: "back.out(2)" },
          );
          tableJolt(tableEl ?? null);
          onCardLand?.(i);
          ghost.remove();
        },
      },
      i * 0.055,
    );
  });
}

export function burnReveal(slotEl: Element | null, onDone?: () => void) {
  if (!slotEl) {
    onDone?.();
    return;
  }
  const back = slotEl.querySelector(".card-back");
  const face = slotEl.querySelector(".card-face");
  if (prefersReducedMotion() || !back) {
    gsap.set(back, { autoAlpha: 0 });
    gsap.set(face, { autoAlpha: 1 });
    onDone?.();
    return;
  }

  gsap.set(face, { autoAlpha: 1 });
  const sparksHost = document.createElement("div");
  sparksHost.className = "ember-sparks";
  slotEl.appendChild(sparksHost);
  for (let i = 0; i < 10; i++) {
    const s = document.createElement("span");
    s.className = "ember-spark";
    sparksHost.appendChild(s);
    gsap.set(s, {
      left: `${20 + Math.random() * 60}%`,
      top: `${30 + Math.random() * 40}%`,
      scale: 0.4 + Math.random() * 0.8,
    });
    gsap.to(s, {
      y: -30 - Math.random() * 40,
      x: (Math.random() - 0.5) * 40,
      autoAlpha: 0,
      duration: 0.55 + Math.random() * 0.3,
      delay: 0.1 + Math.random() * 0.25,
      ease: "power1.out",
    });
  }

  const tl = gsap.timeline({
    onComplete: () => {
      sparksHost.remove();
      onDone?.();
    },
  });
  tl.fromTo(slotEl, { y: 0, scale: 1 }, { y: -10, scale: 1.03, duration: 0.18, ease: "power2.out" });
  tl.fromTo(
    back,
    { "--burn": 0, filter: "brightness(1)" },
    {
      "--burn": 1,
      filter: "brightness(1.35) sepia(0.4) saturate(1.6)",
      duration: 0.55,
      ease: "power2.in",
      onUpdate: function onUpdate() {
        const v = Number(gsap.getProperty(back, "--burn"));
        (back as HTMLElement).style.webkitMaskImage =
          `radial-gradient(circle at 40% 35%, transparent ${v * 120}%, black ${v * 120 + 18}%)`;
        (back as HTMLElement).style.maskImage =
          `radial-gradient(circle at 40% 35%, transparent ${v * 120}%, black ${v * 120 + 18}%)`;
      },
    },
  );
  tl.to(back, { autoAlpha: 0, duration: 0.12 }, "-=0.05");
  tl.to(slotEl, { y: 0, scale: 1, duration: 0.22, ease: "power2.out" }, "-=0.1");
}

export function selectLift(el: Element | null, on: boolean) {
  if (!el) return;
  if (prefersReducedMotion()) {
    gsap.set(el, { y: on ? -4 : 0 });
    return;
  }
  gsap.to(el, {
    y: on ? -8 : 0,
    z: on ? 24 : 0,
    duration: 0.28,
    ease: "power2.out",
  });
  const shadow = el.querySelector(".card-shadow");
  if (shadow) {
    gsap.to(shadow, {
      scale: on ? 1.15 : 1,
      autoAlpha: on ? 0.55 : 0.35,
      duration: 0.28,
    });
  }
}

export function enhancePulse(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { filter: "brightness(1)" },
    {
      filter: "brightness(1.45) saturate(1.2)",
      duration: 0.22,
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
    { autoAlpha: 0, scale: 1.15 },
    { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power2.out" },
  );
}

export function totalsPunch(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { scale: 1 },
    { scale: 1.08, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" },
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

export function discardFlight(
  slotEl: Element | null,
  discardEl: Element | null,
  onComplete?: () => void,
) {
  if (!slotEl || !discardEl || prefersReducedMotion()) {
    onComplete?.();
    return;
  }
  const from = slotEl.getBoundingClientRect();
  const to = discardEl.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.className = "flight-layer";
  document.body.appendChild(layer);
  const ghost = document.createElement("div");
  ghost.className = "flight-card";
  const face = slotEl.querySelector(".card-face") as HTMLImageElement | null;
  if (face?.src) ghost.style.backgroundImage = `url(${face.src})`;
  else ghost.style.backgroundImage = "url(/assets/card-back.webp)";
  layer.appendChild(ghost);
  gsap.set(ghost, {
    width: from.width,
    height: from.height,
    x: from.left,
    y: from.top,
  });
  gsap.to(ghost, {
    x: to.left,
    y: to.top,
    scale: 0.45,
    rotate: 18,
    autoAlpha: 0.4,
    duration: 0.45,
    ease: "power2.in",
    onComplete: () => {
      layer.remove();
      onComplete?.();
    },
  });
}
