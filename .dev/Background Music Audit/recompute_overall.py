"""Recompute overall_rank from existing AI columns without re-running CLAP."""
from __future__ import annotations

import csv
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CSV_PATH = HERE / "soundtrack_screening.csv"


def load_screener():
    path = HERE / "soundtrack_screener.py"
    spec = importlib.util.spec_from_file_location("soundtrack_screener", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main() -> int:
    screener = load_screener()
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8-sig")))
    fieldnames = list(rows[0].keys()) if rows else []
    for row in rows:
        if row.get("ai_scanned") == "yes":
            row["overall_rank"] = round(screener.compute_overall_rank(row), 1)
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
    rows, strings_floor, removed = screener.apply_top20_strings_floor(rows)
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    kept = sum(1 for r in rows if r.get("overall_rank") not in (None, ""))
    print(f"Recomputed overall_rank for AI rows; {kept} remain after strings floor")
    if strings_floor is not None:
        print(
            f"Strings floor: top-20 mean strings_match={strings_floor:.3f}; "
            f"cleared {removed} passages below that"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
