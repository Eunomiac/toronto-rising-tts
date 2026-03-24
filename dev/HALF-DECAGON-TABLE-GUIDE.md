# Table Variant Guide: Blender → Tabletop Simulator

This guide walks you through building **ten separate Blender meshes** for Toronto Rising’s table layouts, then using them in Tabletop Simulator (TTS). It extends the original half-decagon workflow with **Encounter (Variant A + leaves)** and **Council (Variant B–B4)** shapes.

## Important: PNG with Transparency Won’t Work

**A PNG with alpha does not create a non-rectangular 3D collider.** TTS still treats the object like a box unless you use a **custom 3D model** (or custom collider OBJ).

You need **real geometry** for each variant you care about.

---

## How the Ten Models Map to Variants

Use **one `.obj` export per row** so you can swap or combine pieces in TTS (Variant A base + optional leaves).

| # | Blender object name (suggested) | Shape | Role |
|---|--------------------------------|-------|------|
| **1** | `Table_Variant_A_Base` | Half of a **20-gon**, then **clipped** so the curved side is only **five** of the original small edges | Encounter table core (no leaves) |
| **2** | `Table_Variant_A_Leaf_NearLeft` | Triangle extension | Toggle on for extra seat / surface |
| **3** | `Table_Variant_A_Leaf_NearRight` | Triangle extension | Toggle on |
| **4** | `Table_Variant_A_Leaf_FarLeft` | Triangle extension (larger / further back in layout) | Toggle on |
| **5** | `Table_Variant_A_Leaf_FarRight` | Triangle extension | Toggle on |
| **6** | `Table_Variant_B_Council10` | Closed **decagon** (10 sides) | Council (5 seats on “base” arc; other half empty or for props) |
| **7** | `Table_Variant_B1_Council6` | Closed **hexagon** (6 sides) | Council 5+1 |
| **8** | `Table_Variant_B2_Council7` | Closed **heptagon** (7 sides) | Council 5+2 |
| **9** | `Table_Variant_B3_Council8` | Closed **octagon** (8 sides) | Council 5+3 |
| **10** | `Table_Variant_B4_Council9` | Closed **nonagon** (9 sides) | Council 5+4 |

**Reference (not a new export unless you want a spare):** your **current production** table is a **10-sided polygon cut in half**—one **flat** chord and **five** equal edges on the curved side. Use that silhouette to line up **seat spacing** and **texture scale** across all variants. If you keep a Blender file for it, name it something like `Table_Reference_HalfDecagon` so it is not confused with Variant A geometry.

---

## Conventions (Apply to All Ten Models)

1. **Units:** Pick a **table radius** (e.g. **25** Blender units) and reuse it for every variant so seats line up when you swap meshes in TTS.
2. **Plane:** Build the tabletop in the **XY** plane (top toward **+Z**). This matches typical Blender → OBJ → TTS workflows.
3. **Center:** Put the mesh’s **origin** at the **center of the full polygon** (the point that would be the center of the complete N-gon), even for clipped shapes like Variant A, so rotations and replacements line up in TTS.
4. **Orientation:** Keep the **flat “Storyteller” edge** and the **player arc** facing consistent directions across files (match your reference screenshot / `dev/Table Orientation Guide.png` if you use it).
5. **Thickness:** Use the same **extrusion depth** for every variant (e.g. **3** units down on **Z**), then the same optional bevel workflow for all.

---

## Shared Blender Pipeline (After the 2D Outline Exists)

Do this **after** you have a closed boundary for the tabletop (Variant A base and leaves: each leaf is a **triangle**; B series: **N-gon** filled once).

### Fill, extrude, thickness

1. **Edit Mode** (`Tab`) → select the full boundary → **Fill** (`F`). If you only have a chord + arc, select all verts in order and `F` once for the top face.
2. **Recalculate normals** if needed: all (`A`) → `Shift+N` (outside).
3. **Extrude** the tabletop downward: all verts (`A`) → `E` → `Z` → type thickness (e.g. `-3`) → `Enter`.
4. Optional **bevel / inset** on the top (same as your original guide): inset the playing surface, proportional-edit the rim down slightly, etc.

### Pre-export checklist

- **Merge by distance:** `A` → `M` → **By Distance** (remove duplicates).
- **Triangulation:** enable **Triangulated Mesh** in OBJ export (required for TTS).
- **Normals:** outward; use **Face Orientation** overlay to verify.
- **Apply transforms** if you scaled in Object Mode (`Ctrl+A` → **All Transforms**) before export.

### Export as OBJ (TTS)

1. **Object Mode** → select the mesh.
2. `File → Export → Wavefront (.obj)`.
3. Enable **Triangulated Mesh**, **Normals**, **UV Coordinates**, **Apply Modifiers**, **Apply Transform** as needed.
4. **Forward / Up:** defaults (**-Z Forward**, **Y Up**) are usually fine for TTS; if a mesh lands on its side, fix rotation once in TTS or adjust in Blender and re-export.

---

## Model 1 — Variant A Base (20-gon, halved, clipped to five small edges)

**Goal:** A tabletop whose **curved** side is exactly **five** short edges taken from a **regular 20-gon**, closed by one **straight** chord (the “front”). This is **not** the same as cutting a **10-gon** in half (your reference uses fewer, longer edges on the arc); Variant A’s arc is **finer** (more facets per degree) if you keep the same circumradius.

### Steps

1. **Add** `Mesh → Circle`, set **Vertices = 20** (operator panel bottom-left, or `F9` after adding).
2. **Scale** to your table radius (`S`, numeric value, `Enter`). Keep the object **centered** at the origin so cuts stay symmetric.
3. **Cut to a semicircle (half of the 20-gon):** Enter **Edit Mode** (`Tab`). Use one of these (both are valid):
   - **Bisect:** `Mesh → Bisect` (or toolbar **Bisect**). Put the plane through the origin, normal along **X** or **Y** (whichever matches your “left/right” layout), enable **Fill** if offered, then **Clear Inner** or **Clear Outer** so you keep **one** half. **OR**
   - **Manual:** In **top ortho** (`NumPad 7`), **box-select** (`B`) strictly **one side** of a diameter through the center → **Delete** → **Vertices**. You should be left with an **open** boundary: a **chain of small edges** along a **semicircle** plus **two endpoints** **`A`** and **`B`** on the cut line.
4. **Close the flat (chord):** Select **`A`** and **`B`**. With **only those two** selected, press **`F`** to create the **straight edge** (or **Edge → Connect Vertices**). Count the **curved** side: a clean half of a **20-gon** uses **10** of the original short edges along the arc (11 vertices along the rim including **`A`** and **`B`**).
5. **Clip to five small segments:** You want **five** of those **10** short edges on the curved side (your encounter layout). Keep **`A`** and **`B`** as the chord endpoints unless you deliberately shorten the storyteller edge. **Delete** or **dissolve** **interior** vertices along the arc so **five** short edges remain between **`A`** and **`B`** on the curved chain (you are removing **five** of the **10** arc edges’ worth of geometry). After edits, select the full boundary loop and press **`F`** once for the **top** face if it is missing.
6. **Match artboard scale (optional):** **Vertex Slide** (`Shift+V`) or small **G** moves on **`A`**/**`B`** if the chord length must match a reference image exactly.
7. **Extrude** the tabletop downward (same thickness as other variants), **recalculate normals** (`Shift+N`), **merge by distance**, then **export** as in **Shared Blender Pipeline** above.

**Tip:** Keep a **copy** of the pre-clip half-20-gon in an unused collection; it makes rebuilding leaves easier.

---

## Models 2–5 — Variant A Leaves (Four Triangles)

**Goal:** Four **separate** meshes that **mate** to Variant A’s outer edges when toggled on in TTS. Exact angles depend on your Variant A mesh after clip; build leaves **against the real edge lengths** of the exported base.

### Shared leaf workflow

1. In the Variant A file, **duplicate** (`Shift+D`) the **three vertices** that form one “attachment” edge on the base plus one **outward** point you want the leaf tip to reach (or place the third vertex by snapping).
2. Separate into a new object: `P` → **Selection** → name per table above.
3. Ensure the leaf has **one** top face (triangle) → **extrude** same thickness as base → **normals** → **export** its own OBJ.

### Naming vs. layout

Match your concept art:

- **Near** leaves: smaller, on the **angled** sides closer to the center.
- **Far** leaves: larger, further **out** and **back**.

If left/right are ambiguous in Blender, **label empties** on the base mesh (`Empty → Arrows`) for “seat directions” and snap leaf tips to them.

**TTS:** Import each leaf as its own Custom Model; **lock** and parent or **save states** with leaves on/off, or use scripting to toggle **active** / position if you move them.

---

## Model 6 — Variant B (Closed Decagon, 10 Sides)

1. Add **Circle**, **Vertices = 10**.
2. Scale to **same radius** as other tables.
3. **Fill** (`F`) → **extrude** → bevel optional → **export**.

**Layout note:** Your diagram keeps **five** “base” seats along one half; the opposite half stays free for Council-style play. You do **not** need to model seats in Blender—only keep **consistent radius** and orientation so scripts / hand zones stay valid.

---

## Models 7–10 — Variant B1–B4 (Closed 6-, 7-, 8-, 9-Gons)

Repeat Model 6 with **Vertices = 6, 7, 8, 9** respectively.

| Model | Vertices (circle operator) | Sides |
|-------|----------------------------|-------|
| **7** (B1) | 6 | Hexagon |
| **8** (B2) | 7 | Heptagon |
| **9** (B3) | 8 | Octagon |
| **10** (B4) | 9 | Nonagon |

Always **fill** the **N-gon** once, then **extrude** with the **same** thickness as Variant B and Variant A.

---

## Apply Table Texture (Optional)

Same options as before:

### Option A — Texture in TTS (recommended)

- Export **plain OBJ**; assign diffuse in the Custom Model dialog. Easiest to iterate.

### Option B — Texture in Blender

- UV unwrap top vs sides (`U` → **Smart UV Project** or manual).
- Shading workspace: **Image Texture** → **Principled BSDF**, optional **Mapping** for scale.
- Export OBJ with **Materials** if you want an **MTL**; keep **PNG/JPG** next to the MTL for TTS.

---

## Import into Tabletop Simulator

1. `Objects → Components → Custom → Custom Model`.
2. **Model** tab: browse each `.obj`.
3. **Diffuse** tab: optional texture.
4. **Collider** tab: optional simpler collider mesh; otherwise TTS uses an auto box (may be loose for non-rectangular tops).
5. **Position / rotate / scale** so Variant A base and leaves line up; **lock** when satisfied.

**Non-interactable table (optional):**

```lua
function onLoad()
    self.interactable = false
end
```

---

## Player Positions and Scripting

Use `lib/table-positions.ttslua` for half-decagon math. **Council polygons** and **Variant A** may need **new** angle arrays if you add automatic seating—until then, place **hand zones** with `F4` using your artboard as reference.

```lua
printHalfDecagonPositions()
local positions = calculateHalfDecagonPositions(50, { x = 0, y = 1.5, z = 0 }, "top")
```

---

## Hosting Models for Workshop

Upload each **OBJ** (and textures / MTL if used) to stable URLs; point Custom Model fields to those URLs for public saves.

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| Wrong shape / vertex count | Circle **Vertices** in operator panel at creation time (`F9`). |
| Dark top / inside-out | `Shift+N` **Recalculate Outside**; flip if needed (`Alt+N`). |
| TTS import errors | **Triangulated** export; no ngons left on top (triangulate in Blender: select all faces → `Ctrl+T`). |
| Leaves don’t line up | Rebuild leaves from **final** Variant A mesh edges; apply scale before measuring. |

---

## Resources

- **TTS API:** <https://api.tabletopsimulator.com/>
- **Blender:** <https://www.blender.org/support/tutorials/>

---

## Quick reference: N-gon central angle

For a regular **N-gon**, each edge subtends **360° / N** at the center. Use that when placing **empties** for seats or when verifying that **five** base seats share the same arc spacing across variants.
