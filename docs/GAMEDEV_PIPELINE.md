# Game Development Assets Production Pipeline

This guide outlines the game asset creation, rigging prep, and atlas packing pipeline using the Photoshop MCP Game Dev tools.

## 1. Character Turnaround & 2D Rigging Setup
To prepare 2D characters for skeletal rigging tools (like Spine or Live2D):
1. **Concept Turnaround**: Use `create_character_concept_sheet` to setup front, side, and back views as separate aligned groups.
2. **Segmentation**: Use `create_rig_ready_character` to break down active artwork layers into folders containing individual joints/parts (e.g. `head`, `torso`, `arm_left`, `arm_right`).
3. **Pivots**: Layer center bounds are recorded to calculate joint pivot locations.

## 2. Sprite Sheet & Animation Loops
For traditional flipbook VFX animations:
1. **Setup Grid**: Segment active loops using `create_vfx_flipbook` into sequential frame groups.
2. **Slicing**: Use `slice_sprite_sheet` to parse flat sprite sheets into separate files.
3. **Atlas Packing**: Re-bundle files using `pack_sprite_sheet_atlas` to generate packed atlases alongside JSON layout descriptors for game engines.

## 3. UI Panels & 9-Slice Scale Template
- Scale panel borders cleanly by setting up a 9-slice grid template using `create_nine_slice_template` to add guides at margins, preserving corner scales.
- Sync UI styles using token palettes with `create_ui_skin_from_tokens`.
