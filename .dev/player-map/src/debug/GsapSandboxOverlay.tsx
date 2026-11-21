import { useEffect, useMemo, useState } from 'react';
import type { Position } from 'geojson';
import type { Map } from 'maplibre-gl';
import { runGsapEffectsMain } from '../gsap-effects';
import type { DistrictFeatureCollection } from '../types';

const SANDBOX_KEYS = ['BayStFinancial', 'YongeStreet', 'WestQueenWest', 'Waterfront'] as const;

interface GsapSandboxOverlayProps {
  map: Map | null;
  districts: DistrictFeatureCollection | null;
}

function ringToPath(ring: Position[]): string {
  const commands = ring.flatMap((position, index) => {
    const x = position[0];
    const y = position[1];
    if (x === undefined || y === undefined) return [];
    return [`${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`];
  });
  return commands.length === 0 ? '' : `${commands.join(' ')} Z`;
}

export function GsapSandboxOverlay({ map, districts }: GsapSandboxOverlayProps) {
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
    if (!map || !districts) return [];
    return SANDBOX_KEYS.flatMap((key) => {
      const feature = districts.features.find((candidate) => candidate.properties.key === key);
      if (!feature) return [];
      const d = feature.geometry.coordinates
        .flatMap((polygon) => polygon.map((ring) => ringToPath(ring.map((position) => {
          const point = map.project([position[0] ?? 0, position[1] ?? 0]);
          return [point.x, point.y];
        }))))
        .filter((path) => path !== '')
        .join(' ');
      return d ? [{ key, name: feature.properties.name, fillRule: feature.properties.fillRule, d }] : [];
    });
  }, [districts, map, version]);

  useEffect(() => {
    if (paths.length === 0) return;
    runGsapEffectsMain();
  }, [paths]);

  if (!map || paths.length === 0) return null;
  const width = map.getContainer().clientWidth;
  const height = map.getContainer().clientHeight;

  return (
    <div className="gsap-sandbox" aria-hidden="true" data-gsap="gsap-sandbox">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {paths.map((path) => (
          <path
            key={path.key}
            d={path.d}
            data-gsap-sandbox={path.key}
            fill="rgba(229, 203, 109, 0.08)"
            fillRule={path.fillRule}
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
