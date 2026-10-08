import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { fallbackImgStyle, figurineUrl, headshotImgStyle, peekHeadshot, resolveHeadshot, subscribeHeadshots, type ResolvedHeadshot } from "./headshots";

/** Cropped figurine headshot filling its box; the box's width is the crop square's side. */
export const Headshot = ({ characterKey, className, children }: { characterKey: string; className?: string; children?: ReactNode }): ReactElement => {
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

  return (
    <span className={`headshot${className ? ` ${className}` : ""}`}>
      <img
        src={figurineUrl(characterKey)}
        alt=""
        draggable={false}
        style={resolved ? headshotImgStyle(resolved.crop, resolved.aspect) : fallbackImgStyle()}
      />
      {children}
    </span>
  );
};
