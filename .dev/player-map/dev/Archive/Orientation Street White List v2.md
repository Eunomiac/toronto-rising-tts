
## New Orientation & Primary Street White List

```csv
Name,Category,Display Name
St. Clair Avenue West,Orientation,ST. CLAIR
St. Clair Avenue East,Orientation,ST. CLAIR
Bloor Street West,Orientation,BLOOR
Bloor Street East,Orientation,BLOOR
Dundas Street West,Orientation,DUNDAS
Dundas Street East,Orientation,DUNDAS
Front Street West,Orientation,FRONT
Front Street East,Orientation,FRONT
Yonge Street,Orientation,YONGE
Don Valley Parkway,Primary,DON VALLEY PKY
Gardiner Expressway,Primary,GARDINER EXPY
```

## Primary & Orientation Street Style Guide

### Orientation Streets
- **Street Color:** #FFFFFF
- **Label Color:** #FFFF00
- **Label Size:** 3x Current Size
- **Label Style:** Thick Black Outline
- **Label Font:** Voltaire _(added to `public/assets/fonts`)_

### Primary Streets
- **Street Color:** #BBBBBB
- **Label Color:** #FFFFFF
- **Label Size:** (unchanged)
- **Label Style:** Black Outline
- **Label Font:** (unchanged)

## Visibility Notes
- whenever the street itself is visible on the map, **ONE** label should also be visible -- no more, and no less
	(this is per-street, so e.g. showing a "ST. CLAIR" label for "St. Clair Avenue West" and another for "St. Clair Avenue East" is acceptable)
- exception: all street labels should disappear when the zoom level falls below 12.