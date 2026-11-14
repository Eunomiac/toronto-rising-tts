# Importing Disciplines Data Into the Storyteller Dashboard

## Overview

The Storyteller Dashboard shows Power, Ritual, and Ceremony tooltips from a local Disciplines catalog built from Google Sheets. Character-sheet terms and NPC roll-configure power buttons share the same HTML tip. Term Images (paste image + markdown) stay available for every other term kind (attributes, skills, discipline **names**, advantages, and so on).

## Import

From `.dev/storyteller-dashboard/`:

```bash
npm run disciplines:import
```

What it does:

1. Reads `EXPORT_DISCIPLINES` from the local sheet-exports snapshot (or set `TR_DISCIPLINES_REFRESH_EXPORT=1` to re-fetch all exports first).
2. Downloads the public `.xlsx` of [V5: DISCIPLINES](https://docs.google.com/spreadsheets/d/1U8Ktl4iHOwqldvikCKtEdXd56Mgt6LGukP4P_sjC0ME) (or set `TR_DISCIPLINES_XLSX` to a local file).
3. Parses OOXML rich text for **System** and **Duration** (bold, italic, underline, colors, fonts, line breaks, `●` / `○` / `▸` bullets).
4. Writes git-ignored `data/disciplines-catalog.json`.

Serve with `npm run dev`. The client loads `GET /api/disciplines`.

## Tooltip HTML

Root class `.discipline_tooltip` (block `div`s are not nested inside a `p`):

- `.discipline_title` — Name  
- `.discipline_subtitle` — Discipline + `●` repeated for Level  
- `.discipline_flavor` — Description  
- `.discipline_body` — Rouse Checks; Ingredients / Process only when present; System and Duration HTML from the importer  
- `.discipline_source` — Source  

## Fonts

Vendored under `assets/fonts/` and loaded via `/pc-sheet-assets/fonts/…`:

| Sheet font | Files |
| --- | --- |
| Alegreya Sans | `AlegreyaSans/AlegreyaSans-{Regular,Bold,Italic}.ttf` |
| Alegreya Sans SC | `AlegreyaSansSC/AlegreyaSansSC-{Regular,Bold}.ttf` |
| Days One | `DaysOne/DaysOne-Regular.ttf` |
| Bebas Neue | already present |

Rare sheet fonts (Bellefair, Dosis, Walter Turncoat) fall back to Alegreya Sans / Days One.

## Term Images boundary

| Term kind | Hover tip |
| --- | --- |
| `power`, `ritual`, `ceremony` | Disciplines catalog only (no Term Image editor) |
| Everything else | Existing Term Images (image + markdown) |

## Smoke

With the dashboard running and a catalog present:

```bash
npm run test:disciplines:browser
```
