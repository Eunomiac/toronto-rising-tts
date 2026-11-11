import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { Feature, MultiPolygon } from 'geojson';
import type { DistrictFeatureProperties } from './types';

interface DistrictPanelProps {
  districts: Array<Feature<MultiPolygon, DistrictFeatureProperties>>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onClear: () => void;
}

export function DistrictPanel({ districts, selectedKey, onSelect, onClear }: DistrictPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const selected = districts.find((feature) => feature.properties.key === selectedKey) ?? null;
  const resonanceName = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

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
          <div className="district-panel__title-row">
            <h2>{selected.properties.name}</h2>
            <button type="button" onClick={onClear} aria-label="Close district details">×</button>
          </div>
          <dl className="district-panel__facts">
            <div>
              <dt>Hunting difficulty</dt>
              <dd>{selected.properties.huntingDifficulty ?? '—'}</dd>
            </div>
            <div>
              <dt>Resonance +</dt>
              <dd>{resonanceName(selected.properties.resonancePlus)}</dd>
            </div>
            <div>
              <dt>Resonance −</dt>
              <dd>{resonanceName(selected.properties.resonanceMinus)}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </aside>
  );
}
