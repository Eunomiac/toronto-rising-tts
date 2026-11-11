const DISTRICT_FIELDS = ['Key', 'Name', 'Hunting Difficulty', 'Resonance Plus', 'Resonance Minus'];
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
    || !Array.isArray(policy.siteFields)
    || !Array.isArray(policy.publicSiteKeys)) {
    throw new Error('Invalid public-data policy');
  }
  if (policy.siteFields.length !== 0 || policy.publicSiteKeys.length !== 0) {
    throw new Error('Public sites require a reviewed non-empty field policy and explicit projection support');
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

export function emptyPublicSites(policy) {
  validatePublicDataPolicy(policy);
  return { type: 'FeatureCollection', features: [] };
}

export const publicDistrictPropertyNames = Object.freeze([...PUBLIC_DISTRICT_PROPERTIES].sort());
