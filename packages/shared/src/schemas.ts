/**
 * @remirdy/shared — schemas.ts
 * Shared Zod schemas used by MCP server tool validation.
 */
import { z } from "zod";

// ─── Primitives ───────────────────────────────────────────────────────────────

export const HexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{3,8}$/, "Must be a hex color like #RRGGBB");

export const Opacity = z.number().min(0).max(100);

export const StrokeSchema = z.object({
  color: HexColor,
  width: z.number().min(0).max(200),
});

export const ShadowSchema = z.object({
  enabled: z.boolean().default(true),
  opacity: Opacity.default(35),
  blur: z.number().min(0).max(250).default(18),
  distance: z.number().min(0).max(500).default(8),
  angle: z.number().min(0).max(360).default(90),
  color: HexColor.default("#000000"),
});

export const GradientSchema = z.object({
  type: z.enum(["linear", "radial"]).default("radial"),
  from: HexColor,
  to: HexColor,
  angle: z.number().min(0).max(360).optional(),
});

// ─── Document ─────────────────────────────────────────────────────────────────

export const DocumentPresetSchema = z.enum([
  "iphone_15_pro_max_game",
  "instagram_post_4x5",
  "instagram_story",
  "app_store_screenshot",
  "unity_ui_atlas",
  "custom",
]);

export const CreateDocumentSchema = z.object({
  name: z.string().min(1).max(200),
  width: z.number().int().min(1).max(20000).optional(),
  height: z.number().int().min(1).max(20000).optional(),
  resolution: z.number().min(1).max(1200).default(72),
  colorMode: z.enum(["RGB", "CMYK", "Grayscale"]).default("RGB"),
  backgroundColor: HexColor.optional().default("#FFFFFF"),
  transparent: z.boolean().default(false),
  preset: DocumentPresetSchema.optional().default("custom"),
});

// ─── Layer / Group ────────────────────────────────────────────────────────────

export const GroupDescriptorSchema: z.ZodType<{
  name: string;
  children?: Array<{ name: string; children?: unknown[] }>;
}> = z.lazy(() =>
  z.object({
    name: z.string().min(1).max(200),
    children: z.array(GroupDescriptorSchema).optional(),
  })
);

export const LayerPositionSchema = z.enum(["front", "back", "above", "below"]);

export const UIStyleSchema = z.enum([
  "premium_purple",
  "soft_game",
  "glass_dark",
  "arcade_bold",
  "luxury_dark",
  "ios_glass",
  "dark_luxury",
  "clean_saas",
]);

// ─── Shape ────────────────────────────────────────────────────────────────────

export const CreateRectangleSchema = z.object({
  name: z.string().min(1).max(200),
  x: z.number(),
  y: z.number(),
  width: z.number().min(1),
  height: z.number().min(1),
  radius: z.number().min(0).max(999).default(0),
  fill: HexColor.optional(),
  stroke: StrokeSchema.optional(),
  shadow: ShadowSchema.optional(),
  parentGroup: z.string().optional(),
});

export const CreateCircleSchema = z.object({
  name: z.string().min(1).max(200),
  x: z.number(),
  y: z.number(),
  diameter: z.number().min(1),
  fill: HexColor.optional(),
  stroke: StrokeSchema.optional(),
  parentGroup: z.string().optional(),
});

// ─── Text ─────────────────────────────────────────────────────────────────────

export const CreateTextLayerSchema = z.object({
  name: z.string().min(1).max(200),
  text: z.string().min(1),
  x: z.number(),
  y: z.number(),
  fontSize: z.number().min(1).max(500).default(32),
  color: HexColor.default("#FFFFFF"),
  fontFamily: z.string().default("Arial"),
  align: z.enum(["left", "center", "right"]).default("left"),
  parentGroup: z.string().optional(),
});

// ─── Asset ────────────────────────────────────────────────────────────────────

export const PlaceAssetSchema = z.object({
  path: z.string().min(1),
  layerName: z.string().min(1).max(200),
  x: z.number().default(0),
  y: z.number().default(0),
  scale: z.number().min(1).max(1000).default(100),
  scaleX: z.number().min(1).max(1000).optional(),
  scaleY: z.number().min(1).max(1000).optional(),
  rotation: z.number().min(-360).max(360).default(0),
  parentGroup: z.string().optional(),
});

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const WorkflowPresetSchema = z.enum([
  "premium_mobile_game_ui_case",
  "game_ui_hud",
  "confirmation_popup",
  "social_post",
  "app_store_screenshot",
  "unity_ui_export",
]);

export const ThemePresetSchema = z.enum([
  "premium_puzzle",
  "arcade_inventory",
  "fantasy_shop",
  "cozy_match",
  "dark_luxury",
  "clean_saas_game",
]);

export const LayerEffectPresetSchema = z.enum([
  "soft_shadow",
  "inner_depth",
  "premium_button",
  "soft_glow",
  "gold_rim",
  "dark_glass",
  "subtle_emboss",
  "floating_card",
]);

export const GroupStylePresetSchema = z.enum([
  "premium_game_ui",
  "soft_game",
  "ios_glass",
  "dark_luxury",
  "arcade_bold",
  "clean_saas",
]);

export const NamingModeSchema = z.enum(["game_ui", "social", "app_store", "unity_ui", "generic"]);

export const CaseFormatSchema = z.enum([
  "game_art_case",
  "social_campaign",
  "app_store",
  "unity_ui_pack",
]);

export const LayoutSchema = z.enum(["centered", "grid", "use_manifest"]);

// ─── Priority Feature Zod Schemas ───────────────────────────────────────────

export const ImageToPsdLayeredSchema = z.object({
  imagePath: z.string().min(1),
  outputPsdPath: z.string().min(1),
  mode: z.enum(["subject_bg", "multi_object"]).default("subject_bg"),
});

export const SliceSpriteSheetSchema = z.object({
  imagePath: z.string().min(1),
  frameWidth: z.number().int().min(1),
  frameHeight: z.number().int().min(1),
  outputFolder: z.string().min(1),
});

export const PackSpriteSheetAtlasSchema = z.object({
  inputFolder: z.string().min(1),
  outputAtlasPath: z.string().min(1),
  outputManifestPath: z.string().min(1),
  columns: z.number().int().min(1).optional(),
});

export const ExportAppIconPackSchema = z.object({
  masterIconPath: z.string().optional(),
  outputFolder: z.string().min(1),
  platforms: z.array(z.enum(["ios", "android", "web"])).default(["ios", "android", "web"]),
});

export const ColorGradePresetSchema = z.object({
  layerName: z.string().optional(),
  preset: z.enum(["warm", "cool", "vintage", "cyberpunk"]),
});

export const GenerateHandoffSpecSchema = z.object({
  outputPath: z.string().min(1),
  format: z.enum(["markdown", "json", "html"]).default("markdown"),
});

// ─── Creative Zod Schemas ──────────────────────────────────────────────────────

export const CreateCharacterConceptSheetSchema = z.object({
  projectName: z.string().min(1),
  views: z.array(z.string()).default(["front", "side", "back"]),
  artboardSize: z.number().int().min(64).max(8192).default(1024),
});

export const CreateTilesetTemplateSchema = z.object({
  columns: z.number().int().min(1).max(100),
  rows: z.number().int().min(1).max(100),
  tileSize: z.number().int().min(4).max(1024),
  padding: z.number().int().min(0).max(100).default(0),
});

export const CreateVfxFlipbookSchema = z.object({
  frameCount: z.number().int().min(1).max(256),
  frameWidth: z.number().int().min(8).max(4096),
  frameHeight: z.number().int().min(8).max(4096),
});

export const CreateParallaxSceneSchema = z.object({
  theme: z.string().min(1),
  layersCount: z.number().int().min(2).max(20).default(5),
});

export const CreateLoadingScreenSchema = z.object({
  title: z.string().min(1),
  progress: z.number().min(0).max(100).default(0),
  style: UIStyleSchema.default("premium_purple"),
});

export const CreateSplashScreenSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  style: UIStyleSchema.default("premium_purple"),
});

export const CreateIconSetSchema = z.object({
  name: z.string().min(1),
  sizes: z.array(z.number().int().min(8).max(2048)).default([16, 32, 48, 64, 128, 256, 512, 1024]),
});

// ─── Game Dev Zod Schemas ──────────────────────────────────────────────────────

export const CreateColorVariantsSchema = z.object({
  layerName: z.string().min(1),
  variantsCount: z.number().int().min(1).max(20).default(3),
  hueStep: z.number().min(-180).max(180).default(45),
});

export const CreateRigReadyCharacterSchema = z.object({
  characterName: z.string().min(1),
  parts: z.array(z.string()).default(["head", "torso", "arm_left", "arm_right", "leg_left", "leg_right"]),
});

export const CreateUiSkinFromTokensSchema = z.object({
  tokens: z.record(z.string(), z.string()),
});

export const CreateNineSliceTemplateSchema = z.object({
  width: z.number().int().min(10).max(4096),
  height: z.number().int().min(10).max(4096),
  borderSize: z.number().int().min(1).max(1024),
});

// ─── Visual Editing Zod Schemas ─────────────────────────────────────────────────

export const RemoveBackgroundSchema = z.object({
  layerName: z.string().optional(),
  mode: z.enum(["ai", "color_range"]).default("ai"),
});

export const SwapBackgroundSchema = z.object({
  subjectLayerName: z.string().min(1),
  backgroundAssetPath: z.string().min(1),
});

export const FrequencySeparationSchema = z.object({
  layerName: z.string().optional(),
  radius: z.number().min(0.1).max(100).default(6),
});

export const DodgeBurnSetupSchema = z.object({
  layerName: z.string().optional(),
  strength: z.number().min(1).max(100).default(50),
});

export const SmartFilterStackSchema = z.object({
  layerName: z.string().optional(),
  filters: z.array(z.enum(["blur", "sharpen", "denoise"])).default(["blur", "sharpen"]),
});

// ─── Platform Export Zod Schemas ────────────────────────────────────────────────

export const ExportReactNativeAssetsSchema = z.object({
  outputPath: z.string().min(1),
  scaleFactors: z.array(z.number()).default([1, 2, 3]),
});

export const ExportFlutterAssetsSchema = z.object({
  outputPath: z.string().min(1),
  scaleFactors: z.array(z.number()).default([1, 1.5, 2, 3, 4]),
});

export const ExportUnityPackageSchema = z.object({
  outputPath: z.string().min(1),
  atlasPath: z.string().min(1),
  metaSettings: z.record(z.string(), z.any()).optional(),
});

export const ExportGodotSpritesheetSchema = z.object({
  outputPath: z.string().min(1),
  spritesheetPath: z.string().min(1),
});

export const ExportOpenGraphPackSchema = z.object({
  outputPath: z.string().min(1),
  title: z.string().min(1),
  siteName: z.string().optional(),
});

export const ExportAdBannerPackSchema = z.object({
  outputPath: z.string().min(1),
  campaignName: z.string().min(1),
});

// ─── QA & Inspect Zod Schemas ────────────────────────────────────────────────────

export const AnalyzeLayerUsageSchema = z.object({
  includeHidden: z.boolean().default(true),
});

export const AnalyzeColorPaletteSchema = z.object({
  maxColors: z.number().int().min(1).max(256).default(16),
});

export const CheckAccessibilityContrastSchema = z.object({
  textLayerName: z.string().min(1),
  backgroundLayerName: z.string().min(1),
});

export const AuditFontsSchema = z.object({
  expectedFonts: z.array(z.string()).default(["Arial", "Helvetica", "Inter", "Roboto"]),
});

export const BatchReplaceTextSchema = z.object({
  find: z.string().min(1),
  replace: z.string(),
});

export const GeneratePsdDiffSchema = z.object({
  manifestAPath: z.string().min(1),
  manifestBPath: z.string().min(1),
});

export const CheckBrandComplianceSchema = z.object({
  brandTokens: z.object({
    colors: z.array(HexColor),
    fonts: z.array(z.string()),
  }),
});

export const CheckResolutionsSchema = z.object({
  minDpi: z.number().min(1).default(72),
});

// ─── Integration Zod Schemas ────────────────────────────────────────────────────

export const ImportFigmaFrameSchema = z.object({
  figmaFrameJson: z.string().min(1),
});

export const DownloadGoogleFontSchema = z.object({
  fontFamily: z.string().min(1),
  fontUrl: z.string().url().optional(),
});

export const SendSlackNotificationSchema = z.object({
  webhookUrl: z.string().url(),
  message: z.string().min(1),
  channel: z.string().optional(),
});

// ─── Extra AI Analysis Zod Schemas ─────────────────────────────────────────────

export const BatchApplyStyleSchema = z.object({
  stylePreset: z.string().min(1),
  layerQuery: z.string().min(1),
});

export const DetectDuplicateLayersSchema = z.object({
  includeHidden: z.boolean().default(true),
});

export const AnalyzePsdComplexitySchema = z.object({
  detailed: z.boolean().default(false),
});

export const SuggestLayerGroupingSchema = z.object({
  mode: z.enum(["flat", "hierarchical"]).default("hierarchical"),
});

export const DetectMissingAssetsSchema = z.object({
  placeholderPattern: z.string().default("placeholder|_temp|untitled"),
});

export const AutoAlignLayersSchema = z.object({
  alignType: z.enum(["center", "left", "right", "top", "bottom"]),
});

export const AutoSpaceLayersSchema = z.object({
  spacingType: z.enum(["horizontal", "vertical"]),
  spacingPx: z.number().int().min(0).optional(),
});

export const SmartCropToSubjectSchema = z.object({
  padding: z.number().int().min(0).default(0),
});

export const ExtractDominantColorsSchema = z.object({
  layerName: z.string().min(1),
  maxColors: z.number().int().min(1).max(256).default(5),
});

// ─── Extra QA Verification Zod Schemas ──────────────────────────────────────────

export const CheckBrandColorsSchema = z.object({
  brandColors: z.array(HexColor),
});

export const FindMissingPlaceholdersSchema = z.object({
  placeholderPattern: z.string().default("placeholder|_temp|untitled"),
});

export const CheckTextEditabilitySchema = z.object({
  includeHidden: z.boolean().default(true),
});

export const CheckSmartObjectsSchema = z.object({
  embedOnly: z.boolean().default(false),
});

export const ValidateExportReadinessSchema = z.object({
  checklistName: z.string().default("general"),
});

export const GenerateQaReportSchema = z.object({
  outputPath: z.string().min(1),
});

export const CheckLayerNamingConventionsSchema = z.object({
  namingStyle: z.enum(["snake", "camel", "pascal", "kebab"]).default("snake"),
});

export const DetectOverlappingLayersSchema = z.object({
  thresholdPx: z.number().min(0).default(0),
});

export const CheckDocumentColorProfileSchema = z.object({
  expectedProfile: z.string().default("sRGB IEC61966-2.1"),
});

export const ValidateBlendModesSchema = z.object({
  warnOnModes: z.array(z.string()).default(["dissolve", "hardMix"]),
});

export const SnapshotDocumentStateSchema = z.object({
  snapshotName: z.string().min(1),
});

// ─── Premium Plugin & Canva / AI Zod Schemas ───────────────────────────────────

export const CreateAdvancedGridLayoutSchema = z.object({
  columns: z.number().int().min(1).max(100),
  rows: z.number().int().min(1).max(100),
  margins: z
    .object({
      top: z.number().int().default(0),
      bottom: z.number().int().default(0),
      left: z.number().int().default(0),
      right: z.number().int().default(0),
    })
    .optional(),
  gutters: z
    .object({
      horizontal: z.number().int().default(0),
      vertical: z.number().int().default(0),
    })
    .optional(),
  centerLines: z.boolean().default(false),
});

export const SetupBeautyRetouchSuiteSchema = z.object({
  dodgeBurnStrength: z.number().int().min(1).max(100).default(50),
  frequencySeparationRadius: z.number().min(0.1).max(100).default(6),
});

export const BatchRenameLayersRegexSchema = z.object({
  searchPattern: z.string().min(1),
  replacePattern: z.string(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  uppercaseMode: z.enum(["upper", "lower", "none"]).default("none"),
});

export const ImportCanvaDesignSchema = z.object({
  canvaDesignJson: z.string().min(1),
});

export const AiSegmentAndInpaintPsdSchema = z.object({
  imagePath: z.string().min(1),
  outputPsdPath: z.string().min(1),
  detectObjectsCount: z.number().int().min(1).max(50).default(5),
});

export const GenerativeExtendCanvasSchema = z.object({
  direction: z.enum(["left", "right", "top", "bottom"]),
  extendPx: z.number().int().min(1).max(10000),
});

export const GenerateCharacterLimbAnimationSchema = z.object({
  characterGroup: z.string().min(1),
  cycleType: z.enum(["breathe", "walk"]),
  frameCount: z.number().int().min(2).max(128).default(16),
});



