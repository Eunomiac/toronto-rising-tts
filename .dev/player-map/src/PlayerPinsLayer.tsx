import { useEffect, useRef, useState } from 'react';
import { Marker, type Map } from 'maplibre-gl';
import type { PublicSiteCollection } from './types';
import {
  fetchSessionPins,
  PLAYER_PIN_ART,
  PLAYER_PIN_MIN_ZOOM,
  sessionCodeFromUrl,
  type PublicPlayerPin,
  type PublicPlayerPinsSnapshot,
} from './sessionPins';

const POLL_MS = 10_000;

interface PlayerPinsLayerProps {
  readonly map: Map | null;
  readonly sites: PublicSiteCollection;
  readonly onSnapshot?: (snapshot: PublicPlayerPinsSnapshot | null) => void;
}

function siteCoordinates(sites: PublicSiteCollection, siteKey: string): [number, number] | null {
  const feature = sites.features.find((item) => item.properties.key === siteKey);
  if (!feature || feature.geometry.type !== 'Point') return null;
  const [lng, lat] = feature.geometry.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  return [lng, lat];
}

function syncPinMarkerVisibility(markers: Marker[], zoom: number) {
  const visible = zoom >= PLAYER_PIN_MIN_ZOOM;
  for (const marker of markers) {
    marker.getElement().style.display = visible ? '' : 'none';
  }
}

export function PlayerPinsLayer({ map, sites, onSnapshot }: PlayerPinsLayerProps) {
  const [snapshot, setSnapshot] = useState<PublicPlayerPinsSnapshot | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const sessionCode = sessionCodeFromUrl(window.location.search);

  useEffect(() => {
    if (!sessionCode) {
      onSnapshot?.(null);
      return undefined;
    }
    let cancelled = false;
    const load = () => {
      void fetchSessionPins(sessionCode)
        .then((next) => {
          // 404 / empty: keep the last good snapshot so a missing feed never blanks pins.
          if (!cancelled && next) {
            setSnapshot(next);
            onSnapshot?.(next);
          }
        })
        .catch((error: unknown) => {
          console.error(error instanceof Error ? error.message : 'Could not load session pins');
        });
    };
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sessionCode, onSnapshot]);

  useEffect(() => {
    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];
    if (!map || !snapshot?.live) return undefined;
    const visible = snapshot.pins.filter((pin): pin is PublicPlayerPin => pin.visible);
    for (const pin of visible) {
      const coordinates = siteCoordinates(sites, pin.siteKey);
      if (!coordinates) continue;
      const element = document.createElement('img');
      element.className = 'player-session-pin';
      element.src = PLAYER_PIN_ART[pin.charKey];
      element.alt = pin.charKey;
      const marker = new Marker({ element, anchor: 'center' })
        .setLngLat(coordinates)
        .addTo(map);
      markersRef.current.push(marker);
    }
    syncPinMarkerVisibility(markersRef.current, map.getZoom());
    const onZoom = () => syncPinMarkerVisibility(markersRef.current, map.getZoom());
    map.on('zoom', onZoom);
    return () => {
      map.off('zoom', onZoom);
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
    };
  }, [map, sites, snapshot]);

  return null;
}
