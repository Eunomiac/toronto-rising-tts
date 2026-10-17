import { gsap } from "gsap";
import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
} from "react";
import { Icon, type IconName } from "../icons";
import { acceptNativeDrag } from "./native";
import type { DropBin, DropKind } from "./types";

const appearance = (bin: DropBin): { color: string; icon: IconName } => {
  const characterBins: Partial<Record<DropBin["action"], { color: string; icon: IconName }>> = {
    initiateStandard: { color: "#efca81", icon: "roll" },
    initiateDiscipline: { color: "#bca4ff", icon: "humanity" },
    initiateFrenzy: { color: "#ff7886", icon: "violence" },
    initiateWillpower: { color: "#8edcfa", icon: "willpower" },
    initiateContested: { color: "#ffa665", icon: "violence" },
    initiateRemorse: { color: "#a7bbfa", icon: "humanity" },
    editNpc: { color: "#85c5ff", icon: "options" },
    openTracker: { color: "#86dfb1", icon: "health" },
    renameGeneric: { color: "#ffd19b", icon: "options" },
    initiateProject: { color: "#eec57d", icon: "clock" },
    changeStats: { color: "#85c5ff", icon: "options" },
    openSheet: { color: "#b9b9ff", icon: "humanity" },
  };
  const characterBin = characterBins[bin.action];
  if (characterBin) return characterBin;
  if (bin.secretSafe || /secret|reveal|hold/i.test(bin.action))
    return { color: "#c49aff", icon: "humanity" };
  if (/cancel|dismiss|delete|archive|endScene/i.test(bin.action))
    return { color: "#fa7e87", icon: "cancel" };
  if (/broadcast|confirm|play|execute/i.test(bin.action))
    return {
      color: "#80dfc1",
      icon: /broadcast/i.test(bin.action) ? "broadcast" : "confirm",
    };
  if (/sheet|edit|stats|tracker|copy|pin|rename/i.test(bin.action))
    return { color: "#85c5ff", icon: "options" };
  if (/rouse|hunger|frenzy|surge|stain/i.test(bin.action))
    return { color: "#ed9983", icon: "hunger" };
  return { color: "#efca81", icon: "roll" };
};

export const DropBinButton = ({
  bin,
  hot,
  onDrop,
  hoverDrop,
  left,
  top,
}: {
  bin: DropBin;
  hot: boolean;
  onDrop: () => void;
  hoverDrop?: DropKind;
  left?: number;
  top?: number;
}): ReactElement => {
  const ref = useRef<HTMLButtonElement>(null);
  const { color, icon } = appearance(bin);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        scale: hot ? 1.12 : 1,
        duration: reduced ? 0 : 0.22,
        ease: "back.out(2)",
        overwrite: "auto",
      });
      gsap.to(".tr-dnd-bin-orbit", {
        rotation: hot ? 90 : 0,
        duration: reduced ? 0 : 0.5,
        ease: "power2.out",
        overwrite: "auto",
      });
      gsap.to(".tr-dnd-bin-aura", {
        scale: hot ? 1.28 : 1,
        opacity: hot ? 0.8 : 0.18,
        duration: reduced ? 0 : 0.25,
        overwrite: "auto",
      });
    }, ref);
    return () => ctx.revert();
  }, [hot]);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={bin.label}
      className={`tr-dnd-bin${hoverDrop ? " tr-dnd-hover-bin" : ""}${bin.secretSafe ? " tr-dnd-bin--secret" : ""}${hot ? " is-hot" : ""}`}
      style={{ "--bin-color": color, left, top } as CSSProperties}
      {...(hoverDrop
        ? {
            "data-tr-dnd-hover-bin": bin.id,
            "data-tr-dnd-hover-drop": hoverDrop,
          }
        : { "data-tr-dnd-bin": bin.id })}
      onDragOver={(event) => {
        event.preventDefault();
        acceptNativeDrag(event.dataTransfer);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDrop();
      }}
      onClick={onDrop}
    >
      <span className="tr-dnd-bin-aura" aria-hidden />
      <span className="tr-dnd-bin-orbit" aria-hidden />
      <Icon name={icon} />
      {bin.secretSafe && <span className="tr-dnd-bin-badge">Secret</span>}
      <span className="tr-dnd-bin-label">{bin.label}</span>
      <span className="tr-dnd-bin-hint">{hot ? "Release" : "Drop here"}</span>
    </button>
  );
};
