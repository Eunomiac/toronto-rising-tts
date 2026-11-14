"""Recompute overall_rank from existing AI columns without re-running CLAP."""
from __future__ import annotations

import csv
from pathlib import Path

import numpy as np

CSV_PATH = Path(__file__).with_name("soundtrack_screening.csv")


def compute_overall_rank(row: dict) -> float:
    # Keep in sync with soundtrack_screener.compute_overall_rank.
    voice_types = {
        part.strip()
        for part in str(row.get("voice_type") or "").split(";")
        if part.strip()
    }
    vocal_labels = {"singing", "choir", "speech"}
    if voice_types & vocal_labels and "instrumental" not in voice_types:
        voice_coef = 55.0
    elif voice_types & vocal_labels:
        voice_coef = 42.0
    else:
        voice_coef = 22.0
    bed = float(row["bed_match"])
    mood = float(row.get("mood_match") or 0)
    strings = float(row.get("strings_match") or 0)
    piano = float(row.get("piano_risk") or 0)
    voice = float(row.get("voice_risk") or 0)
    stability = float(row["stability_score"])
    return float(
        np.clip(
            stability * (0.35 + 0.65 * bed) * (0.35 + 0.65 * mood)
            + 32 * strings
            - 30 * piano
            - voice_coef * voice,
            0,
            100,
        )
    )


def main() -> int:
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8-sig")))
    fieldnames = list(rows[0].keys()) if rows else []
    for row in rows:
        if row.get("ai_scanned") == "yes" and row.get("mood_match") not in (None, ""):
            row["overall_rank"] = round(compute_overall_rank(row), 1)
        elif row.get("ai_scanned") == "yes":
            row["overall_rank"] = ""
        else:
            row["overall_rank"] = ""
    rows.sort(
        key=lambda row: (
            row.get("ai_scanned") == "yes",
            float(row["overall_rank"] or 0),
            float(row["stability_score"]),
        ),
        reverse=True,
    )
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(
        "Recomputed overall_rank for "
        f"{sum(1 for r in rows if r.get('overall_rank') not in (None, ''))} AI rows"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
