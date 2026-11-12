import type { MapLayerId, MapLayerVisibility } from './types';

interface LayerControlsProps {
  visibility: MapLayerVisibility;
  siteCount: number;
  onChange: (layer: MapLayerId, visible: boolean) => void;
}

export function LayerControls({ visibility, siteCount, onChange }: LayerControlsProps) {
  return (
    <fieldset className="layer-controls" data-note-surface="layer-controls">
      <legend>Map layers</legend>
      <label>
        <input
          type="checkbox"
          checked={visibility.districts}
          onChange={(event) => onChange('districts', event.target.checked)}
        />
        <span>Districts</span>
      </label>
      <label>
        <input
          type="checkbox"
          checked={visibility.regions}
          onChange={(event) => onChange('regions', event.target.checked)}
        />
        <span>Regions</span>
      </label>
      <label>
        <input
          type="checkbox"
          checked={visibility.orientation}
          onChange={(event) => onChange('orientation', event.target.checked)}
        />
        <span>Orientation streets</span>
      </label>
      <label>
        <input
          type="checkbox"
          checked={visibility.path}
          onChange={(event) => onChange('path', event.target.checked)}
        />
        <span>PATH</span>
      </label>
      <label title={siteCount === 0 ? 'No sites have been revealed yet.' : undefined}>
        <input
          type="checkbox"
          checked={visibility.sites}
          disabled={siteCount === 0}
          onChange={(event) => onChange('sites', event.target.checked)}
        />
        <span>{siteCount === 0 ? 'Sites (none revealed)' : `Sites (${siteCount})`}</span>
      </label>
    </fieldset>
  );
}
