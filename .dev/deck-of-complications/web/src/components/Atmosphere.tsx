/** Full-viewport animated red-particle backdrop. */
export function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden>
      <img
        className="atmosphere-particles"
        src="/assets/red-particle-loop.webp"
        alt=""
        draggable={false}
      />
    </div>
  );
}
