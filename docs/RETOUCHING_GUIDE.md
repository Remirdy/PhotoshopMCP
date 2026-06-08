# Portrait Retouching & Visual Editing Protocols

This guide details the non-destructive editing protocols implemented via the Photoshop MCP Creative and retouching tools.

## 1. Frequency Separation
Frequency Separation splits image detail from color/tone:
- **Low Frequency Layer**: Represents color information. A Gaussian Blur filter is applied to blur texture details.
- **High Frequency Layer**: Represents texture details. A High Pass filter is applied, and the blend mode is set to **Linear Light** to overlay texture atop the low frequency color.
- **Dressing**: Edit tones on the low frequency layer and textures on the high frequency layer independently.

## 2. Non-Destructive Dodge & Burn
- Setup two layers named `Dodge_SoftLight` and `Burn_SoftLight`.
- Both layers are filled with 50% neutral gray (`#808080`) and set to **Soft Light** blend mode.
- Use a white brush on the Dodge layer to brighten highlights, and a black brush on the Burn layer to deepen shadows.

## 3. Smart Object Filter Stacks
- Convert target layers to Smart Objects before applying filters.
- Filter operations (Blur, Smart Sharpen) will compile as nested Smart Filters, allowing double-click value updates.
