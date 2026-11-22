from pathlib import Path

path = Path("ui/.templates/panel_right_sidebar_referenceLayer.xml")
text = path.read_text(encoding="utf-8")
start = text.find('  <Panel id="playerHud_refPanel_coteries_')
end = text.find("\n</Panel>", start)
if start < 0 or end < 0:
    raise SystemExit(f"markers not found start={start} end={end}")
# end is the outer panel close; the coteries panel close is the </Panel> just before it.
close = text.rfind("\n  </Panel>", start, end)
if close < 0:
    raise SystemExit("coteries close not found")
text = text[:start] + text[close + 1 :]
if "refPanel_coteries" in text or "refPanel_Coteries" in text:
    raise SystemExit("coteries panel still present")
path.write_text(text, encoding="utf-8", newline="\n")
print(f"template lines {text.count(chr(10)) + 1}")
