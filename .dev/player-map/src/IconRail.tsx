import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
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

// The diamond art is a square rotated 45° inside a 129 viewBox. Counter-rotating
// and scaling by this ratio stands that square up at the button's full size.
const DIAMOND_SQUARE_SCALE = 129 / 90.5097;

function IconRailButton({
  menu,
  isOpen,
  onToggle,
}: {
  menu: (typeof MENUS)[number];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useGSAP((_context, contextSafe) => {
    const button = buttonRef.current;
    if (!button || !contextSafe) return;
    const shape = button.querySelector<HTMLElement>('.icon-rail__shape');
    const diamond = button.querySelector<HTMLElement>('.icon-rail__diamond');
    const label = button.querySelector<HTMLElement>('.icon-rail__label');
    if (!shape || !diamond || !label) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || import.meta.env.MODE === 'test';
    if (reducedMotion || button.offsetWidth === 0) return;

    let detach = () => {};
    let cancelled = false;
    const start = () => {
      if (cancelled || button.offsetWidth === 0) return;
      const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const extension = (0.4 * rootFont) + label.scrollWidth + (0.55 * rootFont);
      const scaleX = (button.offsetWidth + extension) / button.offsetWidth;
      const hover = gsap.timeline({ paused: true });
      hover
        .to(diamond, {
          rotation: -45,
          scale: DIAMOND_SQUARE_SCALE,
          duration: 0.22,
          ease: 'power2.inOut',
          transformOrigin: '50% 50%',
        })
        .to(shape, {
          scaleX,
          duration: 0.28,
          ease: 'power2.out',
          transformOrigin: '100% 50%',
        })
        .to(label, { autoAlpha: 1, duration: 0.16, ease: 'power1.out' }, '<0.08');

      const play = contextSafe(() => { hover.play(); });
      const reverse = contextSafe(() => { hover.reverse(); });
      button.addEventListener('pointerenter', play);
      button.addEventListener('pointerleave', reverse);
      detach = () => {
        button.removeEventListener('pointerenter', play);
        button.removeEventListener('pointerleave', reverse);
      };
    };

    if (!document.fonts || document.fonts.status === 'loaded') start();
    else void document.fonts.ready.then(start);
    return () => {
      cancelled = true;
      detach();
    };
  }, { scope: buttonRef });

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`icon-rail__button${isOpen ? ' is-open' : ''}`}
      data-gsap={`rail-face-${menu.id}`}
      aria-label={menu.label}
      aria-expanded={isOpen}
      aria-controls={isOpen ? `icon-rail-body-${menu.id}` : undefined}
      onClick={onToggle}
    >
      <span className="icon-rail__shape">
        <span className="icon-rail__diamond" aria-hidden="true" />
      </span>
      <span className="icon-rail__glyph" style={{ ['--glyph' as string]: `url(${menu.icon})` }} aria-hidden="true" />
      <span className="icon-rail__label" aria-hidden="true">{menu.label}</span>
    </button>
  );
}

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
            <IconRailButton
              key={menu.id}
              menu={menu}
              isOpen={isOpen}
              onToggle={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
            />
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
