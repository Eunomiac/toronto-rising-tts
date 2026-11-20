import { useEffect, useRef, useState } from 'react';
import type { DistrictFeatureProperties, NetworkDistrictFacts, PublicSiteProperties, RegionFeatureProperties } from './types';

export type IconRailMenuId = 'map-layers' | 'domains' | 'sites';

interface IconRailProps {
  regions: RegionFeatureProperties[];
  districts: DistrictFeatureProperties[];
  pathDistrict?: NetworkDistrictFacts;
  regionVisibility: Record<string, boolean>;
  selectedDistrictKey: string | null;
  sites?: PublicSiteProperties[];
  toggledSiteKeys?: readonly string[];
  onToggleRegion: (key: string) => void;
  onSelectDistrict: (key: string) => void;
  onToggleSite?: (key: string) => void;
  onFocusHub?: (key: string) => void;
}

function districtSortName(name: string) {
  return name.replace(/^the\s+/i, '');
}

const MENUS: Array<{ id: IconRailMenuId; label: string; icon: string }> = [
  { id: 'map-layers', label: 'Map Layers', icon: '/assets/icons/left_panel/map_layers.svg' },
  { id: 'domains', label: 'Domains', icon: '/assets/icons/left_panel/domains.svg' },
  { id: 'sites', label: 'Sites', icon: '/assets/icons/left_panel/sites_of_interest.svg' },
];

export function IconRail({
  regions,
  districts,
  pathDistrict,
  regionVisibility,
  selectedDistrictKey,
  sites = [],
  toggledSiteKeys = [],
  onToggleRegion,
  onSelectDistrict,
  onToggleSite,
  onFocusHub,
}: IconRailProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<IconRailMenuId | null>(null);
  const openMenuRef = useRef<IconRailMenuId | null>(null);
  openMenuRef.current = openMenu;
  const openIndex = MENUS.findIndex((menu) => menu.id === openMenu);

  const districtRows: Array<{ key: string; name: string; disabled?: boolean }> = [
    ...districts.map((district) => ({ key: district.key, name: district.name })),
    ...(pathDistrict ? [{ key: pathDistrict.key, name: pathDistrict.name }] : []),
    { key: 'Sewers', name: 'The Sewers', disabled: true },
    { key: 'Subway', name: 'The Subway', disabled: true },
  ].sort((a, b) => districtSortName(a.name).localeCompare(districtSortName(b.name), 'en', { sensitivity: 'base' }));
  const bySiteName = (left: PublicSiteProperties, right: PublicSiteProperties) => (
    districtSortName(left.name).localeCompare(districtSortName(right.name), 'en', { sensitivity: 'base' })
  );
  const hubSites = sites.filter((site) => site.hub).sort(bySiteName);
  const otherSites = sites.filter((site) => !site.hub).sort(bySiteName);

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

  const open = MENUS[openIndex];

  return (
    <nav ref={rootRef} className="icon-rail" data-note-surface="layer-controls" aria-label="Map menus" data-gsap="icon-rail">
      <div className="icon-rail__column">
        {MENUS.map((menu) => {
          const isOpen = openMenu === menu.id;
          return (
            <button
              key={menu.id}
              type="button"
              className={`icon-rail__button${isOpen ? ' is-open' : ''}`}
              data-gsap={`rail-face-${menu.id}`}
              aria-label={menu.label}
              aria-expanded={isOpen}
              aria-controls={isOpen ? `icon-rail-body-${menu.id}` : undefined}
              onClick={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
            >
              <span className="icon-rail__diamond" aria-hidden="true" />
              <span className="icon-rail__glyph" style={{ ['--glyph' as string]: `url(${menu.icon})` }} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {open ? (
        <div
          id={`icon-rail-body-${open.id}`}
          className={`icon-rail__panel${open.id === 'sites' ? ' icon-rail__panel--wide' : ''}`}
          style={{ ['--rail-open-index' as string]: openIndex }}
          data-gsap={`rail-body-${open.id}`}
        >
          <p className="icon-rail__title">{open.label}</p>
          {open.id === 'map-layers' ? (
            <div className="icon-rail__list">
              {regions.map((region) => {
                const selected = Boolean(regionVisibility[region.key]);
                return (
                  <button
                    key={region.key}
                    type="button"
                    className={`icon-rail__option icon-rail__option--region${selected ? ' is-selected' : ''}`}
                    aria-label={region.name}
                    aria-pressed={selected}
                    onClick={() => onToggleRegion(region.key)}
                  >
                    {region.name}
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
                    className={`icon-rail__option icon-rail__option--district${selected ? ' is-selected' : ''}${district.disabled ? ' is-disabled' : ''}`}
                    disabled={district.disabled}
                    aria-label={district.name}
                    aria-pressed={selected}
                    onClick={() => onSelectDistrict(district.key)}
                  >
                    {district.name}
                  </button>
                );
              })}
            </div>
          ) : open.id === 'sites' ? (
            <div className="icon-rail__list">
              {hubSites.map((site) => (
                <button
                  key={site.key}
                  type="button"
                  className="icon-rail__option icon-rail__option--hub"
                  aria-label={site.name}
                  title={site.name}
                  onClick={() => onFocusHub?.(site.key)}
                >
                  {site.name}
                </button>
              ))}
              {hubSites.length > 0 && otherSites.length > 0 ? <div className="icon-rail__gap" aria-hidden="true" /> : null}
              {otherSites.map((site) => {
                const selected = toggledSiteKeys.includes(site.key);
                return (
                  <button
                    key={site.key}
                    type="button"
                    className={`icon-rail__option icon-rail__option--site${selected ? ' is-selected' : ''}`}
                    aria-label={site.name}
                  title={site.name}
                    aria-pressed={selected}
                    onClick={() => onToggleSite?.(site.key)}
                  >
                    {site.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="icon-rail__empty">Nothing revealed yet.</p>
          )}
        </div>
      ) : null}
    </nav>
  );
}
