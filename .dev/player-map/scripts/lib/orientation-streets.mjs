export function buildOrientationStreets(config, snapshot) {
  const streets = Array.isArray(config?.streets) ? config.streets : [];
  const byName = new Map();
  for (const street of streets) {
    if (!street || typeof street.displayName !== 'string' || typeof street.category !== 'string' || !Array.isArray(street.matchNames)) {
      throw new Error('Invalid orientation street configuration');
    }
    for (const matchName of street.matchNames) {
      if (byName.has(matchName)) throw new Error(`Orientation street name ${matchName} is listed twice`);
      byName.set(matchName, street);
    }
  }
  const elements = Array.isArray(snapshot?.elements) ? snapshot.elements : [];
  const features = [];
  for (const element of elements) {
    if (element?.type !== 'way' || !Array.isArray(element.geometry)) continue;
    const street = byName.get(element.tags?.name);
    if (!street) continue;
    const coordinates = element.geometry
      .filter((point) => Number.isFinite(point?.lon) && Number.isFinite(point?.lat))
      .map((point) => [point.lon, point.lat]);
    if (coordinates.length < 2) continue;
    features.push({
      type: 'Feature',
      properties: {
        category: street.category,
        displayName: street.displayName,
        matchName: element.tags.name,
        // One whitelist row → one label, even when West/East share a display name.
        entryKey: street.matchNames[0],
        osmId: element.id,
      },
      geometry: { type: 'LineString', coordinates },
    });
  }
  const missing = streets
    .filter((street) => !features.some((feature) => feature.properties.entryKey === street.matchNames[0]))
    .map((street) => street.displayName);
  if (missing.length > 0) throw new Error(`Orientation street snapshot is missing ${missing.join(', ')}`);
  return { type: 'FeatureCollection', features };
}
