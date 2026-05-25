"""One-off patch: replace nine chronicle LightModes with chronicleGradientPreset calls."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "lib" / "constants.ttslua"
text = path.read_text(encoding="utf-8")

start_marker = "  IndoorBright = {"
end_marker = "  MemoriamBright = {"

start = text.index(start_marker)
end = text.index(end_marker)

new_block = """  IndoorBright = chronicleGradientPreset(
    1.05,
    0.18,
    {
      sky = Color(0.92, 0.95, 1.00, 1),
      equator = Color(0.88, 0.91, 0.93, 1),
      ground = Color(0.82, 0.86, 0.84, 1),
    },
    {
      color = Color(0.92, 0.95, 1.00, 1),
      intensity = 4.0,
    }
  ),
  --- Warm incandescent / candle fill; equator kept darker than sky to avoid washout.
  IndoorDim = chronicleGradientPreset(
    0.60,
    0.15,
    {
      sky = Color(1.00, 0.82, 0.55, 1),
      equator = Color(0.55, 0.38, 0.22, 1),
      ground = Color(0.30, 0.18, 0.10, 1),
    },
    {
      color = Color(1.00, 0.78, 0.45, 1),
      intensity = 2.8,
    }
  ),
  --- Low cool ambient; warm main + seat spotlights remain readable (preset controls spotlights, not name suffix).
  IndoorDark = chronicleGradientPreset(
    0.22,
    0.06,
    {
      sky = Color(0.12, 0.14, 0.22, 1),
      equator = Color(0.08, 0.07, 0.10, 1),
      ground = Color(0.06, 0.04, 0.03, 1),
    },
    {
      color = Color(1.00, 0.70, 0.40, 1),
      intensity = 2.0,
    }
  ),
  --- City at night: sodium streetlight equator band, dark sky.
  OutdoorBright = chronicleGradientPreset(
    0.70,
    0.10,
    {
      sky = Color(0.06, 0.08, 0.18, 1),
      equator = Color(0.45, 0.32, 0.12, 1),
      ground = Color(0.08, 0.06, 0.05, 1),
    },
    {
      color = Color(1.00, 0.75, 0.35, 1),
      intensity = 3.0,
    }
  ),
  --- Park / alley: night-sky ambient dominates; very dim cool main fill.
  OutdoorDim = chronicleGradientPreset(
    0.45,
    0.08,
    {
      sky = Color(0.04, 0.07, 0.20, 1),
      equator = Color(0.06, 0.10, 0.16, 1),
      ground = Color(0.03, 0.03, 0.04, 1),
    },
    {
      color = Color(0.60, 0.65, 0.75, 1),
      intensity = 1.2,
    }
  ),
  --- Moonlit exterior: blue ambient, faint desaturated main; seats stay on for readability.
  OutdoorDark = chronicleGradientPreset(
    0.28,
    0.04,
    {
      sky = Color(0.10, 0.14, 0.28, 1),
      equator = Color(0.06, 0.08, 0.14, 1),
      ground = Color(0.02, 0.02, 0.03, 1),
    },
    {
      color = Color(0.75, 0.82, 0.95, 1),
      intensity = 1.0,
    }
  ),
  --- Eerie green air overhead; warm candle bounce on ground + main lights (sewers / warrens).
  UndergroundBright = chronicleGradientPreset(
    0.55,
    0.05,
    {
      sky = Color(0.08, 0.18, 0.10, 1),
      equator = Color(0.12, 0.22, 0.14, 1),
      ground = Color(0.35, 0.22, 0.12, 1),
    },
    {
      color = Color(1.00, 0.78, 0.45, 1),
      intensity = 2.8,
    }
  ),
  UndergroundDim = chronicleGradientPreset(
    0.35,
    0.04,
    {
      sky = Color(0.05, 0.12, 0.07, 1),
      equator = Color(0.08, 0.16, 0.10, 1),
      ground = Color(0.22, 0.14, 0.08, 1),
    },
    {
      color = Color(1.00, 0.72, 0.40, 1),
      intensity = 2.0,
    }
  ),
  UndergroundDark = chronicleGradientPreset(
    0.20,
    0.03,
    {
      sky = Color(0.04, 0.10, 0.06, 1),
      equator = Color(0.05, 0.08, 0.06, 1),
      ground = Color(0.04, 0.03, 0.02, 1),
    },
    {
      color = Color(1.00, 0.68, 0.38, 1),
      intensity = 1.8,
    }
  ),
"""

path.write_text(text[:start] + new_block + text[end:], encoding="utf-8", newline="\n")
print("patched", path)
