# Half-Decagon Table Guide for Tabletop Simulator

This guide explains how to create and implement a custom half-decagon table shape in Tabletop Simulator.

## Important: PNG with Transparency Won't Work

**Using a PNG image with alpha/transparency will NOT create a proper 3D shape.** The object will still be rectangular/prismatic - the transparency only affects visual appearance, not the collision/physics shape.

**You MUST create a custom 3D model** to get an actual half-decagon table shape.

## Overview

A half-decagon table has:

- **One flat edge** (the long side) - where the Storyteller sits
- **Four straight sides** forming a curved arc - where 4 players sit

## Step 1: Create the 3D Model

### Option A: Using Blender (Recommended)

1. **Download Blender** (free): <https://www.blender.org/>

2. **Create the Half-Decagon Shape**:
   - Open Blender
   - Delete the default cube (Select → Delete)
   - Add a Circle: `Add → Mesh → Circle` (or press `Shift+A` → `Mesh` → `Circle`)

   **Set Vertices to 10**:
   - **Method 1** (Right after adding): After clicking "Circle", look at the **bottom-left corner** of the 3D viewport. You'll see a small operator panel titled "Add Circle" with options. Click on it to expand if needed, then change **"Vertices"** from 32 to **10**.
   - **Method 2** (If you missed the panel): Select the circle, then look at the **Properties panel** (right side, wrench icon for "Object Properties"). Under **"Geometry Data"** section, find **"Vertices"** and change it to **10**. If you don't see this, go to **Edit Mode** (`Tab`), then check the **Properties panel** → **"Mesh Data"** tab (green triangle icon) → **"Vertices"** field.
   - **Method 3** (Alternative): If the above don't work, press `F9` immediately after adding the circle to bring up the operator panel, then set Vertices to 10.

   **Continue with the shape**:
   - Scale it to your desired table size (e.g., 20-30 units radius)
     - Select the circle (`Right-click` or `Left-click` if using left-click select)
     - Press `S` to scale, type the radius value (e.g., `25`), press `Enter`
   - Switch to **Edit Mode** (`Tab` key)
   - Select all vertices (`A` key)
   - **Create the half-decagon**: You need to delete half the vertices to create the flat edge
     - **Option A - Manual Selection**: In Edit Mode, switch to **Vertex Select Mode** (`1` key or click vertex icon)
       - Select the **bottom 5 vertices** (the ones forming the bottom half of the circle)
       - You can box-select (`B` key) or individually select (`Right-click`) the bottom vertices
       - Press `X` or `Delete` → `Vertices` to delete them
       - This leaves you with the top half (5 sides + flat edge)
     - **Option B - Using Selection Tools**:
       - Select all (`A`)
       - Use `Select` → `Select All by Trait` → `Select Interior Edges` to help identify edges
       - Or manually select the bottom half vertices
       - Delete selected vertices (`X` → `Vertices`)
   - You should now have a half-decagon shape with the flat edge at the top

   **Add Faces to the Shape**:
   - Make sure you're still in **Edit Mode** (`Tab` if needed)
   - Select all vertices (`A` key)
   - Press `F` to **Fill** (this creates a face from the selected vertices)
     - If `F` doesn't work or creates unexpected results, try:
       - `Alt+F` for **Beauty Fill** (creates a nicer triangulation)
       - Or go to `Mesh → Fill → Fill` from the top menu
   - You should now see the top face filled in (it will appear as a solid surface)
   - **Important**: Make sure the face normal is pointing up. If the face appears dark or inside-out:
     - Select all (`A`)
     - Press `Shift+N` to **Recalculate Normals** (or `Mesh → Normals → Recalculate Outside`)

   **Verify the Face and Check Normals**:
   - Switch to **Face Select Mode** (`3` key or click the face icon in the toolbar)
   - Select all faces (`A` key) - you should see all faces highlighted
   - **Check Normals Direction**:
     - Enable **Face Orientation** overlay: In the top-right of the viewport, click the **Overlays** dropdown (two overlapping circles icon)
     - Enable **"Face Orientation"** - this will show:
       - **Blue faces** = normals pointing TOWARD your camera/view (correct when viewing from outside)
       - **Red faces** = normals pointing AWAY from your camera/view
       - **Grey faces** = normals perpendicular to your view angle
     - Alternatively, press `Alt+Shift+N` to toggle face orientation display
   - **Understanding Face Orientation Colors**:
     - When viewing from **outside** the object: Blue = correct (normals pointing outward)
     - When viewing from **inside** the object: Red = correct (normals pointing outward, away from you)
     - **Grey** means the normal is perpendicular to your view - this is normal!
   - **Fix Normals if Needed**:
     - If you see red faces when viewing from outside, select all (`A`)
     - Press `Shift+N` to **Recalculate Normals** (points them outward)
     - Or press `Alt+N` → `Flip` to flip selected faces
   - **Final Verification**:
     - View from **outside** the object - top and side faces should be **blue** or **grey**
     - Zoom **inside** the object - all faces should be **red** (this confirms normals point outward!)
     - If inside faces are blue, normals are inverted - fix with `Shift+N`
   - **Visual Check**: In **Solid View** (`Z` → `Solid`), the top surface should appear bright/light colored
     - If it appears dark, the normals are inverted - fix with `Shift+N`
   - **Note**: The triangulation (multiple triangular faces) is **perfectly fine** and actually required for OBJ export

3. **Extrude to Create Table Thickness**:
   - Select all vertices (`A`)
   - Extrude down (`E` → `Z` → `-3` for 3 units thick)
   - This creates the table top with proper thickness

4. **Create Beveled Edge** (Optional but Recommended):

   This creates a smooth transition from 3 units thick at the center to 2 units thick at the outer border.

   **Design Goal**:
   - Table center: **3 units thick**
   - Outer border: **2 units thick** (1 unit thinner)
   - Transition area: **~3 units wide** (smooth slope from center to border)

   **Visual Reference**:

   ```
   Top View:          Side View:
   ┌─────────┐        ┌─────────┐ 3 units
   │         │        │         │
   │  Table  │        │  Table  │
   │  Top    │        │  Top    │
   │         │        │         │
   └─────────┘        └─────────┘
                      │  Border │ 2 units
                      └─────────┘
                      ↑ 3 unit transition
   ```

   **Method 1: Using Inset Faces and Proportional Editing** (Easiest):
   - Switch to **Face Select Mode** (`3` key or click face icon)
   - Select **ALL top faces** of your table (the playing surface):
     - Click on one triangular face
     - Hold `Shift` and click on each other triangular face, OR
     - Press `A` to select all faces, then `Alt+A` to deselect all, then manually select only the top faces, OR
     - **Easiest method**: Press `A` to select all, then hold `Alt` and click on a **side face** to deselect all side faces, leaving only top faces selected
   - You should now have all the triangular faces on the top surface selected (highlighted in orange)
   - Press `I` to **Inset Faces**
   - Move mouse to inset by approximately **3 units** (or your desired border width)
   - Click to confirm
   - Now select the **inset edge loop** (the border between inset and outer edge)
   - Switch to **Edge Select Mode** (`2` key)
   - Select the inset edge loop (Alt+Click on the edge)
   - Switch back to **Vertex Select Mode** (`1` key)
   - Select all vertices on the outer edge (the border area)
   - Enable **Proportional Editing** (`O` key, or click the proportional editing icon)
   - Set proportional editing to **Smooth** (dropdown next to the icon)
   - Set **Proportional Size** to about 3 units (mouse wheel or `Page Up`/`Page Down`)
   - Move vertices down (`G` → `Z` → `-1`) to lower the border by 1 unit (from 3 to 2 units thick)
   - The proportional editing will create a smooth transition
   - Disable proportional editing (`O` key)

   **Method 2: Using Edge Loops and Bevel** (More Control):
   - Switch to **Edge Select Mode** (`2` key)
   - Select the **outer edge loop** of the table top
   - Press `Ctrl+B` to **Bevel Edges**
   - Move mouse to set bevel width to approximately **3 units**
   - Scroll mouse wheel to add **segments** (2-3 segments for smooth transition)
   - Click to confirm
   - Now select the **newly created edge loop** (the inner edge of the bevel)
   - Switch to **Vertex Select Mode** (`1` key)
   - Select all vertices on the outer border
   - Move them down (`G` → `Z` → `-1`) to create the 2-unit thick border
   - For smoother transition, add an **edge loop** (`Ctrl+R`) near the transition area
   - Adjust vertices manually if needed for perfect smoothness

   **Method 3: Using Modifiers** (Most Flexible):
   - With your table selected, go to **Modifier Properties** (wrench icon)
   - Add **Bevel Modifier**
   - Set **Width** to 3 units
   - Set **Segments** to 3-4 for smooth transition
   - Set **Limit Method** to "Angle" (bevels only sharp edges)
   - Or use **Weight** method for more control
   - Apply the modifier (`Ctrl+A` → `Apply`)
   - Then manually adjust the outer border vertices down by 1 unit (`G` → `Z` → `-1`)

   **Final Step - Smooth the Transition**:
   - Select vertices in the transition area
   - Use **Proportional Editing** (`O`) with **Smooth** falloff
   - Adjust vertices to create a perfectly smooth slope
   - Or use **Smooth** tool: Select vertices → `Shift+V` → move mouse to smooth

   **Tips for Best Results**:
   - Use **Wireframe View** (`Z` → `Wireframe`) to see the geometry clearly
   - Check your work in **Solid View** (`Z` → `Solid`) to see the final appearance
   - Use **Smooth Shading** (`Right-click` → `Shade Smooth`) for a polished look
   - Add **Edge Split** modifier if you want sharp edges at the transition boundary
   - Test the transition by viewing from the side (`NumPad 1` for front view, `NumPad 7` for top)

5. **Pre-Export Checklist**:

   Before exporting, make sure everything is ready:

   - **All faces present**: Check that top, bottom, and all side faces are filled
     - Switch to **Face Select Mode** (`3`)
     - Select all (`A`) - you should see all faces highlighted
     - Rotate around the model to verify no holes or missing faces
   - **Normals correct**: Verify normals are pointing outward
     - Enable **Face Orientation** overlay
     - View from outside - faces should be blue/grey
     - View from inside - faces should be red
   - **No duplicate vertices**: Clean up any duplicate geometry
     - Select all (`A` in Edit Mode)
     - Press `M` → `By Distance` to merge duplicate vertices
   - **Model centered/oriented**: Position the model appropriately
     - Make sure the model is at the origin (0, 0, 0) or note its position
     - Check orientation - flat edge should be where you want it
   - **Scale appropriate**: Verify the size is correct
     - Check dimensions in Properties panel → Object Properties
     - Recommended: 20-30 units radius for a standard table
   - **Smooth shading** (optional but recommended):
     - Select the object in Object Mode
     - Right-click → `Shade Smooth` for a polished look
     - Or add **Subdivision Surface** modifier if you want even smoother surfaces

   **Your method worked fine!** Manually selecting vertices and moving them down is a perfectly valid approach. As long as the beveled edge looks good visually, you're ready to export.

6. **Export as OBJ**:
   - Select your mesh (make sure you're in **Object Mode**)
   - `File → Export → Wavefront (.obj)`
   - Choose a location and save as `half-decagon-table.obj`
   - **Important Export Settings**:
     - **"Triangulated Mesh"**: ✅ **ENABLE THIS** (required for TTS - this is what Blender calls "Triangulate Faces")
     - **"Normals"**: ✅ Keep enabled (needed for proper lighting)
     - **"UV Coordinates"**: ✅ Keep enabled (if you plan to use a texture)
     - **"Apply Modifiers"**: ✅ Keep enabled (applies any modifiers you've added)
     - **"Apply Transform"**: ✅ Keep enabled (applies position/rotation/scale)
     - **"Materials"**: ✅ Keep enabled (if you've assigned materials)
     - **Forward/Up Axis**: Default settings (-Z Forward, Y Up) are fine for TTS
   - Click **"Export Wavefront OBJ"**

### Option B: Using Other 3D Software

Any 3D modeling software that can export OBJ files will work:

- **Maya**
- **3ds Max**
- **SketchUp** (with OBJ export plugin)
- **FreeCAD**

**Requirements for the model**:

- Must be triangulated (all faces as triangles)
- Normals should face outward
- Scale should be reasonable (TTS uses Unity units, ~1 unit = 1 inch)
- Recommended size: 20-30 units radius for a standard table

## Step 2: Apply Table Texture (Optional)

You have two options for applying textures:

### Option A: Apply Texture in TTS (Recommended - Easier)

**Pros:**

- ✅ Easier workflow - no need to re-export if you want to change textures
- ✅ TTS handles UV mapping automatically
- ✅ Can swap textures easily without touching Blender
- ✅ Simpler file management (no MTL files or texture paths to worry about)

**Steps:**

1. **Export your model from Blender** (without materials/textures)
   - Just export the OBJ file as-is
   - You can leave "Materials" unchecked in export settings if you want
2. **In TTS, when importing the Custom Model**:
   - Import your OBJ file under the "Model" tab
   - Under the "Diffuse/Image" tab, browse and select your texture image
   - TTS will automatically apply the texture to your model
3. **Adjust if needed**:
   - You can swap textures anytime by editing the Custom Model object
   - TTS will automatically map the texture to your model's faces

**Recommended for:** Quick setup, easy texture swapping, simpler workflow

### Option B: Apply Texture in Blender (More Control)

**Pros:**

- ✅ Full control over UV mapping (precise texture placement)
- ✅ Can see exactly how it looks before importing to TTS
- ✅ Better for complex textures that need specific alignment
- ✅ Can create custom UV layouts for optimal texture usage

**Steps:**

1. **Create or prepare your texture image**:
   - Create a PNG or JPG image
   - Recommended size: 2048x2048 or 1024x1024 pixels
   - Design should match the half-decagon shape
   - Can include wood grain, patterns, or game-specific designs
<https://steamusercontent-a.akamaihd.net/ugc/1955153621971933454/B6F99F0C62E5C1AB48D59504485E65FF7412A3DA/>
2. **UV Mapping in Blender** (for seamless tiling):

   **For the table top surface:**
   - Switch to **Edit Mode** (`Tab`)
   - Switch to **Face Select Mode** (`3` key)
   - Select **only the top faces** (all the triangular faces on the top surface)
     - Press `A` to select all, then hold `Alt` and click a side face to deselect sides
   - Switch to **UV Editing** workspace (top tabs) or split the viewport and open UV Editor
   - With top faces selected, press `U` → `Unwrap` or `Smart UV Project`
   - In the UV Editor, you should see the UV layout for the top faces
   - **For seamless tiling**, you want the UVs to cover a reasonable area (not too stretched)

   **For the sides and bottom:**
   - Select all side faces (the vertical faces around the perimeter)
   - Press `U` → `Unwrap` or `Project From View` (if viewing from the side)
   - Select the bottom face
   - Press `U` → `Unwrap` or `Project From View` (if viewing from below)

   **Tip**: You can select all (`A`) and use `U` → `Smart UV Project` to automatically unwrap everything, which works well for simple shapes like tables.

3. **Apply Material and Texture** (for seamless tiling):

   **Switch to Shading Workspace:**
   - Look at the **top tabs** in Blender (Layout, Modeling, Sculpting, UV Editing, etc.)
   - Click on **"Shading"** tab (or press `Ctrl+Page Up`/`Ctrl+Page Down` to cycle workspaces)

   **Open the Shader Editor:**
   - The Shader Editor might not be visible by default
   - **Method 1**: Look for a small **"+"** icon or **dropdown arrow** in the top-right area of the screen
     - Click it and select **"Shader Editor"** from the menu
   - **Method 2**: Split the viewport to create space for Shader Editor:
     - Move your mouse to the **right edge** of the 3D Viewport (where it meets the right panels)
     - When you see a **double-arrow cursor**, **right-click** → **"Vertical Split"**
     - Or hover over the edge and **drag left** to create a new panel
     - In the new panel, click the **editor type dropdown** (icon in bottom-left of panel) → select **"Shader Editor"**
   - **Method 3**: Use the menu: `Window` → `Toggle System Console` (or look for editor type selector)

   **Once Shader Editor is visible:**
   - The Shader Editor should appear as a panel (usually on the right side)
   - It will show a node-based interface with a grid background
   - Your table object should be selected (orange outline in 3D viewport)
   - The Shader Editor should show nodes (Principled BSDF, Material Output)
   - If you don't see nodes, click the **"New"** button in the Shader Editor to create a material

   **Important**: When you press `Shift+A`, make sure your **mouse cursor is over the Shader Editor** panel, not the 3D Viewport. The menu will be different!
     - Click inside the Shader Editor first (you should see a grid background)
     - Then press `Shift+A` - you should see node-related options (Texture, Vector, Color, etc.)

   **Set up the material:**
   - Click **"New"** if no material exists, or select an existing material
   - In the Shader Editor, you'll see a **Principled BSDF** node connected to **Material Output**

   **Add Image Texture:**
   - Press `Shift+A` → `Texture` → `Image Texture`
   - Click **"Open"** in the Image Texture node and browse to your texture file (black stone or white marble)
   - Connect the **"Color"** output of Image Texture to the **"Base Color"** input of Principled BSDF

   **Configure seamless tiling:**
   - In the Image Texture node, set **"Extension"** to **"Repeat"** (this enables tiling)
   - The texture will now tile seamlessly across your model

   **Adjust texture scale** (to control how many times it repeats):
   - Press `Shift+A` → `Vector` → `Mapping`
   - Press `Shift+A` → `Vector` → `Texture Coordinate`
   - Connect **Texture Coordinate** → **"Generated"** output to **Mapping** → **"Vector"** input
   - Connect **Mapping** → **"Vector"** output to **Image Texture** → **"Vector"** input

   **Using One Mapping Node for Multiple Textures (Recommended):**
   - **Yes, you can connect one Mapping node to multiple Image Texture nodes!**
   - Simply drag from the Mapping "Vector" output to each Image Texture "Vector" input
   - This keeps all textures aligned and makes it easy to adjust scale - change it once, affects all textures
   - **Benefits**:
     - All textures tile at the same scale
     - Only need to adjust one Mapping node
     - Ensures perfect alignment between base color, roughness, and normal maps
   - **Your setup**: Connect the same Mapping node to:
     - Base Color Image Texture "Vector" input
     - Roughness Image Texture "Vector" input
     - Normal Map Image Texture "Vector" input (if using)

   - In the **Mapping** node, adjust the **"Scale"** values:
     - **X, Y, Z**: Adjust these to control tiling density
     - **Example**: Scale of `2, 2, 2` = texture repeats 2x in each direction (smaller pattern)
     - **Example**: Scale of `0.5, 0.5, 0.5` = texture repeats 0.5x (larger pattern, less repetition)
     - **For a table**: Start with `1, 1, 1` and adjust based on your texture size
     - **Tip**: For a table top, you mainly care about X and Y (horizontal), Z (vertical) affects sides

   **Preview the texture:**
   - Switch to **Material Preview** or **Rendered** viewport shading (`Z` → `Material Preview` or `Rendered`)
   - You should see your texture applied to the model
   - Adjust the **Mapping Scale** values until the tiling looks good
   - Rotate around the model to check all surfaces

   **Fine-tuning:**
   - If the texture looks stretched on certain faces, go back to UV Editor and adjust UVs
   - You can also adjust **"Location"** and **"Rotation"** in the Mapping node to shift/rotate the texture
   - For different materials on different faces (e.g., stone top, marble sides):
     - Create multiple materials
     - In Edit Mode, select faces and assign materials using the Material Properties panel

   **Texture Maps Overview:**

   You don't necessarily need all three texture maps - here's what each does:
   - **Base Color**: The main texture/color (you have this - Blood Marble.png)
   - **Roughness Map**: Controls how reflective/smooth vs. matte/rough the surface is (optional)
     - Darker areas = rougher/more matte
     - Lighter areas = smoother/more reflective/glossy
   - **Normal Map**: Adds surface detail/depth (makes things look 3D without geometry)

   **Using Your Black/White Image:**

   Your black and white image with highlighted blood rivulets can work for multiple purposes:

   **Option 1: Use as Roughness Map (Easiest - Recommended)**
   - Connect it to Principled BSDF "Roughness" input
   - If rivulets are white: They'll be smooth/reflective (good!)
   - If rivulets are black: You need to invert the image

   **Inverting in Blender (Easiest Method):**
   - Add an **Invert** node: `Shift+A` → `Color` → `Invert`
   - Connect: Image Texture "Color" output → Invert "Color" input
   - Connect: Invert "Color" output → Principled BSDF "Roughness" input
   - This flips black to white and white to black
   - Now white rivulets = reflective, black marble = matte

   **Alternative - Using ColorRamp:**
   - Add a **ColorRamp** node: `Shift+A` → `Converter` → `ColorRamp`
   - Connect: Image Texture "Color" → ColorRamp "Fac" input
   - In ColorRamp, swap the colors:
     - Click the left color stop (black) and change it to white
     - Click the right color stop (white) and change it to black
   - Connect: ColorRamp "Color" output → Principled BSDF "Roughness" input

   **Inverting in Photoshop:**
   - Open your roughness map image
   - `Image → Adjustments → Invert` (or `Ctrl+I`)
   - Save the inverted version
   - Reload in Blender

   This makes the rivulets appear glossy/reflective while the marble stays matte

   **Option 2: Use as Normal Map**
   - Convert to proper normal map format in Photoshop (or use as-is)
   - Connect through Normal Map node to Principled BSDF "Normal" input
   - This adds depth/relief to the rivulets

   **Option 3: Use for Both (Advanced)**
   - Use the same image for both roughness and normal map
   - Just connect it to both inputs (through Normal Map node for normal, directly for roughness)
   - Works fine if the image represents both properties similarly

   **Option 4: Generate Roughness Map in Photoshop**
   - Open your black/white rivulet image
   - If rivulets are white: Use as-is (white = smooth/reflective)
   - If rivulets are black: Invert (Image → Adjustments → Invert)
   - Save as separate file (e.g., "Blood Marble Roughness.png")
   - This gives you more control over roughness vs. normal mapping

   **Recommendation for Your Setup:**
   - Use your black/white image as a **Roughness Map** (makes rivulets reflective)
   - Skip normal map for now (you can add it later if needed)
   - Or use it for both roughness and normal map if you want depth + reflectivity

   **Important: Roughness vs Normal Map Connection:**
   - **For Roughness Map**: Connect Image Texture "Color" → Principled BSDF **"Roughness"** input
     - Color Space: **sRGB** is fine (or "Non-Color" - both work)
     - Dark areas = rough/matte, Light areas = smooth/reflective
   - **For Normal Map**: Connect Image Texture → **Normal Map node** → Principled BSDF **"Normal"** input
     - Color Space: **Must be "Non-Color"** (not sRGB!)
     - Requires Normal Map node in between
   - **Don't connect roughness map directly to Normal input** - it won't work correctly without the Normal Map node

   **Adding Normal Maps (for surface detail/bump):**

   Normal maps add surface detail without adding geometry (makes surfaces look more 3D). Here's how to set it up:

   **Step-by-Step Normal Map Setup:**

   1. **Add Image Texture node for normal map:**
      - Press `Shift+A` → `Texture` → `Image Texture`
      - Click "Open" and load your normal map image (the black and white marble texture)
      - Set **Extension** to **"Repeat"** (same as your other textures)
      - **Important**: Change **Color Space** from "sRGB" to **"Non-Color"** (this is crucial for normal maps!)

   2. **Connect to Mapping (use same Mapping as base color):**
      - You already have a Mapping node for your base color texture
      - Connect the **Mapping** node's "Vector" output → Normal map Image Texture's "Vector" input
      - This ensures the normal map tiles at the same scale as your base color
      - **Alternative**: You can create a separate Mapping node with identical settings if you prefer, but using the same one is simpler

   3. **Add Normal Map node:**
      - Press `Shift+A` → `Vector` → `Normal Map`
      - This node converts the image data into normal information

   4. **Connect the nodes:**
      - Normal map Image Texture "Color" output → Normal Map node "Color" input
      - Normal Map node "Normal" output → Principled BSDF "Normal" input
      - **Do NOT** connect the Image Texture directly to Principled BSDF - you need the Normal Map node in between!

   5. **Adjust strength:**
      - In the Normal Map node, adjust the **Strength** value
      - Start with **1.0** (default)
      - Increase for more pronounced effect (e.g., 2.0-3.0)
      - Decrease for subtle effect (e.g., 0.5)
      - Adjust based on how it looks in Material Preview/Rendered view

   **Complete Node Chain for Normal Map:**

   ```
   Texture Coordinate (Generated)
     → Mapping (Vector)
     → Image Texture [Normal Map] (Vector)
     → Image Texture (Color)
     → Normal Map (Color)
     → Normal Map (Normal)
     → Principled BSDF (Normal)
   ```

   **Tips:**
   - Normal maps work best when they match the scale/tiling of your base color texture
   - Using the same Mapping node ensures perfect alignment
   - The "Non-Color" color space setting prevents Blender from incorrectly interpreting the normal map as a color image
   - Normal maps make surfaces appear to have depth/relief - darker areas appear recessed, lighter areas appear raised

4. **Export with Materials**:
   - Make sure you're in **Object Mode** (`Tab`)
   - Select your table object
   - `File → Export → Wavefront (.obj)`
   - In export settings:
     - ✅ **"Materials"** must be checked (this creates the .mtl file)
     - ✅ **"Triangulated Mesh"** should be enabled
     - ✅ **"Normals"** should be enabled
     - ✅ **"UV Coordinates"** should be enabled
   - **One export operation creates multiple files:**
     - `half-decagon-table.obj` (the 3D model geometry)
     - `half-decagon-table.mtl` (material definitions - created automatically)
   - **Important - File Organization:**
     - Keep **ALL files in the same folder**:
       - `.obj` file (the model)
       - `.mtl` file (material file - created automatically)
       - All texture images (`.png` files):
         - `Blood Marble.png` (base color)
         - `Blood Marble Roughness.png` (roughness map)
         - Any other texture images you're using
     - The `.mtl` file references the texture images by filename, so they must be in the same folder
     - **Relative paths matter** - if you move files, keep them together

5. **Importing to TTS with Materials**:
   - When importing the Custom Model in TTS:
     - Import the `.obj` file under "Model"
     - TTS should automatically detect and load the `.mtl` file
     - The texture should appear automatically
   - If textures don't show:
     - Make sure all files (.obj, .mtl, texture images) are in the same folder
     - Or upload all files to a web server and use URLs instead of local paths
     - Check that texture file paths in the .mtl file are correct (they should be relative, like `texture.jpg`)

**Recommended for:** Precise texture control, custom UV layouts, seeing results before TTS

### Recommendation

**For most users, Option A (TTS) is recommended** because:

- It's much simpler
- You can easily test different textures
- No need to manage MTL files or texture paths
- TTS's automatic UV mapping works well for table surfaces

**Use Option B (Blender) if:**

- You need precise texture alignment (e.g., specific patterns that must align with edges)
- You want to see the final look before importing
- You're creating a complex texture that needs custom UV mapping

## Step 3: Import into Tabletop Simulator

1. **Launch Tabletop Simulator**

2. **Create Custom Model Object**:
   - Right-click on the table → `Objects → Components → Custom → Custom Model`
   - Or use the menu: `Objects → Components → Custom → Custom Model`

3. **Import Your Model**:
   - In the Custom Model window, click `Import`
   - Under the **"Model"** tab:
     - Click `Browse` and select your `half-decagon-table.obj` file
   - Under the **"Diffuse/Image"** tab:
     - Click `Browse` and select your texture image (if you created one)
   - Under the **"Collider"** tab (optional):
     - You can create a custom collider OBJ file for more accurate physics
     - Or leave empty to use TTS's auto-generated box collider
   - Click `Import`

4. **Position and Scale**:
   - The model will appear in your game
   - Use the transform gizmo to position it correctly
   - Adjust scale if needed (right-click → `Scale`)

5. **Lock the Table**:
   - Right-click the table → `Lock` (to prevent accidental movement)

6. **Make Non-Interactable** (Optional):
   - Right-click → `Scripting → Scripting Editor`
   - Add this script:

   ```lua
   function onLoad()
       self.interactable = false
   end
   ```

   - Click `Save & Play`

## Step 4: Set Up Player Positions

Use the `lib/table-positions.ttslua` script to calculate player positions:

1. **Load the Script**:
   - The script is located at `lib/table-positions.ttslua` in the module
   - Functions are available via module: `require("lib.table-positions")` or globally

2. **Calculate Positions**:
   - Open TTS console (`~` key)
   - Run: `printHalfDecagonPositions()`
   - This will print all player positions

3. **Set Up Hand Zones** (Recommended):
   - Press `F4` to open the Zones tool
   - Create hand zones at each calculated player position
   - This helps players know where to sit

4. **Manual Player Positioning**:
   - Players can position themselves using the calculated coordinates
   - Or use TTS's built-in seating system (though it won't match the half-decagon shape)

## Step 5: Hosting Your Model

If you want to share your mod, you need to host the OBJ file and texture online:

1. **Upload Files**:
   - Upload `half-decagon-table.obj` to a file hosting service
   - Upload your texture image
   - Get direct URLs to both files

2. **Update Custom Model**:
   - In TTS, edit your Custom Model object
   - Replace local file paths with URLs
   - Save your game/mod

## Alternative: Using AssetBundles (Advanced)

For more advanced features (animations, effects, etc.), you can create an AssetBundle:

1. **Create in Unity**:
   - Import your OBJ model into Unity
   - Set up materials and textures
   - Build as AssetBundle

2. **Import into TTS**:
   - Use `Custom Assetbundle` object type
   - Provide AssetBundle URL

**Note**: AssetBundles require Unity knowledge and are more complex than OBJ files.

## Troubleshooting

### Model Doesn't Appear

- Check that OBJ file is triangulated
- Verify file path/URL is correct
- Check TTS console for errors

### Model Appears Upside Down or Wrong Size

- Adjust rotation in TTS (right-click → `Rotate`)
- Adjust scale (right-click → `Scale`)
- Re-export model with different orientation if needed

### Collision Issues

- Create a custom collider OBJ file
- Or adjust the model's collider settings in TTS

### Texture Not Showing

- Verify texture file path/URL
- Check that UV mapping is correct in your 3D software
- Ensure texture format is supported (PNG, JPG)

## Resources

- **TTS API Documentation**: <https://api.tabletopsimulator.com/>
- **Blender Tutorials**: <https://www.blender.org/support/tutorials/>
- **TTS Modding Community**: <https://steamcommunity.com/app/286160/workshop/>

## Script Usage

See `lib/table-positions.ttslua` for functions to calculate player positions:

```lua
-- Print all positions
printHalfDecagonPositions()

-- Custom size and position
printHalfDecagonPositions(60, {x=0, y=1.5, z=0}, "top")

-- Get positions programmatically
local positions = calculateHalfDecagonPositions(50, {x=0, y=1.5, z=0}, "top")
```
