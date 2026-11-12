import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { Feature, MultiPolygon } from 'geojson';
import type { DistrictFeatureProperties, NetworkDistrictFacts } from './types';

interface DistrictPanelProps {
  districts: Array<Feature<MultiPolygon, DistrictFeatureProperties>>;
  pathDistrict?: NetworkDistrictFacts;
  selectedKey: string | null;
  onClear: () => void;
}

export function DistrictPanel({ districts, pathDistrict, selectedKey, onClear }: DistrictPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const choices = [...districts.map((feature) => feature.properties), ...(pathDistrict ? [pathDistrict] : [])];
  const selected = choices.find((district) => district.key === selectedKey) ?? null;
  const resonanceName = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  useGSAP(() => {
    if (!selected || !panelRef.current) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || import.meta.env.MODE === 'test';
    if (reducedMotion) {
      gsap.set(panelRef.current, { clearProps: 'transform,opacity,visibility' });
      return;
    }
    gsap.fromTo(panelRef.current, { y: 18, autoAlpha: 0 }, {
      y: 0,
      autoAlpha: 1,
      duration: 0.42,
      ease: 'power2.out',
      clearProps: 'transform,opacity,visibility',
    });
  }, { dependencies: [selectedKey], revertOnUpdate: true });

  if (!selected) return null;

  return (
    <aside
      ref={panelRef}
      className="district-panel"
      data-note-surface="district-panel"
      data-gsap="district-panel"
      aria-label="District details"
    >
      <div className="district-panel__handle" aria-hidden="true" />
      <div className="district-panel__content" data-testid="selected-district">
        <div className="district-panel__title-row">
          <h2 data-gsap="district-panel-title">{selected.name}</h2>
          <button type="button" onClick={onClear} aria-label="Close district details">×</button>
        </div>
        <dl className="district-panel__facts">
          <div>
            <dt>Hunting difficulty</dt>
            <dd>{selected.huntingDifficulty ?? '—'}</dd>
          </div>
          <div>
            <dt>Resonance +</dt>
            <dd>{resonanceName(selected.resonancePlus)}</dd>
          </div>
          <div>
            <dt>Resonance −</dt>
            <dd>{resonanceName(selected.resonanceMinus)}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
