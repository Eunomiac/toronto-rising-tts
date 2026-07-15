from pathlib import Path
p = Path(r"d:\Projects\.CODING\toronto-rising-tts\.dev\RUNNING TASKLIST.md")
text = p.read_text(encoding="utf-8")
stack_start = text.index("_Stack rank for the current cycle")
done_marker = "**Done this cycle:** **TOR-375** (seat reveal + CONTROL_BOARD bake; CSHEET setXml permitted), **TOR-383** (Project Editor start-date space-split parse), "
if done_marker not in text:
    raise SystemExit("done marker missing")
done_pos = text.index(done_marker)
new_mid = """_Stack rank for the current cycle (2026-07-15 — **TOR-365** / **TOR-293** / **TOR-328** shipped; **TOR-375** CSHEET setXml exception). **Precedence** = Focus stack + Linear **`blockedBy`** (not Linear priority). **TOR-141 (E2E playbooks)** is a living doc (In Progress, not Focus stack). **Back-burner / “Deferred this cycle” is paused** (author 2026-06-21) — open work stays in domain sections; sequence via Linear blockers only._

| # | Issue | Why now |
| --- | --- | --- |
| 1 | **TOR-329** — TTS API heavy-workload audit | Performance / hitch inventory |

**Also in cycle (below top stack):** **TOR-141** (E2E playbooks living doc). **TOR-286** (centralize `setInvisibleTo`). **TOR-303** (author review roll broadcast phrasing — External Todo). **TOR-376** (CSHEET max-slot setXml migrate — Future). **TOR-381** (join-client HUD missing — TTS External). **TOR-382** (coterie sheet notes — Future). **TOR-95** (play-as-NPC, **blockedBy** **TOR-247**). **TOR-330** (Fomorach shapeshift toggle; **blockedBy** **TOR-327** workshop stat deltas). **TOR-98** (Spotlight turn UX — scaffolding in TOR-143).

**Done this cycle:** **TOR-365** (End scene library location — UI false positive; keep activeKey pending), **TOR-293** (connection∧narrative presence), **TOR-328** (POST_ROLL sole-Confirm auto), **TOR-375** (seat reveal + CONTROL_BOARD bake; CSHEET setXml permitted), **TOR-383** (Project Editor start-date space-split parse), """
text2 = text[:stack_start] + new_mid + text[done_pos + len(done_marker):]
p.write_text(text2, encoding="utf-8")
print("ok")
