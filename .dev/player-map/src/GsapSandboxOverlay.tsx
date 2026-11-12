import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map } from 'maplibre-gl';
import type { DistrictFeatureCollection } from './types';
import { runGsapEffectsMain } from './gsap-effects';

const SANDBOX_KEYS = ['BayStFinancial', 'YongeStreet', 'WestQueenWest', 'Waterfront'] as const;

interface GsapSandboxOverlayProps {
  map: Map | null;
  districts: DistrictFeatureCollection;
}

function ringToPath(ring: number[][]): string {
  return `${ring.map((point, index) => {
    const x = point[0] ?? 0;
    const y = point[1] ?? 0;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ')} Z`;
}

export function GsapSandboxOverlay({ map, districts }: GsapSandboxOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!map) return undefined;
    const bump = () => setVersion((value) => value + 1);
    map.on('move', bump);
    map.on('resize', bump);
    bump();
    return () => {
      map.off('move', bump);
      map.off('resize', bump);
    };
  }, [map]);

  const paths = useMemo(() => {
    if (!map) return [];
    return SANDBOX_KEYS.flatMap((key) => {
      const feature = districts.features.find((candidate) => candidate.properties.key === key);
      if (!feature) return [];
      const d = feature.geometry.coordinates
        .flatMap((polygon) => polygon.map((ring) => ringToPath(ring.map((position) => {
          const point = map.project(position as [number, number]);
          return [point.x, point.y];
        }))))
        .join(' ');
      return [{ key, name: feature.properties.name, d }];
    });
  }, [districts, map, version]);

  useEffect(() => {
    runGsapEffectsMain();
  }, [paths]);

  if (!map || paths.length === 0) return null;
  const width = map.getContainer().clientWidth;
  const height = map.getContainer().clientHeight;

  return (
    <div ref={rootRef} className="gsap-sandbox" aria-hidden="true" data-gsap="gsap-sandbox">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {paths.map((path) => (
          <path
            key={path.key}
            d={path.d}
            data-gsap-sandbox={path.key}
            fill="rgba(229, 203, 109, 0.08)"
            stroke="rgba(229, 203, 109, 0.55)"
            strokeWidth="1.5"
          >
            <title>{path.name}</title>
          </path>
        ))}
      </svg>
    </div>
  );
}
