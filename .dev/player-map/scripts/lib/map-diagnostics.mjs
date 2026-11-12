export function renderMapDiagnosticsHtml(bounds) {
  const mapBounds = JSON.stringify(bounds);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Player Map geometry diagnostics</title>
  <link rel="stylesheet" href="/node_modules/maplibre-gl/dist/maplibre-gl.css">
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; background: #10090b; color: #f2deda; font: 13px system-ui, sans-serif; }
    #controls { position: fixed; z-index: 2; top: 12px; left: 12px; width: min(330px, calc(100vw - 48px)); padding: 12px; background: #1b0d10eb; border: 1px solid #80404a; box-shadow: 0 8px 30px #000a; }
    #controls h1 { margin: 0 0 8px; font-size: 16px; }
    #controls p { margin: 6px 0 10px; line-height: 1.35; color: #d1b7b2; }
    #controls label { display: grid; grid-template-columns: 20px 1fr; gap: 5px; margin: 5px 0; }
    #controls nav { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
    button { color: inherit; background: #35171c; border: 1px solid #75404a; padding: 5px 8px; cursor: pointer; }
    .swatch { display: inline-block; width: 10px; height: 10px; margin-right: 6px; }
  </style>
</head>
<body>
  <aside id="controls">
    <h1>Geometry diagnostics</h1>
    <p>Generated from the same inputs as the public map. Toggle repairs and residuals over the live basemap.</p>
    <div id="layers"></div>
    <nav>
      <button data-view="city">Whole city</button>
      <button data-view="downtown">Downtown</button>
      <button data-view="islands">Islands</button>
    </nav>
  </aside>
  <div id="map"></div>
  <script type="module">
    import * as maplibregl from '/node_modules/maplibre-gl/dist/maplibre-gl.mjs';
    const diagnosticsResponse = await fetch('/data/diagnostics/map-visual-diagnostics.geojson');
    if (!diagnosticsResponse.ok) throw new Error('Could not load generated map diagnostics');
    const diagnostics = await diagnosticsResponse.json();
    const chronicleBounds = ${mapBounds};
    const definitions = [
      { id: 'source-boundary', label: 'Source boundaries', color: '#47d9ff', type: 'line', visible: true },
      { id: 'normalized-boundary', label: 'Final boundaries', color: '#ff4f59', type: 'line', visible: true },
      { id: 'boundary-added', label: 'Area added / gap repair', color: '#42ef8a', type: 'fill', visible: false },
      { id: 'boundary-removed', label: 'Boundary area removed', color: '#e65cff', type: 'fill', visible: false },
      { id: 'removed-overlap', label: 'Sequential overlap cuts', color: '#ff9f43', type: 'fill', visible: false },
      { id: 'remaining-gap', label: 'Remaining enclosed gaps', color: '#fff45c', type: 'fill', visible: true },
      { id: 'remaining-overlap', label: 'Remaining overlaps', color: '#ffffff', type: 'fill', visible: true },
      { id: 'georeferencing-control', label: 'Control residuals', color: '#3bd6ff', type: 'line', visible: true },
      { id: 'georeferencing-validation', label: 'Validation residuals', color: '#ffcf4b', type: 'line', visible: true },
    ];
    const map = new maplibregl.Map({
      container: 'map', style: 'https://tiles.openfreemap.org/styles/dark', bounds: chronicleBounds,
      fitBoundsOptions: { padding: 30 }, attributionControl: true, pitchWithRotate: false, dragRotate: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('load', () => {
      map.addSource('diagnostics', { type: 'geojson', data: diagnostics });
      for (const definition of definitions) {
        map.addLayer({
          id: definition.id,
          type: definition.type,
          source: 'diagnostics',
          filter: ['==', ['get', 'diagnosticType'], definition.id],
          layout: { visibility: definition.visible ? 'visible' : 'none' },
          paint: definition.type === 'line'
            ? { 'line-color': definition.color, 'line-width': definition.id.startsWith('georeferencing') ? 3 : 1.5, 'line-opacity': 0.95 }
            : { 'fill-color': definition.color, 'fill-opacity': 0.65, 'fill-outline-color': definition.color },
        });
      }
    });
    const controls = document.querySelector('#layers');
    for (const definition of definitions) {
      const label = document.createElement('label');
      label.innerHTML = '<input type="checkbox" ' + (definition.visible ? 'checked' : '') + '><span><i class="swatch" style="background:' + definition.color + '"></i>' + definition.label + '</span>';
      label.querySelector('input').addEventListener('change', (event) => map.setLayoutProperty(definition.id, 'visibility', event.target.checked ? 'visible' : 'none'));
      controls.append(label);
    }
    const views = {
      city: chronicleBounds,
      downtown: [[-79.425, 43.635], [-79.355, 43.675]],
      islands: [[-79.42, 43.61], [-79.33, 43.65]],
    };
    document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => map.fitBounds(views[button.dataset.view], { padding: 40 })));
  </script>
</body>
</html>`;
}
