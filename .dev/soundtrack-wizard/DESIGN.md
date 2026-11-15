# Soundtrack Wizard — design handoff

Captured 2026-11-14 so the author can resume after a few days. Not implemented yet.

## Agent Routing

Read this when implementing or revising the shareable soundtrack package.

Source of truth for intent: this document + [`README.md`](README.md).

Status: design only.

---

## Why this exists

The author already has a working **Background Music Audit** pipeline inside Toronto Rising (DSP + optional CLAP AI, calibration folders, MPC playlists). A friend needs something similar for his own soundtrack hunting, plus:

- YouTube download help (he is not set up with yt-dlp the way the author is)
- No Adobe Audition — so volume matching and clean edges must be automatic
- A guided walkthrough rather than a pile of CLI one-liners

This mini-project is the home for that shareable kit. It lives under `.dev/` like `storyteller-dashboard` and `player-map`, but it is **not** a Toronto Rising runtime dependency.

---

## Goals

1. **Download** soundtrack audio (and optional video) from YouTube / playlists with sensible defaults.
2. **Chapterize** long OSTs where chapter markers exist on the YouTube download.
3. **Split** long tracks into segments based on waveform similarity.
4. **Calibrate** ranking to user's taste via **(1)** subfolders user populates with sample tracks ("`perfect`" / "`approved`" / "`rejected`"), and **(2)** verbal prompts describing instrumentation, mood, tempo, and other qualities.
5. **Assess** using a pytorch local AI model capable of running with low overhead on a mid-level GPU.
6. **Present** via a playlist file compatible with user's choice of media player, sorted by AI ranking, for user's review.
7. **Iterate** after review: user can move reviewed tracks into calibration subfolders and adjust weights of verbal prompts to tune AI, steadily building up quantity of `perfect`/`approved` tracks.
8. **Prepare** approved material: shared loudness + short fades, applied automatically, no audio editing required.
9. **Ship** as something a non-engineer can use via a user-friendly "wizard" that walks user through each step.

Non-goals for v1:

- Replacing a DAW for surgical EQ, ducking, or creative editing
- Training custom music models
- Unity / TTS AssetBundle packaging (that stays Toronto Rising–side)
- Guaranteeing “musical perfection” — scores are audition helpers, not approvals

---

## Wizard steps (agreed shape)

| Step | What it does | Notes |
| --- | --- | --- |
| 1. Check tools | Python, FFmpeg/ffprobe, yt-dlp | Install/update yt-dlp when possible; fail clearly if FFmpeg missing |
| 2. Download | Full / subclip / chapters; video+audio or audio-only | Adapted from author’s `YT-DLP Download.ps1` |
| 3. Library | Land files in package `library/` | Not hard-coded `D:\Downloads` |
| 4. Screen | `soundtrack_screener.py` DSP; optional `--ai` | Window/step defaults TBD for friend guide (TR uses 120s / 60s) |
| 5. Calibrate | perfect / approved / rejects → weights | Same idea as `calibrate_from_folders.py` |
| 6. Audition | CSV + `.mpcpl` | Prefer MPC; labels include rank + time range |
| 7. Prepare | Loudness match + fades → `approved/` | See loudness section below |

---

## yt-dlp integration

**Upstream script (do not edit in place as the package source of truth):**

`d:\Projects\.CODING\.VSC-Workspace_YT-DLP\YT-DLP Download.ps1`

What it already does well:

- Interactive video+audio vs audio-only
- Full download, subclip (temp full download → local ffmpeg trim), or chapter split
- yt-dlp update via pip or `yt-dlp -U`
- Robust retries, IPv4 force, playlist-friendly output templates
- Clip path avoids fragile yt-dlp+ffmpeg section download edge cases

Friend-facing adaptations (agreed in chat):

| Author machine default | Package default |
| --- | --- |
| Download path `D:\Downloads` | Package `library/` (blank = that folder) |
| Cookies from Firefox only | Prompt: Firefox / Chrome / Edge / skip cookies |
| VTM / witty branding in prompts | Neutral “Soundtrack download” naming |
| Audio optional | **Audio → MP3** as the default for soundtrack work |

Keep: two-stage clip mode (full temp download, then ffmpeg `-ss` / `-t`), chapter mode, update check.

Legal note for the friend guide: he is responsible for only downloading material he has rights to use; the tool is a technical helper, not legal advice.

---

## Loudness matching and fades (no Audition)

Friend has neither Audition nor DAW expertise. Automatic prepare step is enough for “these beds sit together and start/stop cleanly.”

### Volume matching — realistic scope

Use FFmpeg **`loudnorm`** (EBU R128), preferably **two-pass**:

1. Measure integrated loudness per file
2. Apply gain so files land on one target

Suggested default target: **−16 LUFS** (a bit quieter than typical podcast/streaming −14; good for underscore under talk).

Also apply a true-peak ceiling so remastered files do not clip.

**What this gives him**

- Tracks that *feel* similarly loud when they start
- Consistent average level across an export folder

**What this does not do**

- Flatten dynamics inside a track (swells still swell)
- Fix harsh EQ or brightness mismatches
- Live ducking under voice

That is the right Audition-shaped substitute for batch Match Loudness — not a full mix session.

### Fades

Trivial and agreed as a default:

- **3 second fade in** and **3 second fade out** via FFmpeg `afade`
- Wizard toggles: on/off, duration in seconds

### Prepare-tracks pipeline (planned)

After he marks approved passages (or whole files):

1. Optional: extract the approved time window from a long OST
2. Two-pass loudnorm to shared LUFS target (default −16)
3. Apply fade in / fade out
4. Write MP3 (and/or WAV) into `approved/`

Implementation sketch: `tools/prepare_tracks.py` shelling out to ffmpeg (same dependency the screener already requires).

---

## Reuse from Background Music Audit

Keep these as the technical core; copy/adapt into `tools/` when building (do not break the TR audit workflow):

| Script | Role |
| --- | --- |
| `soundtrack_screener.py` | DSP stability + optional CLAP ranking |
| `calibrate_from_folders.py` | Learn weights from perfect/approved/rejects |
| `compare_to_approved.py` | Calibration report (TR-specific labels — generalize or omit for friend) |
| `csv_to_mpcpl.py` | Ranked MPC playlist + real clips |
| `recompute_overall.py` | Re-rank CSV without re-running AI |
| `requirements.txt` | numpy/scipy + optional torch/transformers |

Strip or generalize:

- Paths pointing at `background-music/` or Plague Tale calibration docs
- Toronto Rising / Masquerade-specific prompt copy in the friend guide
- Any assumption that Media Player Classic is already installed (document download link)

---

## Delivery options (open)

Author has not chosen yet:

1. **Zip** living under this repo (e.g. build artifact or a clean export of `soundtrack-wizard/`) — simple handoff, versioned with TR unless exported carefully
2. **Separate tiny GitHub repo** — cleaner for the friend, no TR chronicle noise, separate issues/README

Either way, the design work stays documented here until packaging starts.

---

## v1 depth (open)

Author has not chosen yet:

1. **Full interactive wizard** — download → scan → calibrate → audition → prepare in one `wizard.ps1`
2. **Thin v1** — download + scan (+ prepare?) first; calibration UI later

Recommendation when resuming: if time is short, ship download + scan + prepare + friend guide; keep calibration as a documented second script the wizard can call.

---

## Friend experience principles

Plain English throughout (same spirit as Toronto Rising author-voice rules):

- Complete sentences in the guide
- Explain what success looks like after each step
- Scores are for audition order, not automatic approval
- Always listen before using a bed in a session

---

## Out of scope reminders

- Do not crawl walled Project / TTS Documents roots while building this
- Do not require Linear / PAVE for this mini-project unless TR Lua or shared runtime changes
- Do not replace `Background Music Audit/` until the author confirms the friend package is the long-term home

---

## Resume checklist

- [ ] Choose delivery: zip vs separate GitHub repo
- [ ] Choose v1 depth: full wizard vs download+scan (+prepare) first
- [ ] Adapt `YT-DLP Download.ps1` → `tools/download.ps1` (library path, cookie browser, audio default)
- [ ] Add `tools/prepare_tracks.py` (loudnorm −16 LUFS, 3s fades, extract windows)
- [ ] Copy/generalize screener + mpcpl + calibrate scripts
- [ ] Write `wizard.ps1` menu
- [ ] Write `docs/FRIEND_GUIDE.md`
- [ ] Dry-run on a clean folder / second machine
- [ ] Package and send
