import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { Feature, MultiPolygon } from 'geojson';
import type { MapFeatureProperties } from './types';

interface DistrictPanelProps {
  districts: Array<Feature<MultiPolygon, MapFeatureProperties>>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onClear: () => void;
}

export function DistrictPanel({ districts, selectedKey, onSelect, onClear }: DistrictPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const selected = districts.find((feature) => feature.properties.key === selectedKey) ?? null;

  useGSAP(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.fromTo(panelRef.current, { y: reducedMotion ? 0 : 18, autoAlpha: 0 }, {
      y: 0,
      autoAlpha: 1,
      duration: reducedMotion ? 0 : 0.42,
      ease: 'power2.out',
      clearProps: 'transform,opacity,visibility',
    });
  }, { dependencies: [selectedKey], revertOnUpdate: true });

  return (
    <aside ref={panelRef} className="district-panel" data-note-surface="district-panel" aria-label="District details">
      <div className="district-panel__handle" aria-hidden="true" />
      <label className="district-panel__chooser">
        <span>Choose a district</span>
        <select value={selectedKey ?? ''} onChange={(event) => event.target.value ? onSelect(event.target.value) : onClear()}>
          <option value="">Explore the map…</option>
          {[...districts]
            .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
            .map((district) => <option key={district.properties.key} value={district.properties.key}>{district.properties.name}</option>)}
        </select>
      </label>

      {selected ? (
        <div className="district-panel__content" data-testid="selected-district">
          <p className="district-panel__eyebrow">Toronto Rising district</p>
          <div className="district-panel__title-row">
            <h2>{selected.properties.name}</h2>
            <button type="button" onClick={onClear} aria-label="Close district details">×</button>
          </div>
          <p className="district-panel__placeholder">
            The map geometry is live. Player-safe hunting, resonance, domain, and site information will join this district in the next data phase.
          </p>
          <dl className="district-panel__facts">
            <div><dt>Map key</dt><dd>{selected.properties.key}</dd></div>
            <div><dt>Source</dt><dd>{selected.properties.sourceElement}</dd></div>
          </dl>
        </div>
      ) : (
        <div className="district-panel__intro">
          <p className="district-panel__eyebrow">Phase 1 map prototype</p>
          <h2>The city is waiting.</h2>
          <p>Tap a shaded district, or use the chooser above. You can pan and zoom down to street level.</p>
        </div>
      )}
    </aside>
  );
}
