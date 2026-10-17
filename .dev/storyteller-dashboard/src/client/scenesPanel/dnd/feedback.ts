import { gsap } from "gsap";
import type { DropTarget } from "./types";

/** The accepted drop leaves a brief echo after the drag shelves have closed. */
export const animateDrop = (target: DropTarget): void => {
  if (!target.binId) return;
  const id = CSS.escape(target.binId);
  const selector = target.dropKind.startsWith("panel")
    ? `[data-tr-dnd-panel="${target.dropKind.slice(-1)}"] [data-tr-dnd-bin="${id}"]`
    : `[data-tr-dnd-hover-bin="${id}"]`;
  const bin = document.querySelector<HTMLElement>(selector);
  if (!bin) return;
  const rect = bin.getBoundingClientRect();
  const echo = document.createElement("div");
  echo.className = "tr-dnd-confirmation";
  echo.setAttribute("aria-hidden", "true");
  echo.style.left = `${rect.left + rect.width / 2}px`;
  echo.style.top = `${rect.top + rect.height / 2}px`;
  echo.style.setProperty(
    "--bin-color",
    getComputedStyle(bin).getPropertyValue("--bin-color"),
  );
  const label = document.createElement("span");
  label.textContent = bin.getAttribute("aria-label") ?? "Drop accepted";
  echo.append(label);
  document.body.append(echo);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  gsap.fromTo(
    echo,
    { scale: 0.7, opacity: 1 },
    {
      scale: reduced ? 1 : 1.5,
      opacity: 0,
      duration: reduced ? 0.15 : 0.65,
      ease: "power2.out",
      onComplete: () => echo.remove(),
    },
  );
};
