# Soundtrack Wizard

Shareable mini-project: a guided Windows toolkit for downloading soundtrack material, screening quiet underscore candidates, calibrating taste, and preparing volume-matched exports — without Adobe Audition.

This is the **friend-facing package** design. Toronto Rising’s own screening tools stay in [`../Background Music Audit/`](../Background%20Music%20Audit/README.md); this folder will eventually wrap and generalize those scripts.

## Agent Routing

Read this when:

- returning to the shareable soundtrack screener / yt-dlp / loudness-prepare package
- deciding how to ship tools to someone outside this repo
- adapting `Background Music Audit` scripts for a non–Toronto Rising audience

Source of truth (planned):

- [`DESIGN.md`](DESIGN.md) — decisions and open questions from the 2026-11 planning pass
- This README — intended layout and status
- Upstream prototypes (do not move yet):
  - `.dev/Background Music Audit/soundtrack_screener.py` and siblings
  - `d:\Projects\.CODING\.VSC-Workspace_YT-DLP\YT-DLP Download.ps1`

Verification:

- none yet — design captured only; no runnable wizard in this folder

Status:

- **design / parked** — author returning in a few days; do not treat as shipped

## Intended audience

A collaborator who:

- can run PowerShell and install Python / FFmpeg with a short guide
- downloads OSTs from YouTube
- wants quiet, stable background beds
- does **not** have Adobe Audition (or the expertise to use it)
- will audition shortlists in Media Player Classic (or similar), not in a DAW

## Planned wizard flow

1. **Check tools** — Python, FFmpeg/ffprobe, yt-dlp (install/update if missing)
2. **Download** — adapted from the author’s yt-dlp helper (full / subclip / chapters; audio default for soundtrack work)
3. **Library folder** — downloads land in package `library/`
4. **Screen** — DSP pass, then optional AI (CLAP) ranking
5. **Calibrate / weight** — `perfect/` / `approved/` / `rejects/` + learned ranking weights
6. **Audition playlist** — CSV + Media Player Classic `.mpcpl` (real split clips for partial windows)
7. **Prepare tracks** — loudness match + fades → clean files in `approved/`

## Planned folder layout (not created yet)

```
soundtrack-wizard/
  README.md                 ← this file
  DESIGN.md                 ← planning handoff
  wizard.ps1                ← interactive entry (to build)
  tools/
    download.ps1            ← yt-dlp helper (adapted)
    soundtrack_screener.py  ← generalized from Background Music Audit
    calibrate_from_folders.py
    csv_to_mpcpl.py
    prepare_tracks.py       ← loudnorm + afade batch (to build)
  library/                  ← raw downloads (gitignored)
  calibration/
    perfect/
    approved/
    rejects/
  clips/                    ← audition extracts (gitignored)
  approved/                 ← prepared exports (gitignored)
  docs/
    FRIEND_GUIDE.md         ← plain-English walkthrough (to write)
```

## Relationship to Background Music Audit

| Folder | Role |
| --- | --- |
| `Background Music Audit/` | Toronto Rising–specific screening, Plague Tale calibration labels, live CSV/playlist on this machine |
| `soundtrack-wizard/` | Shareable product design; will copy/adapt scripts without TR chronicle paths or VTM naming |

Do not delete or merge the audit folder into this one until the wizard actually ships and the author confirms the split.

## Open decisions (block packaging)

Captured in [`DESIGN.md`](DESIGN.md). Short version:

1. **Delivery:** zip beside this repo vs a separate tiny GitHub repo?
2. **v1 depth:** full interactive wizard vs download + scan first, calibration later?

## When you return

1. Read [`DESIGN.md`](DESIGN.md).
2. Resolve the two open decisions above.
3. Scaffold `wizard.ps1` + adapted download script + `prepare_tracks.py`.
4. Copy/generalize screener scripts from `Background Music Audit/` (strip TR-only paths and labels).
5. Write `docs/FRIEND_GUIDE.md` in plain English.
6. Decide packaging (zip or repo) and do a dry run on a clean machine or fresh folder.
