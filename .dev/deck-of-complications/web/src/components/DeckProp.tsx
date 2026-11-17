import { forwardRef } from "react";

function heightBand(count: number): "empty" | "low" | "mid" | "full" {
  if (count <= 0) return "empty";
  if (count < 20) return "low";
  if (count < 60) return "mid";
  return "full";
}

export const DeckProp = forwardRef<
  HTMLDivElement,
  { count: number; label?: string }
>(function DeckProp({ count, label = "Deck" }, ref) {
  const band = heightBand(count);
  return (
    <div className={`deck-prop band-${band}`} ref={ref} aria-label={`${label} ${count}`}>
      <div className="deck-box" aria-hidden>
        <div className="face top" />
        <div className="face front" />
        <div className="face side" />
      </div>
      <span className="deck-plaque">
        {label} {count}
      </span>
    </div>
  );
});

export function DiscardProp({
  count,
  refEl,
}: {
  count: number;
  refEl?: (el: HTMLDivElement | null) => void;
}) {
  const visible = Math.min(3, count);
  return (
    <div
      className="discard-prop"
      ref={refEl}
      aria-label={`Discard ${count}`}
    >
      {Array.from({ length: visible }, (_, i) => (
        <div
          key={i}
          className="discard-card"
          style={{
            transform: `translate(${i * 4}px, ${-i * 3}px) rotate(${(i - 1) * 6}deg)`,
            zIndex: i,
          }}
        />
      ))}
      <span className="deck-plaque">Discard {count}</span>
    </div>
  );
}
