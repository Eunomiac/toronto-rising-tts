# Background Music Audit

Tools for ranking soundtrack passages as quiet Toronto Rising tabletop underscore.

## Agent Routing

Read this when:

- screening new OST downloads for background-music candidates
- retuning `soundtrack_screener.py` against known-good beds

Source of truth:

- `soundtrack_screener.py` — DSP + optional CLAP ranking
- `Pre-Approved Plague Tale Tracks.md` — human Main / Intrigue / Combat labels from Toronto By Night
- `compare_to_approved.py` — calibration report against that list
- `soundtrack_screening.csv` — latest scan output (regenerated; not hand-edited)
- `csv_to_mpcpl.py` — build a Media Player Classic playlist (`.mpcpl`) from the CSV
- `soundtrack_screening.mpcpl` — ranked audition playlist (partial passages are real split clips under `clips/`)

Verification:

- `py compare_to_approved.py` after a scan
- Open `soundtrack_screening.mpcpl` in Media Player Classic, or listen from the CSV order

Status:

- current

## Setup

Already expected on this machine: Python 3.12, FFmpeg/ffprobe, numpy, scipy.

Optional AI pass (installed with `--user` if system site-packages are locked):

```powershell
py -m pip install --user torch --index-url https://download.pytorch.org/whl/cpu
py -m pip install --user -r ".\.dev\Background Music Audit\requirements.txt"
```

## Scan

DSP only (fast, ~1 minute for the current library):

```powershell
py ".\.dev\Background Music Audit\soundtrack_screener.py" ".\background-music" --window 120 --step 60 --out ".\.dev\Background Music Audit\soundtrack_screening.csv"
```

DSP + AI (slow on CPU; first run downloads CLAP weights):

```powershell
py ".\.dev\Background Music Audit\soundtrack_screener.py" ".\background-music" --window 120 --step 60 --ai --ai-top 50 --ai-min-stability 45 --out ".\.dev\Background Music Audit\soundtrack_screening.csv"
```

Then:

```powershell
py ".\.dev\Background Music Audit\compare_to_approved.py"
```

### Media Player Classic playlist

Build a `.mpcpl` sorted by `overall_rank`. Partial CSV time ranges are cut into real files under `clips/` (gitignored); whole-track hits keep linking to the original MP3.

```powershell
# AI-ranked shortlist (recommended for audition)
py ".\.dev\Background Music Audit\csv_to_mpcpl.py" --ai-only --out ".\.dev\Background Music Audit\soundtrack_screening.mpcpl"

# Everything in the CSV, ranked (AI rows first, then DSP-only by stability)
py ".\.dev\Background Music Audit\csv_to_mpcpl.py" --out ".\.dev\Background Music Audit\soundtrack_screening_all.mpcpl"
```

Playlist labels look like: `98.9 | Hide and Seek | 00:00:00-00:01:17 | bed=0.991 | clip`  
(Media Player Classic’s extension is `.mpcpl`, not `.mcpcl`.)

## How to read the CSV

| Column | Meaning |
| --- | --- |
| `stability_score` | Loudness + texture stability (DSP). Silence/fades are ignored for jump penalties. |
| `bed_match` | CLAP relative score for quiet underscore vs dramatic cue |
| `mood_match` | CLAP share for dark+tense vs bright/cheerful/sorrowful (ominous Masquerade mood) |
| `likely_mood` | Best-matching mood label among dark / bright / melancholy / tense |
| `strings_match` | CLAP relative score for sustained strings / cello among instrument prompts |
| `piano_risk` | CLAP relative score for piano among instrument prompts (penalized in rank) |
| `voice_risk` | CLAP relative score for singing / choir / speech (strongly penalized) |
| `overall_rank` | Combined heuristic on AI-scanned rows only |

Scores are rankings for auditioning, not approvals. Prefer passages that also resemble the Main set in `Pre-Approved Plague Tale Tracks.md`.

## Calibration notes (2026-11-14)

Against `Pre-Approved Plague Tale Tracks.md` on the original Plague Tale OST:

- **Before retune:** Main-only median DSP score was ~0 (album fades/silence jumps crushed usable beds).
- **After silence-aware jumps + softer texture penalty:** Main-only median ~86; 20/25 Main tracks score ≥ 45.
- **Remaining DSP gap:** some Combat/Intrigue cues are loudness-stable too (*Escape* scored 100 on DSP alone).
- **AI pass:** CLAP `bed_match` demotes loudness-stable combat/tension cues. `mood_match` prefers ominous/sinister/haunting (+ tense) over bright/cheerful and sorrowful/melancholy. Strings/cello are boosted; piano and vocals/speech are strongly penalized. `overall_rank` multiplies DSP stability by both bed and mood.

Always audition before using a passage in session. If you change the overall-rank formula, run `py recompute_overall.py` instead of re-downloading the model.
