#!/usr/bin/env python3
"""Compare soundtrack_screening.csv against Pre-Approved Plague Tale Tracks.md."""

from __future__ import annotations

import csv
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
APPROVED_MD = HERE / "Pre-Approved Plague Tale Tracks.md"
CSV_PATH = HERE / "soundtrack_screening.csv"

# Author list uses custom numbers; map to OST filenames in background-music.
NAME_MAP = {
    "A Plague Tale": "01 - A Plague Tale.mp3",
    "Father": "02 - Father.mp3",
    "Grieving": "03 - Grieving.mp3",
    "In Shock": "04 - In Shock.mp3",
    "The Inquisition": "05 - The Inquisition.mp3",
    "Orphans": "06 - Orphans.mp3",
    "Strangers": "07 - Strangers.mp3",
    "Escape": "08 - Escape.mp3",
    "Big Sister": "09 - Big Sister.mp3",
    "The Killing": "10 - The Killing.mp3",
    "Adulthood": "11 - Adulthood.mp3",
    "Together Forever": "12 - Together Forever.mp3",
    "The Rats": "13 - The Rats.mp3",
    "Little Brother": "14 - Little Brother.mp3",
    "By the River": "15 - By The River.mp3",
    "Massacre": "16 - Massacre.mp3",
    "Prisoners": "17 - Prisoners.mp3",
    "The Shelter": "19 - The Shelter.mp3",
    "Exodus": "20 - Exodus.mp3",
    "The Son of a Blacksmith": "21 - The son of a Blacksmith.mp3",
    "She Is Alive": "22 - She Is Alive.mp3",
    "Reunited": "24 - Reunited.mp3",
    "I'm Sorry": "25 - I'm Sorry.mp3",
    "Bedtime Story": "27 - Bedtime Story.mp3",
    "Deceiving Appearences": "28 - Deceiving Appearances.mp3",
    "No Turning Back": "29 - No Turning Back.mp3",
    "Sacrifice": "30 - Sacrifice.mp3",
    "Sister's Love": "31 - Sister's Love.mp3",
    "The Alchemy": "32 - The Alchemy.mp3",
    "The Plague": "34 - The Plague.mp3",
    "The Night Before Leaving": "35 - The Night Before Leaving.mp3",
    "They Don't Know": "36 - They Don't Know.mp3",
    "Freedom": "37 - Freedom.mp3",
}


def parse_approved() -> dict[str, set[str]]:
    text = APPROVED_MD.read_text(encoding="utf-8")
    groups: dict[str, set[str]] = {"Main": set(), "Intrigue": set(), "Combat": set()}
    current = None
    for line in text.splitlines():
        if line.startswith('## "Main"'):
            current = "Main"
            continue
        if line.startswith('## "Intrigue"'):
            current = "Intrigue"
            continue
        if line.startswith('## "Combat"'):
            current = "Combat"
            continue
        if current is None or not line.startswith("- "):
            continue
        raw = line[2:].strip()
        # 5A_The Inquisition.mp3 / 24B_Reunited.mp3 / 1_A Plague Tale.mp3
        m = re.match(r"^\d+[A-Za-z]?_(.+)\.mp3$", raw)
        if not m:
            continue
        title = m.group(1)
        ost = NAME_MAP.get(title)
        if ost:
            groups[current].add(ost)
        else:
            print(f"WARNING: no OST map for {raw!r}")
    return groups


def main() -> int:
    groups = parse_approved()
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8-sig")))
    pt = [
        r
        for r in rows
        if "a-plague-tale-ost" in r["file"].replace("\\", "/")
        and "requiem" not in r["file"].lower()
    ]
    best: dict[str, dict] = {}
    for r in pt:
        name = Path(r["file"]).name
        score = float(r["stability_score"])
        prev = best.get(name)
        if prev is None or score > float(prev["stability_score"]):
            best[name] = r

    split = (groups["Main"] & groups["Intrigue"]) | (groups["Main"] & groups["Combat"])
    main_only = groups["Main"] - split
    intrigue_only = groups["Intrigue"] - groups["Main"]
    combat_only = groups["Combat"] - groups["Main"]

    def stats(label: str, names: set[str]) -> None:
        scores = [float(best[n]["stability_score"]) for n in names if n in best]
        if not scores:
            print(f"{label}: none")
            return
        scores_sorted = sorted(scores)
        med = scores_sorted[len(scores_sorted) // 2]
        mean = sum(scores) / len(scores)
        ge60 = sum(1 for s in scores if s >= 60)
        ge45 = sum(1 for s in scores if s >= 45)
        print(
            f"{label:<14} n={len(scores):2}  mean={mean:5.1f}  median={med:5.1f}  "
            f">=45: {ge45}/{len(scores)}  >=60: {ge60}/{len(scores)}  "
            f"min={min(scores):.1f}  max={max(scores):.1f}"
        )

    print("=== DSP calibration vs pre-approved Plague Tale categories ===")
    stats("Main-only", main_only)
    stats("Intrigue-only", intrigue_only)
    stats("Combat-only", combat_only)
    stats("Split", split)

    print("\n=== Main-only ranked by DSP (best passage) ===")
    for name in sorted(main_only, key=lambda n: -float(best.get(n, {"stability_score": -1})["stability_score"])):
        if name not in best:
            print(f"  MISSING  {name}")
            continue
        r = best[name]
        ai = ""
        if r.get("ai_scanned") == "yes":
            ai = (
                f"  overall={r.get('overall_rank')}  bed={r.get('bed_match')}  "
                f"strings={r.get('strings_match')}  voice={r.get('voice_risk')}"
            )
        print(
            f"{float(r['stability_score']):5.1f}  jump={r['largest_2s_jump_db']:>5}  "
            f"tex={r['texture_shift']:>5}  {r['start']}-{r['end']}  {name}{ai}"
        )

    print("\n=== Combat / Intrigue-only ===")
    for name in sorted(combat_only | intrigue_only):
        if name not in best:
            continue
        r = best[name]
        cat = "Combat" if name in combat_only else "Intrigue"
        print(
            f"{float(r['stability_score']):5.1f}  {cat:<8}  "
            f"jump={r['largest_2s_jump_db']:>5}  tex={r['texture_shift']:>5}  {name}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
