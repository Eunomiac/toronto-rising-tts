from pathlib import Path

p = Path(__file__).resolve().parents[1] / "RUNNING TASKLIST.md"
text = p.read_text(encoding="utf-8")
marker = (
    "**How blocked work unblocks:** Linear **`blockedBy`** on the waiting issue; "
    "when a prerequisite is **Done** or **Canceled**, agents remove stale blockers "
    "and may re-stack **Focus** (`/tr-inbox`, **“what’s next”**, **`/tr-start`**). "
    "Gate-close resurfacing survey still applies when Focus prerequisites finish.\n\n"
)
idx = text.find(marker)
if idx < 0:
    raise SystemExit("marker1 not found")
idx2 = text.find(marker, idx + len(marker))
if idx2 < 0:
    raise SystemExit("marker2 not found")
after_first = idx + len(marker)
rest = text[idx2 + len(marker) :]
p.write_text(text[:after_first] + rest, encoding="utf-8")
print("ok", len(text), "->", after_first + len(rest))
