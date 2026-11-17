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

export function flipCard(el: Element | null) {
  if (!el) return;
  if (prefersReducedMotion()) {
    gsap.fromTo(el, { autoAlpha: 0.4 }, { autoAlpha: 1, duration: 0.2 });
    return;
  }
  gsap.fromTo(
    el,
    { rotateY: -90, autoAlpha: 0.2, scale: 0.92 },
    { rotateY: 0, autoAlpha: 1, scale: 1, duration: 0.45, ease: "power3.out" },
  );
}

export function dealSlots(container: Element | null) {
  if (!container) return;
  const cards = container.querySelectorAll(".card-slot:not(.empty)");
  if (!cards.length) return;
  if (prefersReducedMotion()) {
    gsap.set(cards, { autoAlpha: 1, y: 0 });
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

export function enhancePulse(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { filter: "brightness(1)" },
    {
      filter: "brightness(1.35)",
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
    el.querySelector(".card-overlay"),
    { autoAlpha: 0, scale: 1.1 },
    { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power2.out" },
  );
}

export function totalsPunch(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { scale: 1 },
    { scale: 1.06, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" },
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
