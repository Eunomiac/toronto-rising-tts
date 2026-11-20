const DISTRICT_FIELDS = ['Key', 'Name', 'Hunting Difficulty', 'Resonance Plus', 'Resonance Minus'];
const SITE_FIELDS = ['Key', 'Name', 'Subtitle', 'District', 'Map Icon', 'X', 'Y'];
const PUBLIC_SITE_PROPERTIES = ['districtKey', 'hub', 'icon', 'key', 'name'];
const RESONANCES = new Set(['choleric', 'ischemic', 'melancholic', 'mercurial', 'phlegmatic', 'primal', 'sanguine']);
const PUBLIC_DISTRICT_PROPERTIES = new Set([
  'key',
  'name',
  'kind',
  'sourceElement',
  'fillRule',
  'sourceRingCount',
  'huntingDifficulty',
  'resonancePlus',
  'resonanceMinus',
]);

function sameMembers(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function resonance(value, sign, key) {
  const match = String(value).trim().toLowerCase().match(/^([a-z]+)\s*([+-])$/);
  if (!match || match[2] !== sign || !RESONANCES.has(match[1])) {
    throw new Error(`${key}: invalid ${sign === '+' ? 'positive' : 'negative'} resonance ${JSON.stringify(value)}`);
  }
  return match[1];
}

function huntingDifficulty(value, key) {
  const normalized = String(value).trim();
  if (normalized === '~') return null;
  const number = Number(normalized);
  if (!Number.isInteger(number) || number < 1 || number > 10) {
    throw new Error(`${key}: invalid Hunting Difficulty ${JSON.stringify(value)}`);
  }
  return number;
}

export function validatePublicDataPolicy(policy) {
  if (policy.schemaVersion !== 1
    || !Array.isArray(policy.districtFields)
    || !sameMembers(policy.districtFields, DISTRICT_FIELDS)
    || !Array.isArray(policy.sheetOnlyDistricts)
    || !sameMembers(policy.siteFields, SITE_FIELDS)
    || !Array.isArray(policy.publicSiteKeys)) {
    throw new Error('Invalid public-data policy');
  }
  const exceptionKeys = policy.sheetOnlyDistricts.map(({ key }) => key);
  if (new Set(exceptionKeys).size !== exceptionKeys.length) throw new Error('Duplicate Sheet-only district exception');
  return policy;
}

export function projectDistrictRows(rows, policy) {
  validatePublicDataPolicy(policy);
  const projected = rows.map((row) => {
    const key = String(row.Key).trim();
    const name = String(row.Name).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || !name) throw new Error(`Invalid public district identity ${JSON.stringify(key)}`);
    return {
      key,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      huntingDifficulty: huntingDifficulty(row['Hunting Difficulty'], key),
      resonancePlus: resonance(row['Resonance Plus'], '+', key),
      resonanceMinus: resonance(row['Resonance Minus'], '-', key),
    };
  });
  if (new Set(projected.map(({ key }) => key)).size !== projected.length) throw new Error('Duplicate public district key');
  return projected;
}

export function joinDistrictFacts(collection, facts, policy) {
  validatePublicDataPolicy(policy);
  const geometryKeys = new Set(collection.features.map((feature) => feature.properties.key));
  const factsByKey = new Map(facts.map((fact) => [fact.key, fact]));
  const exceptions = new Set(policy.sheetOnlyDistricts.map(({ key }) => key));
  const factKeys = new Set(factsByKey.keys());
  const expectedFactKeys = new Set([...geometryKeys, ...exceptions]);
  if (!sameMembers(factKeys, expectedFactKeys)) {
    const missing = [...expectedFactKeys].filter((key) => !factKeys.has(key));
    const unexpected = [...factKeys].filter((key) => !expectedFactKeys.has(key));
    throw new Error(`District coverage mismatch. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`);
  }
  return {
    ...collection,
    features: collection.features.map((feature) => {
      const fact = factsByKey.get(feature.properties.key);
      if (!fact) throw new Error(`Missing public facts for ${feature.properties.key}`);
      const joined = {
        ...feature,
        properties: {
          ...feature.properties,
          name: fact.name,
          huntingDifficulty: fact.huntingDifficulty,
          resonancePlus: fact.resonancePlus,
          resonanceMinus: fact.resonanceMinus,
        },
      };
      const keys = Object.keys(joined.properties);
      if (!sameMembers(keys, PUBLIC_DISTRICT_PROPERTIES)) {
        throw new Error(`${fact.key}: unexpected public property projection`);
      }
      return joined;
    }),
  };
}

export function projectPublicSites(rows, icons, project) {
  const available = new Set(icons);
  const individuals = [];
  const hubs = new Map();
  for (const row of rows) {
    const key = String(row.Key ?? '').trim();
    const name = String(row.Name ?? '').trim();
    const subtitle = String(row.Subtitle ?? '').trim();
    const districtKey = String(row.District ?? '').trim();
    const icon = String(row['Map Icon'] ?? '').trim();
    const xText = String(row.X ?? '').trim();
    const yText = String(row.Y ?? '').trim();
    if (!icon || !xText || !yText) continue;
    const x = Number(xText);
    const y = Number(yText);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`${key}: invalid map coordinates`);
    if (!available.has(icon)) throw new Error(`${key}: unknown map icon ${JSON.stringify(icon)}`);
    if (!name) throw new Error(`${key}: mapped site is missing a name`);
    const site = { key, name, districtKey, icon, x, y };
    if (!subtitle) {
      individuals.push(site);
      continue;
    }
    const group = hubs.get(subtitle) ?? [];
    group.push(site);
    hubs.set(subtitle, group);
  }
  const features = individuals.map((site) => siteFeature(site, false, project));
  for (const [subtitle, members] of hubs) {
    const [first] = members;
    if (!first || members.some((member) => member.icon !== first.icon || member.x !== first.x || member.y !== first.y)) {
      throw new Error(`Hub ${JSON.stringify(subtitle)} has conflicting map icons or coordinates`);
    }
    const key = hubKey(subtitle);
    features.push(siteFeature({ ...first, key, name: subtitle }, true, project));
  }
  const keys = features.map((feature) => feature.properties.key);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate public site key');
  features.sort((left, right) => left.properties.key.localeCompare(right.properties.key));
  return { type: 'FeatureCollection', features };
}

function hubKey(subtitle) {
  const parts = subtitle.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const key = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`Hub ${JSON.stringify(subtitle)} has no usable map key`);
  return key;
}

function siteFeature(site, hub, project) {
  const properties = {
    key: site.key,
    name: site.name,
    districtKey: site.districtKey,
    icon: site.icon,
    hub,
  };
  if (Object.keys(properties).sort().join(',') !== PUBLIC_SITE_PROPERTIES.join(',')) {
    throw new Error(`${site.key}: unexpected public site property projection`);
  }
  return {
    type: 'Feature',
    id: site.key,
    properties,
    geometry: { type: 'Point', coordinates: project([site.x, site.y]) },
  };
}

export const publicDistrictPropertyNames = Object.freeze([...PUBLIC_DISTRICT_PROPERTIES].sort());
