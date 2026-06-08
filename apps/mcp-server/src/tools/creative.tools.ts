/**
 * mcp-server — creative.tools.ts
 * Image editing, photo manipulation, retouching, character creation, visual tools.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

const UIStyleSchema = z.enum([
  "premium_purple","soft_game","glass_dark","arcade_bold",
  "luxury_dark","ios_glass","dark_luxury","clean_saas",
]);

export function registerCreativeTools(server: McpServer): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE → PSD TOOLS
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "image_to_psd_layered",
    "Convert a flat image (PNG/JPG) into a layered PSD by separating subject from background using Photoshop's Select Subject AI. Creates: Background layer (masked), Subject layer (masked), original Reference layer (hidden). All layers are editable and non-destructive.",
    {
      imagePath: z.string().min(1).describe("Absolute path to the source image file (PNG/JPG/WEBP)"),
      outputPsdPath: z.string().min(1).describe("Absolute path where the layered PSD will be saved"),
      mode: z.enum(["subject_bg","multi_object","luminance","color_range"])
        .default("subject_bg")
        .describe("Separation mode: subject_bg=AI foreground/bg, multi_object=segment all objects, luminance=light/shadow, color_range=key by color"),
      keepOriginal: z.boolean().default(true).describe("Keep original flattened layer as hidden reference"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("imageToPsdLayered", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "remove_background",
    "Remove the background from the active layer using Photoshop's AI Select Subject. Creates a mask layer — does NOT permanently delete pixels. Background can be revealed anytime by editing the mask.",
    {
      layerName: z.string().optional().describe("Target layer name (defaults to active layer)"),
      mode: z.enum(["ai","color_range","luminance"]).default("ai")
        .describe("Detection mode: ai=Photoshop AI, color_range=sample a color, luminance=by brightness"),
      refineEdge: z.boolean().default(true).describe("Apply Refine Edge to improve hair/fur/complex edges"),
      outputMaskOnly: z.boolean().default(false).describe("Only add the mask, don't create a separate BG layer"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("removeBackground", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "swap_background",
    "Replace the background of an existing masked layer with a new image. Keeps subject mask intact. Positions new background behind subject, adjusts scale to fill canvas.",
    {
      subjectLayerName: z.string().min(1).describe("Name of the masked subject layer to preserve"),
      backgroundAssetPath: z.string().min(1).describe("Absolute path to new background image"),
      fitMode: z.enum(["fill","fit","stretch","center"]).default("fill")
        .describe("How to fit new background to canvas"),
      matchLighting: z.boolean().default(false).describe("Add Color Balance adjustment layer to match subject lighting to new BG"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("swapBackground", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "composite_layers",
    "Merge multiple images into a single composition with suggested blend modes and opacity. Each image becomes a separate named Smart Object layer. Returns blend mode recommendations.",
    {
      layers: z.array(z.object({
        path: z.string().min(1).describe("Asset file path"),
        name: z.string().min(1).describe("Layer name"),
        blendMode: z.enum(["normal","multiply","screen","overlay","softLight","hardLight","colorDodge","colorBurn","difference","luminosity","color"]).optional(),
        opacity: z.number().min(0).max(100).default(100),
        x: z.number().default(0),
        y: z.number().default(0),
      })).min(2).describe("List of images to composite"),
      autoBlend: z.boolean().default(true).describe("Let AI suggest optimal blend modes for each layer"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("compositeLayers", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // COLOR GRADING & ADJUSTMENT LAYERS
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "color_grade_preset",
    "Apply a named color grade as non-destructive Adjustment Layers (Curves, Hue/Saturation, Color Balance, Vibrance). All adjustments remain editable. Optionally apply to a specific group or entire document.",
    {
      preset: z.enum([
        "cinematic_teal_orange","golden_hour","cool_blue","neon_cyberpunk",
        "vintage_film","high_contrast_bw","soft_matte","moody_dark",
        "bright_airy","warm_sunset","cold_winter","horror_desaturated",
        "anime_vivid","studio_clean","custom",
      ]).describe("Named color grade preset to apply"),
      targetGroup: z.string().optional().describe("Apply clipped to this group only (leave empty for document-wide)"),
      intensity: z.number().min(0).max(100).default(100).describe("Overall intensity of the grade (0=none, 100=full)"),
      customValues: z.object({
        temperature: z.number().min(-100).max(100).optional(),
        tint: z.number().min(-100).max(100).optional(),
        exposure: z.number().min(-5).max(5).optional(),
        contrast: z.number().min(-100).max(100).optional(),
        highlights: z.number().min(-100).max(100).optional(),
        shadows: z.number().min(-100).max(100).optional(),
        saturation: z.number().min(-100).max(100).optional(),
        vibrance: z.number().min(-100).max(100).optional(),
      }).optional().describe("Custom adjustment values (used when preset='custom')"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("colorGradePreset", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "add_adjustment_layer",
    "Add a single non-destructive Photoshop adjustment layer. All values remain editable in the Properties panel.",
    {
      type: z.enum([
        "curves","levels","brightnessContrast","hueSaturation","colorBalance",
        "vibrance","photoFilter","channelMixer","colorLookup",
        "gradientMap","selectiveColor","threshold","posterize","invert",
        "solidColor","gradient","pattern",
      ]).describe("Type of adjustment layer to create"),
      name: z.string().optional().describe("Optional custom name for the adjustment layer"),
      parentGroup: z.string().optional().describe("Parent group to place the adjustment layer into"),
      clipped: z.boolean().default(false).describe("Clip adjustment to layer directly below it"),
      values: z.record(z.string(), z.unknown()).optional().describe("Type-specific values (e.g. {hue:30, saturation:-20, lightness:5} for hueSaturation)"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("addAdjustmentLayer" as any, args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "smart_filter_stack",
    "Convert a raster layer to a Smart Object and apply a non-destructive filter stack. Filters can be toggled, reordered, or adjusted at any time without quality loss.",
    {
      layerName: z.string().optional().describe("Layer to convert and filter (defaults to active layer)"),
      filters: z.array(z.object({
        type: z.enum(["gaussianBlur","unsharpMask","smartSharpen","noiseReduction","median","motionBlur","radialBlur","lensBlur","surfaceBlur","oilPaint","highPass"]),
        radius: z.number().min(0).max(250).optional(),
        amount: z.number().min(0).max(500).optional(),
        threshold: z.number().min(0).max(255).optional(),
        opacity: z.number().min(0).max(100).default(100),
        blendMode: z.enum(["normal","luminosity","multiply"]).default("normal"),
      })).default([{type:"gaussianBlur", radius:2}]).describe("Ordered filter stack to apply"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("smartFilterStack", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PORTRAIT / PHOTO RETOUCHING
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "portrait_retouch_setup",
    "Create a complete professional portrait retouching layer stack: Frequency Separation, Dodge & Burn, Color Correction, Skin Tone adjustment, Eye Enhancement, and Spot Heal layers — all non-destructive and clearly labeled.",
    {
      layerName: z.string().optional().describe("Source portrait layer to base the stack on (defaults to active layer)"),
      includeFrequencySeparation: z.boolean().default(true),
      includeDodgeBurn: z.boolean().default(true),
      includeColorCorrection: z.boolean().default(true),
      includeSkinToneAdjustment: z.boolean().default(true),
      includeEyeEnhancement: z.boolean().default(false),
      frequencyRadius: z.number().min(1).max(20).default(6).describe("Gaussian Blur radius for frequency separation"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("portraitRetouchSetup", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "frequency_separation",
    "Split a portrait layer into High Frequency (texture/detail) and Low Frequency (color/tone) layers for advanced non-destructive skin retouching. Industry-standard technique.",
    {
      layerName: z.string().optional().describe("Source layer (defaults to active layer)"),
      radius: z.number().min(0.5).max(30).default(6).describe("Gaussian Blur radius. 4–6 for portraits, 8–12 for fabric/material"),
      bitDepth: z.enum(["8","16"]).default("8").describe("16-bit uses Linear Light blend mode for more accurate separation"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("frequencySeparation", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "dodge_burn_setup",
    "Create a non-destructive Dodge & Burn retouching layer pair: two 50% gray layers in Dodge (Soft Light) and Burn (Soft Light) blend modes. Paint with white to dodge, black to burn — fully reversible.",
    {
      parentLayerName: z.string().optional().describe("Optional parent group context"),
      strength: z.number().min(1).max(100).default(50).describe("Sets layer opacity (lower = more subtle)"),
      includeGuide: z.boolean().default(true).describe("Add a text guide layer explaining the technique"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("dodgeBurnSetup", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "object_removal_mask",
    "Create a selection mask around a specified area to prepare for Content-Aware Fill or Generative Fill. Marks the area cleanly without destructive edits.",
    {
      x: z.number().describe("Selection X start"),
      y: z.number().describe("Selection Y start"),
      width: z.number().min(1).describe("Selection width"),
      height: z.number().min(1).describe("Selection height"),
      feather: z.number().min(0).max(100).default(5).describe("Feather radius for soft edge blending"),
      expand: z.number().min(0).max(100).default(5).describe("Expand selection by N pixels to capture object edges"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("objectRemovalMask", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "sky_replacement_prep",
    "Prepare a photo for sky replacement: creates sky selection mask, adds gradient overlay transition layer, and sets up a Sky group with replacement placeholder layer.",
    {
      layerName: z.string().optional().describe("Source photo layer (defaults to active layer)"),
      skyAssetPath: z.string().optional().describe("Optional sky replacement image to place immediately"),
      transitionBlend: z.number().min(0).max(100).default(30).describe("Blend softness at horizon line"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("skyReplacementPrep", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CANVAS / DOCUMENT MANIPULATION
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "resize_image",
    "Resize the active document canvas and/or image content with resampling options. Supports pixel, percent, and preset-based resizing.",
    {
      width: z.number().min(1).max(30000).optional().describe("New width in pixels"),
      height: z.number().min(1).max(30000).optional().describe("New height in pixels"),
      widthPercent: z.number().min(1).max(1000).optional().describe("Width as percentage of current size"),
      heightPercent: z.number().min(1).max(1000).optional().describe("Height as percentage of current size"),
      resampleMethod: z.enum(["automatic","preserveDetails","bicubic","bicubicSharper","bicubicSmoother","nearestNeighbor","bilinear"])
        .default("automatic"),
      constrainProportions: z.boolean().default(true),
      resampleImage: z.boolean().default(true).describe("false = resize canvas only (no pixel resampling)"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("imageResize", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "crop_canvas",
    "Crop or expand the canvas to new dimensions. Expanding fills new areas with background color or transparency.",
    {
      width: z.number().min(1).max(30000).describe("New canvas width in pixels"),
      height: z.number().min(1).max(30000).describe("New canvas height in pixels"),
      anchor: z.enum(["topLeft","topCenter","topRight","middleLeft","center","middleRight","bottomLeft","bottomCenter","bottomRight"])
        .default("center").describe("Where existing content anchors when canvas size changes"),
      deleteOutside: z.boolean().default(false).describe("Delete pixels outside crop boundary (destructive)"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("cropCanvas", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "rotate_canvas",
    "Rotate or flip the entire canvas.",
    {
      angle: z.enum(["90cw","90ccw","180","flipH","flipV","custom"]).describe("Rotation direction or flip axis"),
      customAngle: z.number().min(-360).max(360).optional().describe("Custom angle in degrees (used when angle='custom')"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("rotateCanvas", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "convert_color_mode",
    "Convert the active document's color mode. RGB→CMYK for print, RGB→Grayscale for BW, Lab for advanced color work.",
    {
      targetMode: z.enum(["RGB","CMYK","Grayscale","Lab","Bitmap","Indexed"]),
      bitDepth: z.enum(["8","16","32"]).default("8"),
      flatten: z.boolean().default(false).describe("Flatten layers before conversion (some modes require flattening)"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("convertColorMode", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CHARACTER CREATION TOOLS
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "create_character_concept_sheet",
    "Create a professional character concept turnaround sheet with front, 3/4, side, and back view artboards. Each view gets its own labeled group with guideline layers for proportion alignment.",
    {
      characterName: z.string().min(1).describe("Character name used for group and file naming"),
      views: z.array(z.enum(["front","three_quarter","side","back","back_three_quarter"])).default(["front","side","back"]),
      artboardWidth: z.number().int().min(200).max(4096).default(1024),
      artboardHeight: z.number().int().min(200).max(8192).default(2048),
      includeProportionGuides: z.boolean().default(true).describe("Add horizontal proportion guide lines (head height markers)"),
      includeColorPaletteArea: z.boolean().default(true).describe("Add color swatch area at bottom of each artboard"),
      style: UIStyleSchema.default("clean_saas"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createCharacterConceptSheet", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "create_character_reference_sheet",
    "Build a comprehensive character reference sheet with turnaround views, expression sheet, action poses, and detail callouts — all on one document.",
    {
      characterName: z.string().min(1),
      canvasWidth: z.number().int().default(3840),
      canvasHeight: z.number().int().default(2160),
      sections: z.array(z.enum(["turnaround","expressions","action_poses","detail_callouts","color_palette","equipment"])).default(["turnaround","expressions","color_palette"]),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createCharacterReferenceSheet", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "create_sprite_sheet_setup",
    "Create a structured Photoshop document for animation sprite sheet production. Each animation state (idle, run, attack, death) gets its own group with numbered frame layers.",
    {
      characterName: z.string().min(1),
      frameWidth: z.number().int().min(8).max(2048).default(128),
      frameHeight: z.number().int().min(8).max(2048).default(128),
      animationStates: z.array(z.object({
        name: z.string().describe("Animation state name, e.g. 'idle'"),
        frameCount: z.number().int().min(1).max(256).describe("Number of frames"),
      })).default([
        {name:"idle", frameCount:4},
        {name:"run", frameCount:8},
        {name:"attack", frameCount:6},
        {name:"death", frameCount:8},
        {name:"jump", frameCount:4},
      ]),
      includeGrid: z.boolean().default(true).describe("Overlay grid guide layer for frame boundaries"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createSpriteSheetSetup", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );





  server.tool(
    "create_character_color_palette",
    "Extract the dominant colors from a character layer and create a structured color swatch group below the character with labeled color chips.",
    {
      layerName: z.string().optional().describe("Character layer to sample (defaults to active layer)"),
      swatchCount: z.number().int().min(2).max(20).default(8).describe("Number of colors to extract"),
      swatchSize: z.number().int().min(20).max(200).default(60),
      includeHexLabels: z.boolean().default(true),
      groupName: z.string().default("Character_Color_Palette"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createCharacterColorPalette", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "create_character_shadow_setup",
    "Create a professional shadow and highlight layer setup beneath a character: drop shadow, ambient occlusion, rim light, and contact shadow — all as separate editable layers.",
    {
      characterLayerName: z.string().optional().describe("Character layer name (defaults to active layer)"),
      shadowColor: z.string().default("#1A0B3B").describe("Shadow hex color"),
      rimLightColor: z.string().default("#6B8FFF").describe("Rim/backlight hex color"),
      includeContactShadow: z.boolean().default(true),
      includeAmbientOcclusion: z.boolean().default(true),
      includeRimLight: z.boolean().default(true),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createCharacterShadowSetup", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "build_character_ui_kit",
    "From a character artwork layer, generate all UI-ready sizes: large portrait (512×512), medium portrait (256×256), mini avatar (128×128), tiny icon (64×64) — each in its own labeled group.",
    {
      characterLayerName: z.string().optional().describe("Source character layer (defaults to active layer)"),
      sizes: z.array(z.object({
        name: z.string(),
        width: z.number().int(),
        height: z.number().int(),
      })).default([
        {name:"portrait_lg", width:512, height:512},
        {name:"portrait_md", width:256, height:256},
        {name:"avatar_sm", width:128, height:128},
        {name:"icon_xs", width:64, height:64},
      ]),
      outputGroup: z.string().default("Character_UI_Kit"),
      addBadgeBackground: z.boolean().default(false).describe("Add a circular badge frame behind each size"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("buildCharacterUIKit", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE / ENVIRONMENT TOOLS
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "create_parallax_scene",
    "Create a multi-depth parallax background structure. Each depth layer is sized wider than the canvas for scrolling. Includes sky, far mountains, mid buildings, near trees, and foreground layers.",
    {
      theme: z.string().min(1).describe("Visual theme: 'forest','sci-fi city','desert','fantasy castle','underwater','space'"),
      layerCount: z.number().int().min(2).max(12).default(6),
      canvasWidth: z.number().int().default(1290),
      canvasHeight: z.number().int().default(2796),
      overlapFactor: z.number().min(1).max(3).default(1.5).describe("Width multiplier for scroll layers (1.5 = 50% wider than canvas)"),
      includeMotionBlur: z.boolean().default(true).describe("Add smart filter motion blur to far layers for depth effect"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createParallaxScene", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "create_loading_screen_template",
    "Generate a premium mobile/PC loading screen with progress bar, logo area, background, tips text, and version label — all as editable layers.",
    {
      title: z.string().min(1).describe("Game/app name"),
      progress: z.number().min(0).max(100).default(0).describe("Initial progress percentage"),
      tipText: z.string().optional().describe("Loading tip text to show"),
      style: UIStyleSchema.default("premium_purple"),
      canvasPreset: z.enum(["iphone_15_pro_max_game","unity_ui_atlas","custom"]).default("iphone_15_pro_max_game"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createLoadingScreenTemplate", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "create_splash_screen_template",
    "Create a branded splash screen template for mobile/PC launch. Includes logo area, animated-ready particles group, background, loading dots, and copyright text layers.",
    {
      title: z.string().min(1).describe("Game/app title"),
      subtitle: z.string().optional(),
      logoAssetPath: z.string().optional().describe("Optional path to logo PNG"),
      style: UIStyleSchema.default("premium_purple"),
      canvasPreset: z.enum(["iphone_15_pro_max_game","instagram_story","custom"]).default("iphone_15_pro_max_game"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createSplashScreenTemplate", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "create_icon_set",
    "Create a multi-size icon production document. Each size gets its own labeled artboard-style group at the correct pixel dimensions.",
    {
      iconName: z.string().min(1).describe("Icon name prefix"),
      sizes: z.array(z.number().int().min(8).max(2048)).default([16,32,48,64,128,256,512,1024]),
      includeGuides: z.boolean().default(true).describe("Add safe area and bleed guides inside each size group"),
      backgroundColor: z.string().default("transparent"),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createIconSet", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "create_tileset_template",
    "Create a professional tileset production template with grid overlay, numbered cell labels, and separate layers for base tiles, variant tiles, and collision markers.",
    {
      columns: z.number().int().min(1).max(64).describe("Columns in the tileset"),
      rows: z.number().int().min(1).max(64).describe("Rows in the tileset"),
      tileSize: z.number().int().min(4).max(512).describe("Width/height of each tile in pixels"),
      padding: z.number().int().min(0).max(32).default(0).describe("Pixel gap between tiles (for texture bleed prevention)"),
      type: z.enum(["standard","nine_slice","isometric","hex"]).default("standard"),
      includeCollisionLayer: z.boolean().default(true),
      includeVariantsGroup: z.boolean().default(true),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createTilesetTemplate", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  server.tool(
    "create_vfx_flipbook",
    "Create a VFX sprite flipbook grid template. Sets up the correct canvas size for the atlas, adds grid overlay, and creates numbered frame groups ready for VFX artwork.",
    {
      frameCount: z.number().int().min(1).max(256).describe("Total animation frames"),
      frameWidth: z.number().int().min(8).max(4096),
      frameHeight: z.number().int().min(8).max(4096),
      columns: z.number().int().min(1).max(32).optional().describe("Columns in atlas (auto-calculated if not set)"),
      vfxType: z.enum(["explosion","fire","smoke","magic","electricity","water","dust","custom"]).default("custom"),
      includeGridGuide: z.boolean().default(true),
      includeFrameNumbers: z.boolean().default(true),
    },
    async (args) => {
      try { return toMcpContent(await bridgeClient.sendJob("createVfxFlipbook", args)); }
      catch (err) { return toMcpError(err instanceof Error ? err.message : String(err)); }
    }
  );

  // ─── setup_beauty_retouch_suite ─────────────────────────────────────────────
  server.tool(
    "setup_beauty_retouch_suite",
    "Creates a full non-destructive professional retouching layer stack in Photoshop (Beauty Retouch Academy replica). Creates Dodge & Burn soft light overlays, High/Low Frequency Separation layers, skin color correction swatches, and eyes brightening masks.",
    {
      dodgeBurnStrength: z.number().int().min(1).max(100).default(50).describe("Brush blend intensity preset for Dodge & Burn"),
      frequencySeparationRadius: z.number().min(0.1).max(100).default(6).describe("Gaussian blur radius for texture/color separation"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("setupBeautyRetouchSuite", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── generative_extend_canvas ───────────────────────────────────────────────
  server.tool(
    "generative_extend_canvas",
    "Generatively extend the active document canvas in a direction and apply AI outpainting fill to merge seamlessly with the source scene (Generative Outpainting replica).",
    {
      direction: z.enum(["left", "right", "top", "bottom"]).describe("The direction to extend the canvas in"),
      extendPx: z.number().int().min(1).max(10000).describe("Amount in pixels to extend the canvas by"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("generativeExtendCanvas", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── ai_segment_and_inpaint_psd ─────────────────────────────────────────────
  server.tool(
    "ai_segment_and_inpaint_psd",
    "Convert a flat flat PNG image into a multi-layered PSD by running AI Object Segmentation (SAM) and inpainting hidden background occlusions.",
    {
      imagePath: z.string().min(1).describe("Absolute path to the flat PNG image to segment"),
      outputPsdPath: z.string().min(1).describe("Absolute path where the layered PSD will be saved"),
      detectObjectsCount: z.number().int().min(1).max(50).default(5).describe("Target number of foreground object layers to detect and segment"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("aiSegmentAndInpaintPsd", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
