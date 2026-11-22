import { useEffect, useRef } from 'react';
import { Marker, MercatorCoordinate, type GeoJSONSource, type ImageSource, type Map } from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, MultiPolygon, Position } from 'geojson';
import type { DistrictFeatureCollection, PublicSiteCollection } from './types';
import { interiorDistrictBorders } from './district-borders';
import { coterieByKey } from './coteries';
import {
  contestedDistrictKeys,
  domainFontFamily,
  placedIcon,
  placedName,
  projectArtboardPoint,
  type DomainRecord,
  type DistrictOverlayMode,
} from './domains';

const SOURCE_ID = 'domain-overlays';
const FULL_LAYER_ID = 'domain-overlay-full';
const STRIPE_PREFIX = 'domain-stripe-';
const CONTESTED_SOURCE_ID = 'domain-contested-borders';
const CONTESTED_GLOW_ID = 'domain-contested-glow';
const CONTESTED_LINE_ID = 'domain-contested-line';
const BEFORE_LAYER_ID = 'district-lines';
/** Full washes and stripe bands use the same strength. Empty bands stay clear. */
const FULL_OPACITY = 0.2;
/**
 * Ground size of one colored band plus one empty band, matched to the old
 * 64px screen period at zoom 13.5. Painted into the district, so zooming
 * enlarges the bands instead of adding more of them.
 */
const STRIPE_PERIOD_MERCATOR = 64 / (512 * 2 ** 13.5);
const PIXELS_PER_PERIOD = 128;
const MAX_CANVAS_EDGE = 2048;

interface DomainOverlayProps {
  readonly map: Map | null;
  readonly districts: DistrictFeatureCollection;
  readonly sites: PublicSiteCollection;
  readonly domains: readonly DomainRecord[];
  readonly onOpenCoterie?: (key: string) => void;
}

interface DomainFillProperties {
  districtKey: string;
  mode: DistrictOverlayMode;
  color: string;
}

interface MercatorBounds {
  west: number;
  east: number;
  north: number;
  south: number;
}

const svgAspects = new globalThis.Map<string, number>();

function positiveMod(value: number, size: number) {
  return ((value % size) + size) % size;
}

function stripeCanvas(size: number, shift: number, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not paint domain stripes');
  const rgb = Number.parseInt(color.slice(1), 16);
  const red = (rgb >> 16) & 255;
  const green = (rgb >> 8) & 255;
  const blue = rgb & 255;
  const image = context.createImageData(size, size);
  const pixels = image.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Constant (x - y) runs from the top-left toward the bottom-right.
      const phase = positiveMod(x - y + shift, size);
      const index = (y * size + x) * 4;
      pixels[index] = red;
      pixels[index + 1] = green;
      pixels[index + 2] = blue;
      pixels[index + 3] = phase < size / 2 ? 255 : 0;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function fillCollection(
  districts: DistrictFeatureCollection,
  domains: readonly DomainRecord[],
): FeatureCollection<MultiPolygon, DomainFillProperties> {
  const byKey = new globalThis.Map(districts.features.map((feature) => [feature.properties.key, feature]));
  const features: Array<Feature<MultiPolygon, DomainFillProperties>> = [];
  for (const domain of domains) {
    if (domain.type !== 'overlay' || !domain.districtOverlayColor) continue;
    for (const [districtKey, mode] of Object.entries(domain.districtOverlays)) {
      const feature = byKey.get(districtKey);
      if (!feature) {
        console.error(`Domain ${domain.key} names district ${districtKey}, but that district is not on the map`);
        continue;
      }
      features.push({
        type: 'Feature',
        properties: {
          districtKey,
          mode,
          color: domain.districtOverlayColor,
        },
        geometry: feature.geometry,
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

function mercatorPoint(position: Position) {
  const longitude = position[0] ?? 0;
  const latitude = position[1] ?? 0;
  const point = MercatorCoordinate.fromLngLat([longitude, latitude]);
  return { x: point.x, y: point.y, longitude, latitude };
}

function mercatorBounds(geometry: MultiPolygon): MercatorBounds {
  const bounds: MercatorBounds = {
    west: Number.POSITIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
    north: Number.POSITIVE_INFINITY,
    south: Number.NEGATIVE_INFINITY,
  };
  for (const polygon of geometry.coordinates) {
    for (const ring of polygon) {
      for (const position of ring) {
        const point = mercatorPoint(position);
        bounds.west = Math.min(bounds.west, point.x);
        bounds.east = Math.max(bounds.east, point.x);
        bounds.north = Math.min(bounds.north, point.y);
        bounds.south = Math.max(bounds.south, point.y);
      }
    }
  }
  return bounds;
}

function corner(x: number, y: number): [number, number] {
  const lngLat = new MercatorCoordinate(x, y, 0).toLngLat();
  return [lngLat.lng, lngLat.lat];
}

function paintDistrictStripes(
  geometry: MultiPolygon,
  paints: ReadonlyArray<{ mode: DistrictOverlayMode; color: string }>,
) {
  const bounds = mercatorBounds(geometry);
  const spanX = bounds.east - bounds.west;
  const spanY = bounds.south - bounds.north;
  if (!(spanX > 0) || !(spanY > 0)) return null;
  const step = STRIPE_PERIOD_MERCATOR / PIXELS_PER_PERIOD;
  let width = Math.max(2, Math.ceil(spanX / step));
  let height = Math.max(2, Math.ceil(spanY / step));
  const longest = Math.max(width, height);
  if (longest > MAX_CANVAS_EDGE) {
    const scale = MAX_CANVAS_EDGE / longest;
    width = Math.max(2, Math.round(width * scale));
    height = Math.max(2, Math.round(height * scale));
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not paint domain stripes');
  const periodPx = STRIPE_PERIOD_MERCATOR / (spanX / width);
  const aligned = ((bounds.west - bounds.north) / STRIPE_PERIOD_MERCATOR) * periodPx;
  context.clearRect(0, 0, width, height);
  for (const paint of paints) {
    if (paint.mode !== 'halfA' && paint.mode !== 'halfB') continue;
    const tile = Math.max(2, Math.round(periodPx));
    const shift = aligned + (paint.mode === 'halfB' ? tile / 2 : 0);
    const pattern = context.createPattern(stripeCanvas(tile, shift, paint.color), 'repeat');
    if (!pattern) continue;
    context.save();
    context.beginPath();
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        ring.forEach((position, index) => {
          const point = mercatorPoint(position);
          const x = ((point.x - bounds.west) / spanX) * width;
          const y = ((point.y - bounds.north) / spanY) * height;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.closePath();
      }
    }
    context.clip('evenodd');
    context.fillStyle = pattern;
    context.fillRect(0, 0, width, height);
    context.restore();
  }
  return {
    canvas,
    coordinates: [
      corner(bounds.west, bounds.north),
      corner(bounds.east, bounds.north),
      corner(bounds.east, bounds.south),
      corner(bounds.west, bounds.south),
    ] as [[number, number], [number, number], [number, number], [number, number]],
  };
}

function ensureFillLayers(map: Map, data: FeatureCollection<MultiPolygon, DomainFillProperties>) {
  if (!map.getLayer(BEFORE_LAYER_ID)) return false;
  const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
  } else {
    map.addSource(SOURCE_ID, { type: 'geojson', data });
  }
  if (!map.getLayer(FULL_LAYER_ID)) {
    map.addLayer({
      id: FULL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      filter: ['==', ['get', 'mode'], 'full'],
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': FULL_OPACITY,
      },
    }, BEFORE_LAYER_ID);
  }
  replaceStripeLayers(map, data);
  return true;
}

function replaceStripeLayers(map: Map, data: FeatureCollection<MultiPolygon, DomainFillProperties>) {
  removeStripeLayers(map);
  const byDistrict = new globalThis.Map<string, {
    geometry: MultiPolygon;
    paints: Array<{ mode: DistrictOverlayMode; color: string }>;
  }>();
  for (const feature of data.features) {
    if (feature.properties.mode !== 'halfA' && feature.properties.mode !== 'halfB') continue;
    const existing = byDistrict.get(feature.properties.districtKey);
    if (existing) {
      existing.paints.push({ mode: feature.properties.mode, color: feature.properties.color });
    } else {
      byDistrict.set(feature.properties.districtKey, {
        geometry: feature.geometry,
        paints: [{ mode: feature.properties.mode, color: feature.properties.color }],
      });
    }
  }
  for (const [districtKey, stripe] of byDistrict) {
    const painted = paintDistrictStripes(stripe.geometry, stripe.paints);
    if (!painted) continue;
    const id = `${STRIPE_PREFIX}${districtKey}`;
    map.addSource(id, { type: 'image', coordinates: painted.coordinates });
    map.addLayer({
      id,
      type: 'raster',
      source: id,
      paint: {
        'raster-opacity': FULL_OPACITY,
        'raster-fade-duration': 0,
      },
    }, BEFORE_LAYER_ID);
    (map.getSource(id) as ImageSource).updateImage({
      image: painted.canvas,
      coordinates: painted.coordinates,
    });
  }
}

function removeStripeLayers(map: Map) {
  const style = map.getStyle();
  const layerIds = style.layers?.map((layer) => layer.id).filter((id) => id.startsWith(STRIPE_PREFIX)) ?? [];
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  for (const sourceId of Object.keys(style.sources)) {
    if (sourceId.startsWith(STRIPE_PREFIX) && map.getSource(sourceId)) map.removeSource(sourceId);
  }
}

function removeFillLayers(map: Map) {
  removeStripeLayers(map);
  if (map.getLayer(CONTESTED_LINE_ID)) map.removeLayer(CONTESTED_LINE_ID);
  if (map.getLayer(CONTESTED_GLOW_ID)) map.removeLayer(CONTESTED_GLOW_ID);
  if (map.getSource(CONTESTED_SOURCE_ID)) map.removeSource(CONTESTED_SOURCE_ID);
  if (map.getLayer(FULL_LAYER_ID)) map.removeLayer(FULL_LAYER_ID);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

function contestedBorders(
  districts: DistrictFeatureCollection,
  keys: readonly string[],
): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: keys.flatMap((key) => interiorDistrictBorders(districts, key).features),
  };
}

function syncContestedBorders(
  map: Map,
  districts: DistrictFeatureCollection,
  sites: PublicSiteCollection,
  domains: readonly DomainRecord[],
) {
  const keys = contestedDistrictKeys(
    domains,
    (siteKey) => sites.features.find((feature) => feature.properties.key === siteKey)?.properties.districtKey ?? null,
  );
  const known = new Set(districts.features.map((feature) => feature.properties.key));
  for (const key of keys) {
    if (!known.has(key)) console.error(`A contested domain names district ${key}, but that district is not on the map`);
  }
  const data = contestedBorders(districts, keys);
  const source = map.getSource(CONTESTED_SOURCE_ID) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  const layers = map.getStyle().layers ?? [];
  const lineIndex = layers.findIndex((layer) => layer.id === BEFORE_LAYER_ID);
  const beforeId = lineIndex >= 0 ? layers[lineIndex + 1]?.id : undefined;
  map.addSource(CONTESTED_SOURCE_ID, { type: 'geojson', data });
  map.addLayer({
    id: CONTESTED_GLOW_ID,
    type: 'line',
    source: CONTESTED_SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#ff2424',
      'line-width': 14,
      'line-blur': 8,
      'line-opacity': 0.9,
    },
  }, beforeId);
  map.addLayer({
    id: CONTESTED_LINE_ID,
    type: 'line',
    source: CONTESTED_SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#ff4545',
      'line-width': 2.4,
      'line-opacity': 1,
    },
  }, beforeId);
}

function screenSpan(map: Map, x: number, y: number, artboardPixels: number) {
  const start = map.project(projectArtboardPoint([x, y]));
  const end = map.project(projectArtboardPoint([x + artboardPixels, y]));
  return Math.hypot(end.x - start.x, end.y - start.y);
}

async function svgAspect(url: string) {
  const cached = svgAspects.get(url);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load domain icon ${url}`);
  const text = await response.text();
  const viewBox = /viewBox="[^"]*?([\d.]+)[,\s]+([\d.]+)"/.exec(text);
  const width = Number(viewBox?.[1]);
  const height = Number(viewBox?.[2]);
  const aspect = width > 0 && height > 0 ? height / width : 1;
  svgAspects.set(url, aspect);
  return aspect;
}

function siteCoordinates(sites: PublicSiteCollection, siteKey: string): [number, number] | null {
  const feature = sites.features.find((item) => item.properties.key === siteKey);
  if (!feature || feature.geometry.type !== 'Point') return null;
  const [longitude, latitude] = feature.geometry.coordinates;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return null;
  return [longitude, latitude];
}

interface ScaledMarker {
  readonly marker: Marker;
  readonly x: number;
  readonly y: number;
  readonly artboardPixels: number;
  readonly kind: 'label' | 'icon' | 'site';
  readonly aspect: number;
  readonly coordinates?: [number, number];
}

/** Domain names stay off the map once zoomed out past the district streets. */
const DOMAIN_LABEL_MIN_ZOOM = 12;

function screenSpanAt(map: Map, coordinates: [number, number], artboardPixels: number) {
  const [longitude, latitude] = coordinates;
  const origin = projectArtboardPoint([0, 0]);
  const shifted = projectArtboardPoint([artboardPixels, 0]);
  const start = map.project(coordinates);
  const end = map.project([longitude + (shifted[0] - origin[0]), latitude]);
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function applyMarkerScale(map: Map, markers: readonly ScaledMarker[]) {
  const labelsVisible = map.getZoom() >= DOMAIN_LABEL_MIN_ZOOM;
  for (const item of markers) {
    const pixels = item.kind === 'site' && item.coordinates
      ? screenSpanAt(map, item.coordinates, item.artboardPixels)
      : screenSpan(map, item.x, item.y, item.artboardPixels);
    const element = item.marker.getElement();
    if (item.kind === 'icon') {
      element.style.width = `${pixels}px`;
      element.style.height = `${pixels * item.aspect}px`;
    } else {
      element.style.visibility = labelsVisible ? 'visible' : 'hidden';
      element.style.fontSize = `${pixels}px`;
    }
  }
}

function labelGlow(domain: DomainRecord) {
  const colors = [domain.displayNameBorderColor, domain.displayNameBGColor, domain.displayNameColor]
    .filter((color): color is string => Boolean(color));
  const brightness = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return ((value >> 16) & 255) + ((value >> 8) & 255) + (value & 255);
  };
  return colors.sort((a, b) => brightness(b) - brightness(a))[0] ?? domain.displayNameColor;
}

function createLabelElement(domain: DomainRecord, text = domain.displayName) {
  const element = document.createElement('div');
  element.className = 'domain-map-label';
  element.style.zIndex = '2';
  element.style.color = domain.displayNameColor;
  element.style.fontFamily = domainFontFamily(domain.displayNameFont);
  if (domain.displayNameWeight === 'bold') element.style.fontWeight = 'bold';
  element.style.setProperty('--label-glow', labelGlow(domain));
  element.textContent = text;
  element.dataset.label = text;
  if (domain.displayNameBGColor) {
    element.classList.add('domain-map-label--badge');
    element.style.background = domain.displayNameBGColor;
    element.style.borderColor = domain.displayNameBorderColor ?? domain.displayNameColor;
  }
  return element;
}

function attachCoterieLabel(element: HTMLElement, domain: DomainRecord, onOpenCoterie?: (key: string) => void) {
  const coterie = coterieByKey(domain.coterie);
  if (!coterie || !onOpenCoterie) return;
  element.classList.add('domain-map-label--coterie');
  element.tabIndex = 0;
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `${coterie.displayName} coterie`);
  const open = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenCoterie(coterie.key);
  };
  element.addEventListener('click', open);
  element.addEventListener('pointerdown', (event) => event.stopPropagation());
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') open(event);
  });
}

export function DomainOverlay({ map, districts, sites, domains, onOpenCoterie }: DomainOverlayProps) {
  const scaledMarkers = useRef<ScaledMarker[]>([]);

  useEffect(() => {
    if (!map) return undefined;
    let cancelled = false;
    const data = fillCollection(districts, domains);
    const apply = () => {
      if (cancelled) return;
      if (!ensureFillLayers(map, data)) {
        map.once('idle', apply);
        return;
      }
      syncContestedBorders(map, districts, sites, domains);
    };
    apply();
    return () => {
      cancelled = true;
      map.off('idle', apply);
      removeFillLayers(map);
    };
  }, [districts, domains, map, sites]);

  useEffect(() => {
    if (!map) return undefined;
    let cancelled = false;
    const scaled: ScaledMarker[] = [];

    const addLabel = (domain: DomainRecord, coordinates: [number, number], placement: DomainRecord['namePlacements'][number]) => {
      const marker = new Marker({
        element: createLabelElement(domain, placement.displayNameOverride ?? domain.displayName),
        anchor: 'center',
        // MapLibre turns the whole marker, box included. A CSS transform here would
        // fight the marker's own position.
        rotation: placement.rotate,
        rotationAlignment: 'viewport',
      })
        .setLngLat(coordinates)
        .addTo(map);
      attachCoterieLabel(marker.getElement(), domain, onOpenCoterie);
      scaled.push({
        marker,
        x: placement.x,
        y: placement.y,
        artboardPixels: placement.fontSize,
        kind: 'label',
        aspect: 1,
      });
    };

    for (const domain of domains) {
      for (const placement of domain.namePlacements) {
        if (!placedName(placement)) continue;
        addLabel(domain, projectArtboardPoint([placement.x, placement.y]), placement);
      }
      for (const placement of domain.sitePlacements) {
        const coordinates = siteCoordinates(sites, placement.site);
        if (!coordinates) {
          console.error(`Domain ${domain.key} names site ${placement.site}, but that site is not on the map`);
          continue;
        }
        const iconPx = 1.75 * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
        const underlap = iconPx * 0.46;
        const towardIcon = iconPx / 2 - underlap;
        const element = createLabelElement(domain);
        element.classList.add('domain-map-label--site', `domain-map-label--site-${domain.orientation}`);
        element.style.setProperty('--site-underlap', `${underlap}px`);
        const marker = new Marker({
          element,
          anchor: domain.orientation === 'left' ? 'right' : 'left',
          // The site icon is bottom-centered here. The box meets its vertical middle and
          // slides far enough under the icon that the icon sits on the label background.
          offset: [domain.orientation === 'left' ? -towardIcon : towardIcon, -iconPx / 2],
        })
        .setLngLat(coordinates)
        .addTo(map);
        attachCoterieLabel(marker.getElement(), domain, onOpenCoterie);
        scaled.push({
          marker,
          x: 0,
          y: 0,
          artboardPixels: placement.fontSize,
          kind: 'site',
          aspect: 1,
          coordinates,
        });
      }
      if (!placedIcon(domain.icon)) continue;
      const icon = domain.icon;
      void svgAspect(icon.url).then((aspect) => {
        if (cancelled) return;
        const element = document.createElement('div');
        element.className = 'domain-map-icon';
        element.style.zIndex = '1';
        const glyph = document.createElement('div');
        glyph.className = 'domain-map-icon__glyph';
        glyph.style.setProperty('--icon-color', icon.color);
        glyph.style.setProperty('--icon-url', `url("${icon.url}")`);
        element.append(glyph);
        const marker = new Marker({ element, anchor: 'center' })
          .setLngLat(projectArtboardPoint([icon.x, icon.y]))
          .addTo(map);
        const item: ScaledMarker = {
          marker,
          x: icon.x,
          y: icon.y,
          artboardPixels: icon.width,
          kind: 'icon',
          aspect,
        };
        scaled.push(item);
        scaledMarkers.current = scaled;
        applyMarkerScale(map, [item]);
      }).catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : `Could not load domain icon ${icon.url}`);
      });
    }

    scaledMarkers.current = scaled;
    applyMarkerScale(map, scaled);
    const rescale = () => applyMarkerScale(map, scaledMarkers.current);
    map.on('zoom', rescale);
    map.on('move', rescale);
    return () => {
      cancelled = true;
      map.off('zoom', rescale);
      map.off('move', rescale);
      for (const item of scaledMarkers.current) item.marker.remove();
      scaledMarkers.current = [];
    };
  }, [domains, map, onOpenCoterie, sites]);

  return null;
}
