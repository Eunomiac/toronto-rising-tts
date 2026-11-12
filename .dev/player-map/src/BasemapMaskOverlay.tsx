import { useEffect, useMemo, useState } from 'react';
import type { Map } from 'maplibre-gl';
import type { BasemapMaskImage } from './MapView';

interface BasemapMaskOverlayProps {
  map: Map | null;
  images: BasemapMaskImage[];
}

export function BasemapMaskOverlay({ map, images }: BasemapMaskOverlayProps) {
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

  const placed = useMemo(() => {
    if (!map || images.length === 0) return [];
    return images.map((image) => {
      const corners = image.coordinates.map((coordinate) => map.project(coordinate));
      const xs = corners.map((corner) => corner.x);
      const ys = corners.map((corner) => corner.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        key: image.key,
        url: image.url,
        left: minX,
        top: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    });
  }, [images, map, version]);

  if (!map || placed.length === 0) return null;

  return (
    <div className="basemap-mask-overlay" aria-hidden="true">
      {placed.map((image) => (
        <img
          key={image.key}
          src={image.url}
          alt=""
          className="basemap-mask-overlay__image"
          style={{
            left: `${image.left}px`,
            top: `${image.top}px`,
            width: `${image.width}px`,
            height: `${image.height}px`,
          }}
        />
      ))}
    </div>
  );
}
