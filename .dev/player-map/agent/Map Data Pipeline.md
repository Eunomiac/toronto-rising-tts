# Player Map Data Pipeline

## Agent Routing

Read this when:
- changing district or region geometry
- importing district/site content from Google Sheets
- changing the public data schema, generated GeoJSON, map diagnostics, or build-time privacy filter

Sources of truth:
- `Toronto Rising Map.svg` once copied into the Player Map's tracked source-data directory, for district and region geometry
- Toronto Rising `EXPORT_LOCATIONS_DISTRICTS` and `EXPORT_LOCATIONS_SITES`, for authored location content
- `.dev/Chronicle Data/Spreadsheet Export Contract.json`, for the exact Sheet contract
- `.dev/scripts/lib/sheet_exports.js`, for fetching and validating the production exports

Verification:
- run schema, identity, topology, bounds, and public-field checks
- inspect the generated diagnostic map over the live basemap before accepting geometry changes

Status:
- designed but not implemented; the Illustrator SVG has passed initial structural inspection

## Principle: One Owner Per Fact

The SVG owns shapes. The Sheet owns authored rules and descriptive content. A small checked-in configuration may own intentional exceptions such as which Sheet-only districts are non-geographical. Generated files own nothing.

Do not:

- hand-edit generated GeoJSON
- copy Sheet values into React components
- parse `lib/locations_catalog.ttslua` as a web-data source
- fetch an informal Sheet tab directly in the browser
- put Storyteller-only columns into a client bundle and rely on the UI to hide them

## Canonical Inputs

### Geometry

Planned tracked source:

```text
data/source/toronto-rising-map.svg
```

The prepared SVG has one artboard/view box of `0 0 4318 5400`, a `DISTRICTS` group containing the 32 geographically relevant districts, and a `REGIONS` group containing `TheBarrens`, `TheRack`, and `AnarchFreeZone`. Its features use stable TTS-compatible keys. Some features are `<path>` and some are `<polygon>`; both are valid input. Compound paths and their `fill-rule` must be preserved during parsing.

The original SVG is the editable source. A normalized intermediate SVG may be generated for diagnosis, but it must not silently replace the source.

### Authored location data

Use the existing production ranges in the Toronto Rising workbook:

- `EXPORT_LOCATIONS_DISTRICTS` — 36 records and 21 fields under the current contract
- `EXPORT_LOCATIONS_SITES` — site content and runtime metadata under the current contract

The district export deliberately includes four non-geographical runtime districts in addition to the 32 mapped districts. A reviewed coverage manifest must identify those exceptions; the pipeline must not assume that every Sheet district requires a polygon or silently ignore an unmatched key.

The importer must call the existing validated loader in `.dev/scripts/lib/sheet_exports.js`. It must not duplicate the Google URL, CSV parser, header rules, or value normalization. That keeps the Player Map on the same snapshot and contract as TTS and the Storyteller Dashboard.

## Planned Build Stages

```text
canonical SVG --------------------> parse and normalize geometry ---+
                                                                  |
Toronto Rising EXPORT_* -> validated shared Sheet loader -> public join -> validated public map package
                                                                  |
reviewed public-field allowlist -----------------------------------+
```

The build should perform these stages:

1. Load and validate the existing Sheet export snapshot.
2. Project Sheet rows to an explicit player-safe schema. Unexpected fields never pass through automatically.
3. Parse `DISTRICTS` and `REGIONS`, accepting paths, polygons, and compound paths while preserving IDs, holes, and fill rules.
4. Normalize very narrow gaps and deliberate overlaps according to a documented tolerance and winner order.
5. Georeference SVG coordinates to longitude/latitude using reviewed ground-control points.
6. Join geometry to public district data by exact key.
7. Validate keys, geometry, bounds, properties, and privacy rules.
8. Write generated public assets and diagnostic artifacts.

## Geometry Normalization

The Illustrator source contains small gaps and may contain small deliberate overlaps created during hand repair. Normalization should make the mapped district coverage topologically consistent without changing the recognisable district boundaries.

Required behavior:

- Ignore `REGIONS` when partitioning district overlaps; regions are intentionally allowed to span many districts.
- Convert all supported SVG shapes to a common polygon representation.
- Preserve holes. Respect both explicit `fill-rule="evenodd"` and the SVG default nonzero rule.
- Snap or fill only gaps below an agreed map-space tolerance.
- Resolve overlaps according to an explicit district-priority manifest. Do not rely on a developer's memory of Illustrator layer order. In SVG rendering, later elements paint above earlier ones, which is not a sufficiently clear ownership rule for data generation.
- Preserve the winning district's original outer edge wherever possible and cut only the overlap.
- Report rather than repair gaps or overlaps above the safe tolerance.
- Reject invalid rings, self-intersections that cannot be repaired unambiguously, empty features, duplicate IDs, and unexpected transforms.

Every run should emit a visual diagnostic showing:

- remaining gaps
- removed overlap fragments
- boundary movement beyond the tolerance
- invalid or unmatched features
- the final districts over a street basemap at several representative zoom levels

The original and final area of each district should be recorded so an unexpectedly large change is obvious even when it is hard to spot visually.

## Georeferencing

SVG pixel coordinates cannot be placed accurately on a live street map until they are tied to real-world coordinates. Use a reviewed set of ground-control points distributed across the map rather than inferring the transform from the artboard corners alone.

The first geometry spike should:

1. Choose clearly identifiable intersections or landmarks near the north, south, east, west, and centre of the map.
2. Record each SVG coordinate and corresponding longitude/latitude in a small tracked calibration file.
3. Fit the simplest transform that meets the accuracy target.
4. Measure error at additional landmarks that were not used to fit the transform.
5. If one transform cannot align the whole map, stop and decide whether to use a more flexible warp or treat the artwork as a raster overlay instead of quietly distorting district boundaries.

The calibration file, not generated coordinates, is the editable source for georeferencing.

## Public Output

The exact filenames can be settled during implementation, but the public package should contain the equivalent of:

```text
public/generated/districts.geojson
public/generated/regions.geojson
public/generated/sites.geojson
public/generated/map-data-manifest.json
```

Each geographical feature needs a stable exact key. Other content should be present only when required for rendering or a player-facing panel. Keep large prose or frequently changing data separate from geometry if doing so improves caching and updates.

The manifest should record:

- schema version
- source export package names
- source and output hashes
- generation time for deployed artifacts
- calibration version
- counts of Sheet rows, mapped features, exceptions, and warnings

The browser consumes only generated public files. It does not call Google Sheets directly. This avoids CORS and availability problems, ensures schema validation happens before release, and gives every deployment one coherent data snapshot.

## Public Field Allowlist

The first public district projection should be reviewed field by field. Likely candidates from the current contract are:

- `Key`
- `Name`
- `Hunting Difficulty`
- `Resonance Plus`
- `Resonance Minus`
- selected aspect and condition fields once their player visibility is confirmed

Domain-control values, aspects, conditions, sites, and future NPC-activity fields must not be assumed public merely because they exist in a link-viewable Sheet. Add them only through an explicit decision. New Sheet columns do not automatically enter the Player Map.

If some rows or values change visibility during play, a static public file is insufficient. Those values must be served through an authenticated API that returns only what the current player is allowed to know.

## Validation Gates

The build must fail on:

- a missing, blank, or duplicate feature key
- an unexpected geographical SVG key or a required mapped Sheet key with no feature
- an unreviewed Sheet-only exception
- malformed or out-of-bounds coordinates
- invalid public output schema
- unsupported SVG elements or transforms
- a large or ambiguous topology repair
- an unexpected field entering the public projection
- Storyteller-only data detected in the public output

Warnings are appropriate only for reviewed, bounded conditions such as a tiny repair within tolerance. The deployment should preserve the warning report as an artifact for inspection.

## Publication Cadence

Sheet edits do not become live merely because the Sheet changed. The public data refreshes when its build pipeline runs. Before implementation, choose one release policy:

- manual release after review
- build on every Player Map deployment
- scheduled data-only deployment
- an explicit root command that validates and publishes a shared snapshot

For initial development, prefer a manual reviewed build. Automatic publication becomes safe only after the public allowlist and geometry diagnostics are mature.
