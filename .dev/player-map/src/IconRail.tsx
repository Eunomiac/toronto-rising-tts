import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { DistrictFeatureProperties, NetworkDistrictFacts, RegionFeatureProperties } from './types';

export type IconRailMenuId = 'map-layers' | 'domains' | 'sites';

interface IconRailProps {
  regions: RegionFeatureProperties[];
  districts: DistrictFeatureProperties[];
  pathDistrict?: NetworkDistrictFacts;
  regionVisibility: Record<string, boolean>;
  selectedDistrictKey: string | null;
  onToggleRegion: (key: string) => void;
  onSelectDistrict: (key: string) => void;
}

const MENUS: Array<{ id: IconRailMenuId; label: string; icon: 'layers' | 'domains' | 'sites' }> = [
  { id: 'map-layers', label: 'Map Layers', icon: 'layers' },
  { id: 'domains', label: 'Domains', icon: 'domains' },
  { id: 'sites', label: 'Sites', icon: 'sites' },
];

function MenuIcon({ kind }: { kind: 'layers' | 'domains' | 'sites' }) {
  if (kind === 'layers') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4 3 9l9 5 9-5-9-5Zm-9 8 9 5 9-5M3 16l9 5 9-5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (kind === 'domains') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 20V9l7-5 7 5v11H5Zm4-8h6M9 16h6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="11" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function IconRail({
  regions,
  districts,
  pathDistrict,
  regionVisibility,
  selectedDistrictKey,
  onToggleRegion,
  onSelectDistrict,
}: IconRailProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<IconRailMenuId | null>(null);
  const openMenuRef = useRef<IconRailMenuId | null>(null);
  openMenuRef.current = openMenu;

  const districtRows: Array<{ key: string; name: string; disabled?: boolean }> = [
    ...districts
      .map((district) => ({ key: district.key, name: district.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    ...(pathDistrict ? [{ key: pathDistrict.key, name: pathDistrict.name }] : []),
    { key: 'Sewers', name: 'The Sewers', disabled: true },
    { key: 'Subway', name: 'The Subway', disabled: true },
  ];

  useGSAP(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || import.meta.env.MODE === 'test';
    const root = rootRef.current;
    if (!root) return;
    for (const menu of MENUS) {
      const face = root.querySelector<HTMLElement>(`[data-gsap="rail-face-${menu.id}"]`);
      const icon = face?.querySelector<HTMLElement>('.icon-rail__icon');
      const label = root.querySelector<HTMLElement>(`[data-gsap="rail-label-${menu.id}"]`);
      const body = root.querySelector<HTMLElement>(`[data-gsap="rail-body-${menu.id}"]`);
      if (!face || !label || !body) continue;
      const isOpen = openMenu === menu.id;
      gsap.killTweensOf([face, label, body]);
      if (icon) gsap.killTweensOf(icon);
      if (reduced) {
        gsap.set(face, { rotation: isOpen ? 0 : 45, width: isOpen ? '11.5rem' : '2.75rem', borderRadius: isOpen ? 0 : 2 });
        if (icon) gsap.set(icon, { rotation: isOpen ? 0 : -45 });
        gsap.set(label, { autoAlpha: isOpen ? 1 : 0 });
        gsap.set(body, { clearProps: 'height,opacity,visibility' });
        continue;
      }
      if (isOpen) {
        const timeline = gsap.timeline();
        timeline
          .to(face, { rotation: 0, duration: 0.22, ease: 'power2.out' }, 0)
          .to(face, { width: '11.5rem', borderRadius: 0, duration: 0.28, ease: 'power2.out' }, 0.12)
          .to(label, { autoAlpha: 1, duration: 0.18 }, 0.22)
          .fromTo(body, { height: 0, autoAlpha: 0 }, { height: 'auto', autoAlpha: 1, duration: 0.34, ease: 'power2.out' }, 0.28);
        if (icon) timeline.to(icon, { rotation: 0, duration: 0.22, ease: 'power2.out' }, 0);
      } else {
        gsap.set(face, { rotation: 45, width: '2.75rem', borderRadius: 2 });
        if (icon) gsap.set(icon, { rotation: -45 });
        gsap.set(label, { autoAlpha: 0 });
        gsap.set(body, { height: 0, autoAlpha: 0 });
      }
    }
  }, { dependencies: [openMenu], scope: rootRef });

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!openMenuRef.current || !rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const hoverIn = (element: HTMLElement | null) => {
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.to(element, { scale: 1.08, filter: 'brightness(1.25)', duration: 0.16, ease: 'power2.out' });
  };
  const hoverOut = (element: HTMLElement | null) => {
    if (!element) return;
    gsap.to(element, { scale: 1, filter: 'brightness(1)', duration: 0.18, ease: 'power2.out' });
  };

  return (
    <nav ref={rootRef} className="icon-rail" data-note-surface="layer-controls" aria-label="Map menus" data-gsap="icon-rail">
      {MENUS.map((menu) => {
        const isOpen = openMenu === menu.id;
        return (
          <div
            key={menu.id}
            className={`icon-rail__item${isOpen ? ' is-open' : ''}`}
            data-gsap={`rail-item-${menu.id}`}
          >
            <button
              type="button"
              className="icon-rail__face"
              data-gsap={`rail-face-${menu.id}`}
              aria-label={menu.label}
              aria-expanded={isOpen}
              aria-controls={`icon-rail-body-${menu.id}`}
              onMouseEnter={(event) => hoverIn(event.currentTarget)}
              onMouseLeave={(event) => hoverOut(event.currentTarget)}
              onClick={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
            >
              <span className="icon-rail__icon" aria-hidden="true"><MenuIcon kind={menu.icon} /></span>
              <span className="icon-rail__label" data-gsap={`rail-label-${menu.id}`}>{menu.label}</span>
            </button>
            <div
              id={`icon-rail-body-${menu.id}`}
              className="icon-rail__body"
              data-gsap={`rail-body-${menu.id}`}
              hidden={!isOpen}
            >
              {menu.id === 'map-layers' ? (
                <div className="icon-rail__list">
                  {regions.map((region) => {
                    const selected = Boolean(regionVisibility[region.key]);
                    return (
                      <button
                        key={region.key}
                        type="button"
                        className={`icon-rail__option${selected ? ' is-selected' : ''}`}
                        data-gsap={`rail-option-region-${region.key}`}
                        aria-label={region.name}
                        aria-pressed={selected}
                        onMouseEnter={(event) => hoverIn(event.currentTarget)}
                        onMouseLeave={(event) => hoverOut(event.currentTarget)}
                        onClick={() => onToggleRegion(region.key)}
                      >
                        <span>{region.name}</span>
                      </button>
                    );
                  })}
                  <div className="icon-rail__gap" aria-hidden="true" />
                  {districtRows.map((district) => {
                    const selected = selectedDistrictKey === district.key;
                    return (
                      <button
                        key={district.key}
                        type="button"
                        className={`icon-rail__option${selected ? ' is-selected' : ''}${district.disabled ? ' is-disabled' : ''}`}
                        data-gsap={`rail-option-district-${district.key}`}
                        disabled={district.disabled}
                        aria-label={district.name}
                        aria-pressed={selected}
                        onMouseEnter={(event) => hoverIn(event.currentTarget)}
                        onMouseLeave={(event) => hoverOut(event.currentTarget)}
                        onClick={() => onSelectDistrict(district.key)}
                      >
                        <span>{district.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="icon-rail__empty">Nothing revealed yet.</p>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
