import { useEffect, useRef, useState, type ReactNode } from 'react';
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
const HOVER_SCALE = 1.25;
const GLYPH_REST = '#e6c36a';
const GLYPH_HOVER = '#ffffff';

function IconRailItem({
  menu,
  isOpen,
  wide,
  onToggle,
  children,
}: {
  menu: (typeof MENUS)[number];
  isOpen: boolean;
  wide?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const openTl = useRef<gsap.core.Timeline | null>(null);
  const entryTl = useRef<gsap.core.Tween | null>(null);
  const playOpenRef = useRef<() => void>(() => {});
  const isOpenRef = useRef(isOpen);
  const shownRef = useRef(isOpen);
  const [, setGeneration] = useState(0);
  isOpenRef.current = isOpen;
  if (isOpen) shownRef.current = true;
  const skipMotion = import.meta.env.MODE === 'test'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shown = skipMotion ? isOpen : isOpen || shownRef.current;

  useGSAP((_context, contextSafe) => {
    const item = itemRef.current;
    if (!item || !contextSafe || skipMotion) return;
    const button = item.querySelector<HTMLElement>('.icon-rail__button');
    const lift = item.querySelector<HTMLElement>('.icon-rail__lift');
    const expand = item.querySelector<HTMLElement>('.icon-rail__expand');
    const diamond = item.querySelector<HTMLElement>('.icon-rail__diamond');
    const glyph = item.querySelector<HTMLElement>('.icon-rail__glyph');
    const hoverLabel = item.querySelector<HTMLElement>('.icon-rail__hover-label');
    const header = item.querySelector<HTMLElement>('.icon-rail__header');
    const panel = item.querySelector<HTMLElement>('.icon-rail__panel');
    const sheet = item.querySelector<HTMLElement>('.icon-rail__sheet');
    if (!button || !lift || !expand || !diamond || !glyph || !hoverLabel || !header || !panel || !sheet) return;

    const wasHidden = panel.hidden;
    panel.hidden = false;
    const menuWidth = panel.offsetWidth;
    const buttonWidth = button.offsetWidth;
    panel.hidden = wasHidden;
    if (menuWidth === 0 || buttonWidth === 0) return;

    const headerWidth = Math.max(0, menuWidth - (buttonWidth * HOVER_SCALE));
    const finishClose = contextSafe(() => {
      if (isOpenRef.current) return;
      shownRef.current = false;
      setGeneration((value) => value + 1);
    });
    const busy = () => isOpenRef.current || (openTl.current?.totalProgress() ?? 0) > 0.001;

    gsap.set(hoverLabel, { xPercent: -100 });
    gsap.set(lift, { transformOrigin: 'left center', scale: 1 });
    gsap.set(expand, { transformOrigin: 'left center', scaleX: 1 });
    gsap.set(header, { width: 0 });
    gsap.set(panel, { height: 0, overflow: 'hidden' });
    gsap.set(sheet, { yPercent: -100 });

    const liftScale = { scale: 1 };
    const applyLiftScale = () => gsap.set(lift, { scale: liftScale.scale, transformOrigin: 'left center' });
    const tl = gsap.timeline({
      paused: true,
      onReverseComplete: () => {
        finishClose();
        if (button.matches(':hover')) playHover();
      },
    });
    tl.addLabel('spin', 0);
    tl.to(diamond, {
      rotation: -45,
      scale: DIAMOND_SQUARE_SCALE,
      duration: 0.26,
      ease: 'power2.inOut',
      transformOrigin: '50% 50%',
    }, 'spin');
    tl.addLabel('grow', 'spin+=0.26');
    tl.fromTo(liftScale, { scale: 1 }, {
      scale: HOVER_SCALE,
      duration: 0.16,
      ease: 'power2.out',
      immediateRender: false,
      onUpdate: applyLiftScale,
    }, 'grow');
    tl.addLabel('expand', 'grow+=0.16');
    tl.to(expand, {
      scaleX: menuWidth / (buttonWidth * HOVER_SCALE),
      duration: 0.3,
      ease: 'power2.out',
      transformOrigin: 'left center',
    }, 'expand');
    tl.fromTo(header, { width: 0 }, {
      width: headerWidth,
      duration: 0.3,
      ease: 'power2.out',
      immediateRender: false,
    }, 'expand');
    tl.addLabel('menu', 'expand+=0.3');
    tl.to(panel, { height: 'auto', duration: 0.36, ease: 'power2.inOut' }, 'menu');
    tl.fromTo(sheet, { yPercent: -100 }, {
      yPercent: 0,
      duration: 0.36,
      ease: 'power2.out',
      immediateRender: false,
    }, 'menu');
    openTl.current = tl;

    const playHover = () => {
      if (busy()) return;
      gsap.to(lift, { scale: HOVER_SCALE, duration: 0.22, ease: 'power2.out', transformOrigin: 'left center', overwrite: 'auto' });
      gsap.to(glyph, { backgroundColor: GLYPH_HOVER, duration: 0.22, overwrite: 'auto' });
      gsap.to(hoverLabel, { xPercent: 0, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
    };
    const stopHover = () => {
      if (busy()) return;
      gsap.to(lift, { scale: 1, duration: 0.2, ease: 'power2.inOut', transformOrigin: 'left center', overwrite: 'auto' });
      gsap.to(glyph, { backgroundColor: GLYPH_REST, duration: 0.2, overwrite: 'auto' });
      gsap.to(hoverLabel, { xPercent: -100, duration: 0.22, ease: 'power2.in', overwrite: 'auto' });
    };
    const playOpen = contextSafe(() => {
      const timeline = openTl.current;
      if (!timeline) return;
      entryTl.current?.kill();
      gsap.killTweensOf([lift, glyph, hoverLabel]);
      gsap.to(hoverLabel, { xPercent: -100, duration: 0.16, ease: 'power2.in', overwrite: 'auto' });
      gsap.to(glyph, { backgroundColor: GLYPH_REST, duration: 0.16, overwrite: 'auto' });
      const alreadyBig = Number(gsap.getProperty(lift, 'scale')) > 1.08;
      timeline.invalidate().timeScale(1).pause(0);
      const entry = timeline.tweenFromTo(0, 'grow', {
        onComplete: () => {
          if (!isOpenRef.current) return;
          if (alreadyBig) {
            timeline.seek('expand');
            liftScale.scale = HOVER_SCALE;
            applyLiftScale();
          }
          timeline.timeScale(1).play();
        },
      });
      entryTl.current = entry;
    });

    playOpenRef.current = playOpen;
    button.addEventListener('pointerenter', playHover);
    button.addEventListener('pointerleave', stopHover);
    return () => {
      entryTl.current?.kill();
      button.removeEventListener('pointerenter', playHover);
      button.removeEventListener('pointerleave', stopHover);
    };
  }, { scope: itemRef });

  useEffect(() => {
    if (skipMotion) return;
    const timeline = openTl.current;
    if (!timeline) return;
    if (isOpen) {
      playOpenRef.current();
      return;
    }
    if (timeline.totalProgress() === 0 && !entryTl.current?.isActive()) return;
    entryTl.current?.kill();
    timeline.timeScale(2).reverse();
  }, [isOpen, skipMotion]);

  return (
    <div ref={itemRef} className={`icon-rail__item${shown ? ' is-open' : ''}`}>
      <button
        type="button"
        className="icon-rail__button"
        data-gsap={`rail-face-${menu.id}`}
        aria-label={menu.label}
        aria-expanded={isOpen}
        aria-controls={`icon-rail-body-${menu.id}`}
        onClick={onToggle}
      >
        <span className="icon-rail__lift">
          <span className="icon-rail__expand">
            <span className="icon-rail__diamond" aria-hidden="true" />
          </span>
          <span className="icon-rail__glyph" style={{ ['--glyph' as string]: `url(${menu.icon})` }} aria-hidden="true" />
        </span>
        <span className="icon-rail__hover-window" aria-hidden="true">
          <span className="icon-rail__hover-label">{menu.label}</span>
        </span>
        <span className="icon-rail__header" aria-hidden="true">
          <span className="icon-rail__header-text">{menu.label}</span>
        </span>
      </button>
      <div
        id={`icon-rail-body-${menu.id}`}
        className={`icon-rail__panel${wide ? ' icon-rail__panel--wide' : ''}`}
        data-gsap={`rail-body-${menu.id}`}
        hidden={!shown}
      >
        <div className="icon-rail__sheet">
          {children}
        </div>
      </div>
    </div>
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

  return (
    <nav ref={rootRef} className="icon-rail" data-note-surface="layer-controls" aria-label="Map menus" data-gsap="icon-rail">
      <div className="icon-rail__column">
        {MENUS.map((menu) => {
          const isOpen = openMenu === menu.id;
          return (
            <IconRailItem
              key={menu.id}
              menu={menu}
              isOpen={isOpen}
              wide={menu.id === 'sites'}
              onToggle={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
            >
          {menu.id === 'map-layers' ? (
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
          ) : menu.id === 'sites' ? (
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
            </IconRailItem>
          );
        })}
      </div>
    </nav>
  );
}
