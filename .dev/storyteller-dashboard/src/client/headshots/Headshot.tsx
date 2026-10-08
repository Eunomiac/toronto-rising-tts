import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { fallbackImgStyle, figurineUrl, headshotImgStyle, peekHeadshot, resolveHeadshot, subscribeHeadshots, type ResolvedHeadshot } from "./headshots";

type HeadshotProps = {
  readonly characterKey: string;
  readonly className?: string;
  /** `crown` pins the top of the head to the top edge (tall portrait frames); default centres the face. */
  readonly anchor?: "face" | "crown";
  readonly children?: ReactNode;
};

/** Cropped figurine headshot filling its box; the box's width is the crop square's side. */
export const Headshot = ({ characterKey, className, anchor = "face", children }: HeadshotProps): ReactElement => {
  const [resolved, setResolved] = useState<ResolvedHeadshot | null>(() => peekHeadshot(characterKey));

  useEffect(() => {
    let live = true;
    setResolved(peekHeadshot(characterKey));
    resolveHeadshot(characterKey).then(
      (value) => {
        if (live) {
          setResolved(value);
        }
      },
      (error: unknown) => console.error(`Headshot for ${characterKey}:`, error)
    );
    const unsubscribe = subscribeHeadshots((key) => {
      if (key === characterKey && live) {
        setResolved(peekHeadshot(characterKey));
      }
    });
    return () => {
      live = false;
      unsubscribe();
    };
  }, [characterKey]);

  const style = resolved
    ? headshotImgStyle(resolved.crop, resolved.aspect, anchor === "crown" ? resolved.auto.crown : undefined)
    : fallbackImgStyle();
  return (
    <span className={`headshot${className ? ` ${className}` : ""}`}>
      <img src={figurineUrl(characterKey)} alt="" draggable={false} style={style} />
      {children}
    </span>
  );
};
