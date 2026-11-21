import { useEffect, useRef } from 'react';
import { Marker, type Map } from 'maplibre-gl';
import gsap from 'gsap';

const TORONTO: [number, number] = [-79.3832, 43.6532];
const SHOW_MAX_ZOOM = 9.5;
const HOME_ZOOM = 12.5;
/** Circle center in the 480×480 SVG (slightly above geometric center). */
const ROTATION_ORIGIN = '50% 38.4%';
const EDGE_PAD = 28;

interface TorontoLocatorProps {
  readonly map: Map | null;
}

function clampToEdge(
  point: { x: number; y: number },
  width: number,
  height: number,
): { x: number; y: number; offscreen: boolean } {
  const inset = EDGE_PAD;
  const inside = point.x >= inset && point.x <= width - inset && point.y >= inset && point.y <= height - inset;
  if (inside) return { x: point.x, y: point.y, offscreen: false };
  const cx = width / 2;
  const cy = height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy, offscreen: true };
  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : ((dx > 0 ? width - inset : inset) - cx) / dx;
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : ((dy > 0 ? height - inset : inset) - cy) / dy;
  const scale = Math.min(Math.abs(scaleX), Math.abs(scaleY));
  return { x: cx + dx * scale, y: cy + dy * scale, offscreen: true };
}

export function TorontoLocator({ map }: TorontoLocatorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLImageElement>(null);
  const markerRef = useRef<Marker | null>(null);
  const pulseRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!map || !hostRef.current) return undefined;
    const host = hostRef.current;
    const marker = new Marker({ element: host, anchor: 'bottom' })
      .setLngLat(TORONTO)
      .addTo(map);
    markerRef.current = marker;

    const sync = () => {
      const zoom = map.getZoom();
      const visible = zoom <= SHOW_MAX_ZOOM;
      host.style.display = visible ? '' : 'none';
      if (!visible) {
        pulseRef.current?.pause();
        return;
      }
      const projected = map.project(TORONTO);
      const width = map.getContainer().clientWidth;
      const height = map.getContainer().clientHeight;
      const edge = clampToEdge(projected, width, height);
      if (edge.offscreen) {
        const lngLat = map.unproject([edge.x, edge.y]);
        marker.setLngLat(lngLat);
        const angle = (Math.atan2(projected.y - edge.y, projected.x - edge.x) * 180) / Math.PI + 90;
        if (outerRef.current) outerRef.current.style.transform = `rotate(${angle}deg)`;
        host.classList.add('is-offscreen');
        if (!pulseRef.current) {
          pulseRef.current = gsap.to(host, {
            filter: 'drop-shadow(0 0 10px rgba(255,40,40,0.95))',
            duration: 0.85,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
          });
        } else pulseRef.current.play();
      } else {
        marker.setLngLat(TORONTO);
        if (outerRef.current) outerRef.current.style.transform = 'rotate(0deg)';
        host.classList.remove('is-offscreen');
        pulseRef.current?.pause(0);
        host.style.filter = '';
      }
    };

    const onClick = () => {
      map.easeTo({
        center: TORONTO,
        zoom: HOME_ZOOM,
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900,
      });
    };
    host.addEventListener('click', onClick);
    map.on('move', sync);
    map.on('zoom', sync);
    map.on('resize', sync);
    sync();

    return () => {
      host.removeEventListener('click', onClick);
      map.off('move', sync);
      map.off('zoom', sync);
      map.off('resize', sync);
      pulseRef.current?.kill();
      pulseRef.current = null;
      marker.remove();
      markerRef.current = null;
    };
  }, [map]);

  return (
    <div ref={hostRef} className="toronto-locator" role="button" tabIndex={0} aria-label="Return to Toronto" style={{ display: 'none' }}>
      <img
        ref={outerRef}
        className="toronto-locator__outer"
        src="/assets/icons/toronto_locator/toronto_locator_outer.svg"
        alt=""
        style={{ transformOrigin: ROTATION_ORIGIN }}
      />
      <img
        className="toronto-locator__inner"
        src="/assets/icons/toronto_locator/toronto_locator_inner.svg"
        alt=""
      />
    </div>
  );
}
