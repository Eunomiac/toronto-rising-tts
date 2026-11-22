import { describe, expect, it } from 'vitest';
import {
  DOMAIN_CATALOG,
  EMPTY_DOMAIN_SELECTION,
  contestedDistrictKeys,
  domainMenu,
  domainMenuItemSelected,
  parseDomainCatalog,
  projectArtboardPoint,
  splitDomainMenu,
  stripJsonComments,
  toggleDomainAffiliation,
  toggleDomainKey,
  toggleDomainMenuItem,
  type DomainCatalog,
} from './domains';

function labelDomain(
  displayName: string,
  affiliation: string,
  order = 0,
  menuItem: string | null = null,
  fontSize = 10,
) {
  return JSON.stringify({
    type: 'label',
    displayName,
    displayNameFont: 'PenumbraFlare',
    displayNameColor: '#FFFFFF',
    displayNamePositionData: [{ x: 10, y: 20, fontSize }],
    affiliations: [affiliation],
    order,
    ...(menuItem ? { menuItem } : {}),
  });
}

const FIXTURE = parseDomainCatalog(`{
  "alpha": {
    "type": "label",
    "displayName": "Alpha",
    "displayNameFont": "PenumbraFlare",
    "displayNameColor": "#FFFFFF",
    "displayNamePositionData": [{ "x": 1, "y": 2, "fontSize": 10 }],
    "affiliations": ["A", "C"]
  },
  "beta": {
    "type": "label",
    "displayName": "Beta",
    "displayNameFont": "PenumbraFlare",
    "displayNameColor": "#FFFFFF",
    "displayNamePositionData": [{ "x": 1, "y": 2, "fontSize": 10 }],
    "affiliations": ["A"]
  },
  "gamma": {
    "type": "label",
    "displayName": "Gamma",
    "displayNameFont": "PenumbraFlare",
    "displayNameColor": "#FFFFFF",
    "displayNamePositionData": [{ "site": "Example" }],
    "affiliations": ["B"],
    "menuItem": "Bundle"
  },
  "delta": {
    "type": "label",
    "displayName": "Delta",
    "displayNameFont": "PenumbraFlare",
    "displayNameColor": "#FFFFFF",
    "displayNamePositionData": [{ "x": 1, "y": 2, "fontSize": 10 }],
    "affiliations": ["B", "C"],
    "menuItem": "Bundle"
  }
}`);

function keys(catalog: DomainCatalog, selection: ReturnType<typeof toggleDomainAffiliation>) {
  return {
    domains: [...selection.domainKeys],
    affiliations: [...selection.affiliations],
    catalogSize: catalog.domains.length,
  };
}

describe('domain catalog', () => {
  it('ignores comments and keeps strings that look like comments', () => {
    const parsed = parseDomainCatalog(`{
      // hidden
      "kept": {
        "type": "overlay",
        "displayName": "Keep // this",
        "displayNameFont": "PenumbraFlare",
        "displayNameColor": "#FFFFFF",
        "displayNamePositionData": [{ "x": 0, "y": 0, "fontSize": 12 }],
        "districtOverlays": { "Humewood": "full" },
        "districtOverlayColor": "#FFFFFF",
        "affiliations": ["Independent"]
      }
      /* "skipped": { "displayName": "nope" } */
    }`);
    expect(parsed.domains.map((domain) => domain.key)).toEqual(['kept']);
    expect(parsed.domains[0]?.displayName).toBe('Keep // this');
    expect(stripJsonComments('{"a": "/* not a comment */"}')).toContain('not a comment');
  });

  it('reads the active domains from the authored file', () => {
    expect(DOMAIN_CATALOG.domains.some((domain) => domain.key === 'bertrice')).toBe(true);
    const bertrice = DOMAIN_CATALOG.domains.find((domain) => domain.key === 'bertrice');
    expect(bertrice?.affiliations).toEqual(['Independent']);
    expect(bertrice?.districtOverlays).toEqual({ Humewood: 'full', DeerPark: 'full' });
    expect(bertrice?.namePlacements[0]).toMatchObject({ x: 1191, y: 389, fontSize: 200 });
    const fiveKeys = DOMAIN_CATALOG.domains.find((domain) => domain.key === 'fiveKeys');
    expect(fiveKeys?.districtOverlays.DupontByTheCastle).toBe('halfA');
    expect(fiveKeys?.districtOverlayColor).toBe('#FFD800');
    expect(fiveKeys?.namePlacements[0]?.displayNameOverride).toBe('Five\nKeys');
    expect(fiveKeys?.coterie).toBe('fiveKeys');
    expect(bertrice?.coterie).toBeNull();
    expect(bertrice?.displayNameWeight).toBeNull();
    expect(DOMAIN_CATALOG.domains.find((domain) => domain.key === 'redeemersRen')?.displayNameWeight).toBe('bold');
    expect(DOMAIN_CATALOG.domains.find((domain) => domain.key === 'theLineContested')?.displayNameWeight).toBe('bold');
    const line = DOMAIN_CATALOG.domains.find((domain) => domain.key === 'theLineContested');
    expect(line?.namePlacements.map((placement) => placement.rotate)).toEqual([0, 72]);
    expect(DOMAIN_CATALOG.domains.find((domain) => domain.key === 'flyCooksContested')?.orientation).toBe('left');
    expect(DOMAIN_CATALOG.domains.find((domain) => domain.key === 'flyCooksContested')?.sitePlacements[0]?.fontSize).toBe(45);
    expect(DOMAIN_CATALOG.domains.find((domain) => domain.key === 'midnightMass')?.orientation).toBe('right');
    const court = DOMAIN_CATALOG.domains.find((domain) => domain.key === 'princesCourt');
    expect(court?.districtOverlays.DupontByTheCastle).toBe('halfB');
    expect(court?.districtOverlayColor).toBe('#DD0000');
    const menu = domainMenu(DOMAIN_CATALOG);
    expect(menu.map((group) => group.affiliation)).toEqual(['Independent', 'Camarilla', 'Anarchs', 'Contested']);
    expect(menu[0]?.entries.map((entry) => entry.label)).toEqual(['Bertrice', 'Island-Devil', 'Hecata', 'Fly Cooks']);
    expect(menu[1]?.entries.map((entry) => entry.label)).toEqual([
      'The Court', 'Five Keys', 'Moon Club', 'University Chantry',
      'Free Chantry', 'Iron Guard', 'Midnight Mass', 'Scarlett & the Boys',
    ]);
    expect(menu[2]?.entries.map((entry) => entry.label)).toEqual([
      'Jarvis Jacks', 'The Line', 'Red Flag', 'Redeemers',
      'The Everymen', 'House of Rustovich', 'Men-In-Black', 'Nightwolves', 'Open Sanctum',
    ]);
    expect(menu[3]?.entries).toEqual([]);
    const redeemers = menu[2]?.entries.find((entry) => entry.menuItem === 'Redeemers');
    expect(redeemers?.domainKeys).toEqual([
      'redeemersRen', 'redeemersKai', 'redeemersAlexandraContested', 'redeemersTylerContested',
    ]);
    expect(menu[2]?.entries.some((entry) => entry.label.includes('Ren'))).toBe(false);
  });

  it('sorts rows by order, then by name, and ignores the word the', () => {
    const catalog = parseDomainCatalog(`{
      "court": ${labelDomain('The Court', 'A', 0)},
      "five": ${labelDomain('Five Keys', 'A', 0)},
      "alpha": ${labelDomain('Alpha', 'A', 2)},
      "warn": ${labelDomain('⚠️ Fly\nCooks', 'A', 1)},
      "theater": ${labelDomain('Theater', 'A', 0)},
      "boys": ${labelDomain('Scarlett\n& the Boys', 'A', 0)},
      "high": ${labelDomain('High Bundle', 'A', 3, 'Bundle')},
      "low": ${labelDomain('Low Bundle', 'A', 0, 'Bundle')}
    }`);
    expect(domainMenu(catalog)[0]?.entries.map((entry) => entry.label)).toEqual([
      'Bundle',
      'Alpha',
      'Fly Cooks',
      'The Court',
      'Five Keys',
      'Scarlett & the Boys',
      'Theater',
    ]);
  });

  it('glows the districts a contested label lists, and a contested site\'s own district', () => {
    const catalog = parseDomainCatalog(`{
      "site": {
        "type": "site",
        "displayName": "⚠️ Fly Cooks",
        "displayNameFont": "CormorantGaramond",
        "displayNameColor": "#FFDD00",
        "displayNamePositionData": [{ "site": "Kensington" }],
        "affiliations": ["Independent", "Contested"]
      },
      "line": {
        "type": "label",
        "displayName": "⚠️ The Line",
        "displayNameFont": "WolvesEngraven",
        "displayNameColor": "#FF0000",
        "displayNamePositionData": [{ "x": 0, "y": 0, "fontSize": 0 }],
        "districts": ["Cabbagetown", "RegentPark"],
        "affiliations": ["Anarchs", "Contested"]
      },
      "quiet": {
        "type": "label",
        "displayName": "Bertrice",
        "displayNameFont": "PenumbraFlare",
        "displayNameColor": "#FFFFFF",
        "displayNamePositionData": [{ "x": 1, "y": 2, "fontSize": 10 }],
        "districts": ["Rosedale"],
        "affiliations": ["Independent"]
      },
      "unlisted": ${labelDomain('⚠️ Unlisted', 'Contested', 0, null, 12)}
    }`);
    expect(contestedDistrictKeys(
      catalog.domains,
      (siteKey) => (siteKey === 'Kensington' ? 'HarbordVillage' : null),
    )).toEqual(['HarbordVillage', 'Cabbagetown', 'RegentPark']);
  });

  it('places an artboard point on the Toronto map', () => {
    const [longitude, latitude] = projectArtboardPoint([1191, 389]);
    expect(longitude).toBeGreaterThan(-79.46);
    expect(longitude).toBeLessThan(-79.39);
    expect(latitude).toBeGreaterThan(43.67);
    expect(latitude).toBeLessThan(43.72);
  });
});

describe('domain selection', () => {
  it('turns on every domain in an affiliation and turns that affiliation off only when none remain', () => {
    const enabled = toggleDomainAffiliation(EMPTY_DOMAIN_SELECTION, FIXTURE, 'A');
    expect(keys(FIXTURE, enabled)).toMatchObject({ domains: ['alpha', 'beta'], affiliations: ['A'] });

    const oneOff = toggleDomainKey(enabled, FIXTURE, 'beta');
    expect(keys(FIXTURE, oneOff)).toMatchObject({ domains: ['alpha'], affiliations: ['A'] });

    const allOff = toggleDomainKey(oneOff, FIXTURE, 'alpha');
    expect(keys(FIXTURE, allOff)).toMatchObject({ domains: [], affiliations: [] });
  });

  it('does not light an affiliation just because its domains were chosen one by one', () => {
    const manual = toggleDomainKey(EMPTY_DOMAIN_SELECTION, FIXTURE, 'gamma');
    expect(keys(FIXTURE, manual)).toMatchObject({ domains: ['gamma'], affiliations: [] });
  });

  it('clicking a lit affiliation clears its domains without keeping another affiliation that lost its last domain', () => {
    const both = toggleDomainAffiliation(
      toggleDomainAffiliation(EMPTY_DOMAIN_SELECTION, FIXTURE, 'A'),
      FIXTURE,
      'B',
    );
    expect(keys(FIXTURE, both).domains.sort()).toEqual(['alpha', 'beta', 'delta', 'gamma']);

    const clearedA = toggleDomainAffiliation(both, FIXTURE, 'A');
    expect(keys(FIXTURE, clearedA).domains.sort()).toEqual(['delta', 'gamma']);
    expect(keys(FIXTURE, clearedA).affiliations).toEqual(['B']);
  });

  it('turns a secondary affiliation off without dropping domains that only belong to a still-lit group', () => {
    const both = toggleDomainAffiliation(
      toggleDomainAffiliation(EMPTY_DOMAIN_SELECTION, FIXTURE, 'C'),
      FIXTURE,
      'A',
    );
    const clearedC = toggleDomainAffiliation(both, FIXTURE, 'C');
    expect(keys(FIXTURE, clearedC)).toMatchObject({ domains: ['beta'], affiliations: ['A'] });
  });

  it('groups domains under the first affiliation and keeps a shared menu item as one row', () => {
    const menu = domainMenu(FIXTURE);
    expect(menu.map((group) => group.affiliation)).toEqual(['A', 'B', 'C']);
    expect(menu[0]?.entries.map((entry) => entry.label)).toEqual(['Alpha', 'Beta']);
    expect(menu[1]?.entries.map((entry) => entry.label)).toEqual(['Bundle']);
    expect(menu[1]?.entries[0]?.domainKeys).toEqual(['gamma', 'delta']);
    expect(menu[2]?.entries).toEqual([]);
    const columns = splitDomainMenu(menu);
    expect(columns[0].map((group) => group.affiliation)).toEqual(['A']);
    expect(columns[1].map((group) => group.affiliation)).toEqual(['B', 'C']);
  });

  it('lets a secondary heading turn on only its own domains, leaving the shared menu item off', () => {
    const contested = toggleDomainAffiliation(EMPTY_DOMAIN_SELECTION, FIXTURE, 'C');
    expect(keys(FIXTURE, contested).domains.sort()).toEqual(['alpha', 'delta']);
    expect(domainMenuItemSelected(contested, ['gamma', 'delta'])).toBe(false);

    const allBundled = toggleDomainMenuItem(contested, FIXTURE, 'Bundle');
    expect(keys(FIXTURE, allBundled).domains.sort()).toEqual(['alpha', 'delta', 'gamma']);
    expect(domainMenuItemSelected(allBundled, ['gamma', 'delta'])).toBe(true);
    expect(allBundled.affiliations).toEqual(['C']);

    const cleared = toggleDomainMenuItem(allBundled, FIXTURE, 'Bundle');
    expect(keys(FIXTURE, cleared)).toMatchObject({ domains: ['alpha'], affiliations: ['C'] });
  });
});
