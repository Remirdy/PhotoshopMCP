/**
 * @remirdy/shared — jobTypes.ts
 * Canonical type definitions for MCP → Bridge → UXP job protocol.
 */

// ─── Connection / Status ──────────────────────────────────────────────────────

export type PhotoshopStatus = "connected" | "disconnected" | "pending" | "error";

export interface BridgeStatusPayload {
  bridgeConnected: boolean;
  port: number;
  queueSize: number;
}

export interface PhotoshopStatusPayload {
  connected: boolean;
  pluginVersion: string;
  activeDocument: string | null;
  photoshopVersion: string | null;
}

// ─── Job Lifecycle ────────────────────────────────────────────────────────────

export type JobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface Job<TPayload = unknown> {
  id: string;
  type: JobType;
  payload: TPayload;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  result?: JobResult;
  error?: string;
}

export interface JobResult<TData = unknown> {
  ok: boolean;
  message: string;
  data: TData;
  warnings: string[];
  jobId: string;
  photoshopStatus: PhotoshopStatus;
}

export function makeResult<T>(
  ok: boolean,
  message: string,
  data: T,
  jobId: string,
  photoshopStatus: PhotoshopStatus = "connected",
  warnings: string[] = []
): JobResult<T> {
  return { ok, message, data, warnings, jobId, photoshopStatus };
}

export function makeOk<T>(
  data: T,
  jobId: string,
  message = "Operation completed successfully.",
  warnings: string[] = []
): JobResult<T> {
  return makeResult(true, message, data, jobId, "connected", warnings);
}

export function makeError(message: string, jobId: string): JobResult<null> {
  return makeResult(false, message, null, jobId, "error");
}

// ─── Job Type Enum ────────────────────────────────────────────────────────────

export type JobType =
  // Connection
  | "ping"
  | "status"

  // Document
  | "createDocument"
  | "openDocument"
  | "closeDocument"
  | "saveDocument"
  | "setCanvasBackground"

  // Layer / Group
  | "createGroup"
  | "createLayerTree"
  | "renameLayer"
  | "moveLayer"
  | "transformLayer"
  | "duplicateLayer"
  | "deleteLayer"
  | "lockLayer"
  | "setLayerVisibility"
  | "reorderLayer"

  // Shape
  | "createRectangleShape"
  | "createCircleShape"
  | "createLineShape"
  | "createSafeAreaGuides"

  // Text
  | "createTextLayer"
  | "updateTextLayer"
  | "createLabelBadge"

  // Asset
  | "placeAsset"
  | "placeAssetGrid"
  | "replaceAssetLayer"
  | "exportLayerAsPng"
  | "exportGroupAsPng"
  | "exportAllTopLevelGroups"

  // UI Components
  | "createHudCoinCounter"
  | "createHudLevelIndicator"
  | "createSettingsButton"
  | "createBoosterButton"
  | "createBoosterRow"
  | "createPopupModal"
  | "createDimScrim"

  // Game Layout
  | "createMobileGameLayerStructure"
  | "createMobileGameCasePack"
  | "createSocialPostTemplate"
  | "createAppStoreScreenshotTemplate"

  // Inspect / QA
  | "inspectDocument"
  | "inspectLayerTree"
  | "findLayer"
  | "auditRequiredLayers"
  | "auditGameUiCase"
  | "generateDeliveryReadme"
  | "packageDeliveryZip"

  // Workflow
  | "runDesignJson"
  | "runWorkflowPreset"
  | "createCaseStudyPack"
  | "convertFolderToLayeredPsd"
  | "generateLayerManifest"
  | "rebuildFromLayerManifest"
  | "smartLayerNaming"
  | "preflightDeliveryCheck"
  | "autoExportDelivery"

  // Selection / Mask
  | "selectLayerBounds"
  | "createMaskFromLayer"
  | "applyClippingMask"
  | "applyLayerEffectPreset"
  | "applyStyleToGroup"

  // Developer
  | "runBatchplayDescriptor"
  | "getRecentJobs"
  | "getJobResult"
  | "cancelJob"

  // ─── IMAGE TOOLS ─────────────────────────────────────────────────────────────
  | "imageToPsdLayered"          // Convert single image → multiple editable layers
  | "removeBackground"           // AI-style subject/bg separation → mask layers
  | "swapBackground"             // Replace background, keep subject masked
  | "compositeLayers"            // Blend multiple images with mode suggestions
  | "frequencySeparation"        // Portrait → texture + color on separate layers
  | "dodgeBurnSetup"             // Create dodge & burn soft-light layers
  | "colorGradePreset"           // Apply adjustment layers (curves, hue/sat, color balance)
  | "smartFilterStack"           // Non-destructive blur/sharpen/denoise filter stack
  | "objectRemovalMask"          // Create selection mask for content-aware fill area
  | "skyReplacementPrep"         // Sky selection → mask + gradient overlay prep
  | "portraitRetouchSetup"       // Full portrait retouch layer stack setup
  | "imageResize"                // Resize with resampling options
  | "cropCanvas"                 // Crop/extend canvas
  | "rotateCanvas"               // Rotate/flip canvas
  | "convertColorMode"           // RGB ↔ CMYK ↔ Grayscale

  // ─── CHARACTER TOOLS ─────────────────────────────────────────────────────────
  | "createCharacterConceptSheet"  // Front/side/back views on separate artboards
  | "createSpriteSheetSetup"       // Animation frames as numbered layers
  | "createColorVariants"          // Base character → N color variants via hue shift
  | "createRigReadyCharacter"      // Body parts on separate named layers + pivot notes
  | "createCharacterReferenceSheet"// Turnaround + expressions + action poses
  | "sliceSpriteSheet"             // Single sprite sheet PNG → individual frame layers
  | "createAnimationFrameLayer"    // Add single animation frame layer with metadata
  | "createCharacterColorPalette"  // Extract palette from character + create swatch layer
  | "createCharacterShadowSetup"   // Separate shadow/highlight layers for character
  | "buildCharacterUIKit"          // Character portrait, mini portrait, icon sizes

  // ─── GAME DEV TOOLS ──────────────────────────────────────────────────────────
  | "packSpriteSheetAtlas"         // Layers → sprite atlas PNG + JSON manifest
  | "sliceGridToLayers"            // Grid image → individual layers per cell
  | "createTilesetTemplate"        // Tileset grid with 9-slice or 47-tile structure
  | "createVfxFlipbook"            // VFX frame sequence → sprite sheet
  | "createParallaxScene"          // Prompt → 5-7 depth layers for parallax BG
  | "createUiSkinFromTokens"       // Design token → apply to all matching layers
  | "createNineSliceTemplate"      // 9-slice UI panel template with guides
  | "createLoadingScreenTemplate"  // Loading screen with progress bar + layers
  | "createSplashScreenTemplate"   // Splash screen template for mobile/game
  | "createIconSet"                // Icon set: multiple sizes in groups
  | "createLevelSelectUI"          // Level select screen template
  | "createInventoryUI"            // Inventory/shop panel template
  | "createBattleHudTemplate"      // Battle/combat HUD template
  | "createMapTemplate"            // World map or mini-map UI template

  // ─── PLATFORM EXPORT TOOLS ───────────────────────────────────────────────────
  | "exportReactNativeAssets"      // @1x @2x @3x PNGs + assets.ts manifest
  | "exportFlutterAssets"          // Flutter density exports + pubspec.yaml snippet
  | "exportAppIconPack"            // Master → all iOS/Android icon sizes
  | "exportSplashScreenPack"       // All device sizes splash screens
  | "exportUnityPackage"           // Sprite Atlas + .meta + import settings JSON
  | "exportGodotSpritesheet"       // .tres resource + spritesheet for Godot
  | "exportUnrealTexturePack"      // Texture import settings JSON for UE5
  | "exportCocos2dPlist"           // .plist spritesheet format for Cocos2d
  | "exportOpenGraphPack"          // OG image + Twitter card + LinkedIn banner
  | "exportAdBannerPack"           // 300×250, 728×90, 160×600, 320×50 banners
  | "exportEmailHeaderPack"        // Mailchimp/HubSpot email header sizes
  | "exportPwaIconPack"            // PWA/web app all icon sizes + manifest.json
  | "exportFaviconPack"            // favicon.ico + all browser sizes
  | "exportWatchFacePack"          // Apple Watch / Wear OS face sizes
  | "exportSteamAssetPack"         // Steam store graphics (capsule, header, etc.)
  | "exportAppStorePack"           // Full App Store / Google Play asset pack

  // ─── AI ANALYSIS TOOLS ───────────────────────────────────────────────────────
  | "analyzeLayerUsage"            // Detect unused / placeholder layers
  | "analyzeColorPalette"          // Extract all colors → palette report + swatch layer
  | "checkAccessibilityContrast"   // Text contrast ratio → WCAG compliance report
  | "auditFonts"                   // All text layers → font inventory report
  | "batchReplaceText"             // Replace all instances of text across document
  | "batchApplyStyle"              // Apply style preset to all matching layers
  | "detectDuplicateLayers"        // Find layers with identical names or content
  | "analyzePsdComplexity"         // Layer count, memory, render complexity score
  | "suggestLayerGrouping"         // AI-suggest which layers should be grouped
  | "detectMissingAssets"          // Find placeholder layers with no real content
  | "generatePsdDiff"              // Compare two manifests → what changed
  | "autoAlignLayers"              // Auto-align selected layers (center, distribute)
  | "autoSpaceLayers"              // Evenly space selected layers
  | "smartCropToSubject"           // Crop canvas to subject bounds
  | "extractDominantColors"        // Get N dominant colors from raster layer
  | "checkBrandCompliance"         // Validate colors/fonts against brand tokens

  // ─── HANDOFF TOOLS ───────────────────────────────────────────────────────────
  | "generateHandoffSpec"          // Full developer spec sheet (CSS/Swift/Kotlin values)
  | "generateCssProperties"        // Layer → CSS class output
  | "generateSwiftUICode"          // Layer → SwiftUI view code stub
  | "generateKotlinCode"           // Layer → Kotlin/Jetpack Compose code stub
  | "generateFlutterCode"          // Layer → Flutter widget code stub
  | "generateRedlineAnnotations"   // Add measurement annotation layers
  | "exportFigmaTokens"            // Colors, fonts, radii → Figma token JSON
  | "exportStyleDictionary"        // Design tokens → Style Dictionary format
  | "generateStorybook"            // Component notes layer per group
  | "generateAssetManifestJson"    // All layers → typed asset manifest for devs
  | "generateReadmeDocumentation"  // Auto-doc layer structure → markdown

  // ─── QA TOOLS ────────────────────────────────────────────────────────────────
  | "checkBrandColors"             // Find layers violating brand color palette
  | "checkResolutions"             // Raster layers resolution check (< 72dpi warning)
  | "findMissingPlaceholders"      // Placeholder layers not yet replaced
  | "checkTextEditability"         // All text layers still editable (not rasterized)?
  | "checkSmartObjects"            // Smart objects linked vs embedded status
  | "validateExportReadiness"      // Document ready for export? Full checklist
  | "generateQaReport"             // Full QA report → text layer + JSON
  | "checkLayerNamingConventions"  // Naming convention violations report
  | "detectOverlappingLayers"      // Layers with identical bounds detection
  | "checkDocumentColorProfile"    // sRGB / P3 / CMYK profile check
  | "validateBlendModes"           // Unusual blend modes that may cause export issues
  | "snapshotDocumentState"        // Save current manifest as version snapshot

  // ─── INTEGRATION TOOLS ───────────────────────────────────────────────────────
  | "importFigmaFrame"             // Figma frame JSON → PS layer structure
  | "exportToFigmaTokens"          // PS design → Figma token format
  | "downloadGoogleFont"           // Download + activate font in PS
  | "importNotionBrief"            // Notion doc → design brief → design JSON
  | "generateGithubActionsManifest"// Export config → GitHub Actions workflow YAML
  | "sendSlackNotification"        // Export done → Slack webhook notification
  | "generateZeplinSpec"           // Layer data → Zeplin-compatible spec JSON
  | "importAdobeFonts"             // Activate Adobe Fonts in PS
  | "syncWithCloudStorage"         // Export → Dropbox/Drive upload manifest
  | "generateJiraTickets"          // Layer audit issues → Jira-format task list
  
  // ─── PREMIUM & CANVA / AI TOOLS ──────────────────────────────────────────────
  | "createAdvancedGridLayout"
  | "setupBeautyRetouchSuite"
  | "batchRenameLayersRegex"
  | "importCanvaDesign"
  | "aiSegmentAndInpaintPsd"
  | "generativeExtendCanvas"
  | "generateCharacterLimbAnimation";

// ─── Common Payload Shapes ────────────────────────────────────────────────────

export interface ColorStop {
  color: string;
  position: number; // 0–100
}

export interface StrokeOptions {
  color: string;
  width: number;
}

export interface ShadowOptions {
  enabled: boolean;
  opacity: number;
  blur: number;
  distance: number;
  angle: number;
  color: string;
}

export interface GradientOptions {
  type: "linear" | "radial";
  from: string;
  to: string;
  angle?: number;
}

export type DocumentPreset =
  | "iphone_15_pro_max_game"
  | "instagram_post_4x5"
  | "instagram_story"
  | "app_store_screenshot"
  | "unity_ui_atlas"
  | "custom";

export type UIStyle =
  | "premium_purple"
  | "soft_game"
  | "glass_dark"
  | "arcade_bold"
  | "luxury_dark"
  | "ios_glass"
  | "dark_luxury"
  | "clean_saas";

export type LayerPosition = "front" | "back" | "above" | "below";

export type WorkflowPreset =
  | "premium_mobile_game_ui_case"
  | "game_ui_hud"
  | "confirmation_popup"
  | "social_post"
  | "app_store_screenshot"
  | "unity_ui_export"
  | "character_concept_sheet"
  | "sprite_sheet_setup"
  | "ad_banner_pack"
  | "app_icon_pack"
  | "developer_handoff";

export type ThemePreset =
  | "premium_puzzle"
  | "arcade_inventory"
  | "fantasy_shop"
  | "cozy_match"
  | "dark_luxury"
  | "clean_saas_game";

export type LayerEffectPreset =
  | "soft_shadow"
  | "inner_depth"
  | "premium_button"
  | "soft_glow"
  | "gold_rim"
  | "dark_glass"
  | "subtle_emboss"
  | "floating_card";

// ─── Design JSON spec ─────────────────────────────────────────────────────────

export interface DesignJsonLayer {
  type: "shape" | "text" | "asset" | "group";
  kind?: "roundedRect" | "circle" | "line" | "rectangle";
  name: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: StrokeOptions;
  shadow?: ShadowOptions;
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  align?: "left" | "center" | "right";
  path?: string;
  scale?: number;
  parentGroup?: string;
}

export interface DesignJsonExport {
  type: "png" | "psd" | "psb" | "jpg";
  path: string;
}

export interface DesignJson {
  document: {
    name: string;
    width: number;
    height: number;
    backgroundColor?: string;
    resolution?: number;
    colorMode?: "RGB" | "CMYK" | "Grayscale";
  };
  groups?: string[];
  layers?: DesignJsonLayer[];
  exports?: DesignJsonExport[];
}

// ─── Layer Tree ───────────────────────────────────────────────────────────────

export interface LayerTreeNode {
  id: number;
  name: string;
  type: "group" | "text" | "shape" | "raster" | "smartObject" | "unknown";
  visible: boolean;
  locked: boolean;
  opacity: number;
  children?: LayerTreeNode[];
  bounds?: { x: number; y: number; width: number; height: number };
}

// ─── Group tree descriptor (for createLayerTree) ──────────────────────────────

export interface GroupDescriptor {
  name: string;
  children?: GroupDescriptor[];
}

// ─── Sprite / Game Dev ───────────────────────────────────────────────────────

export interface SpriteFrame {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frameIndex: number;
}

export interface SpriteAtlasManifest {
  atlasPath: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  totalFrames: number;
  frames: SpriteFrame[];
  generatedAt: string;
}

// ─── Developer Handoff ────────────────────────────────────────────────────────

export interface LayerSpec {
  layerName: string;
  layerType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  fill?: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  borderRadius?: number;
  css?: string;
  swiftUI?: string;
  kotlin?: string;
  flutter?: string;
}

// ─── QA Report ───────────────────────────────────────────────────────────────

export interface QaIssue {
  severity: "error" | "warning" | "info";
  category: string;
  layerName?: string;
  message: string;
  suggestion?: string;
}

export interface QaReport {
  score: number;
  passed: boolean;
  issues: QaIssue[];
  summary: string;
  generatedAt: string;
}

// ─── Color Palette ────────────────────────────────────────────────────────────

export interface ColorSwatch {
  hex: string;
  rgb: { r: number; g: number; b: number };
  frequency: number; // 0–100 percentage of usage
  layerNames: string[];
}

// ─── App Icon Sizes ───────────────────────────────────────────────────────────

export const IOS_ICON_SIZES = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024] as const;
export const ANDROID_ICON_SIZES = [36, 48, 72, 96, 144, 192, 512] as const;
export const WEB_ICON_SIZES = [16, 32, 48, 64, 128, 256, 512] as const;

export const AD_BANNER_SIZES = [
  { name: "leaderboard",    width: 728,  height: 90  },
  { name: "medium_rect",   width: 300,  height: 250 },
  { name: "wide_skyscraper", width: 160, height: 600 },
  { name: "mobile_banner", width: 320,  height: 50  },
  { name: "half_page",     width: 300,  height: 600 },
  { name: "large_rect",    width: 336,  height: 280 },
  { name: "billboard",     width: 970,  height: 250 },
] as const;

export const STEAM_ASSET_SIZES = [
  { name: "capsule_sm",     width: 231,  height: 87  },
  { name: "capsule_main",   width: 616,  height: 353 },
  { name: "header",         width: 460,  height: 215 },
  { name: "library_hero",   width: 3840, height: 1240 },
  { name: "library_logo",   width: 1280, height: 720 },
] as const;

// ─── Priority Feature Payloads ───────────────────────────────────────────────

export interface ImageToPsdLayeredPayload {
  imagePath: string;
  outputPsdPath: string;
  mode?: "subject_bg" | "multi_object";
}

export interface SliceSpriteSheetPayload {
  imagePath: string;
  frameWidth: number;
  frameHeight: number;
  outputFolder: string;
}

export interface PackSpriteSheetAtlasPayload {
  inputFolder: string;
  outputAtlasPath: string;
  outputManifestPath: string;
  columns?: number;
}

export interface ExportAppIconPackPayload {
  masterIconPath?: string;
  outputFolder: string;
  platforms?: Array<"ios" | "android" | "web">;
}

export interface ColorGradePresetPayload {
  layerName?: string;
  preset: "warm" | "cool" | "vintage" | "cyberpunk";
}

export interface GenerateHandoffSpecPayload {
  outputPath: string;
  format?: "markdown" | "json" | "html";
}

// ─── Creative Payloads ──────────────────────────────────────────────────────────

export interface CreateCharacterConceptSheetPayload {
  projectName: string;
  views?: string[];
  artboardSize?: number;
}

export interface CreateTilesetTemplatePayload {
  columns: number;
  rows: number;
  tileSize: number;
  padding?: number;
}

export interface CreateVfxFlipbookPayload {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
}

export interface CreateParallaxScenePayload {
  theme: string;
  layersCount?: number;
}

export interface CreateLoadingScreenPayload {
  title: string;
  progress?: number;
  style?: UIStyle;
}

export interface CreateSplashScreenPayload {
  title: string;
  subtitle?: string;
  style?: UIStyle;
}

export interface CreateIconSetPayload {
  name: string;
  sizes?: number[];
}

// ─── Game Dev Payloads ──────────────────────────────────────────────────────────

export interface CreateColorVariantsPayload {
  layerName: string;
  variantsCount?: number;
  hueStep?: number;
}

export interface CreateRigReadyCharacterPayload {
  characterName: string;
  parts?: string[];
}

export interface CreateUiSkinFromTokensPayload {
  tokens: Record<string, string>;
}

export interface CreateNineSliceTemplatePayload {
  width: number;
  height: number;
  borderSize: number;
}

// ─── Visual Editing Payloads ───────────────────────────────────────────────────

export interface RemoveBackgroundPayload {
  layerName?: string;
  mode?: "ai" | "color_range";
}

export interface SwapBackgroundPayload {
  subjectLayerName: string;
  backgroundAssetPath: string;
}

export interface FrequencySeparationPayload {
  layerName?: string;
  radius?: number;
}

export interface DodgeBurnSetupPayload {
  layerName?: string;
  strength?: number;
}

export interface SmartFilterStackPayload {
  layerName?: string;
  filters: Array<"blur" | "sharpen" | "denoise">;
}

// ─── Platform Export Payloads ──────────────────────────────────────────────────

export interface ExportReactNativeAssetsPayload {
  outputPath: string;
  scaleFactors?: number[];
}

export interface ExportFlutterAssetsPayload {
  outputPath: string;
  scaleFactors?: number[];
}

export interface ExportUnityPackagePayload {
  outputPath: string;
  atlasPath: string;
  metaSettings?: Record<string, unknown>;
}

export interface ExportGodotSpritesheetPayload {
  outputPath: string;
  spritesheetPath: string;
}

export interface ExportOpenGraphPackPayload {
  outputPath: string;
  title: string;
  siteName?: string;
}

export interface ExportAdBannerPackPayload {
  outputPath: string;
  campaignName: string;
}

// ─── QA & Inspect Payloads ──────────────────────────────────────────────────────

export interface AnalyzeLayerUsagePayload {
  includeHidden?: boolean;
}

export interface AnalyzeColorPalettePayload {
  maxColors?: number;
}

export interface CheckAccessibilityContrastPayload {
  textLayerName: string;
  backgroundLayerName: string;
}

export interface AuditFontsPayload {
  expectedFonts?: string[];
}

export interface BatchReplaceTextPayload {
  find: string;
  replace: string;
}

export interface GeneratePsdDiffPayload {
  manifestAPath: string;
  manifestBPath: string;
}

export interface CheckBrandCompliancePayload {
  brandTokens: {
    colors: string[];
    fonts: string[];
  };
}

export interface CheckResolutionsPayload {
  minDpi?: number;
}

// ─── Integration Payloads ──────────────────────────────────────────────────────

export interface ImportFigmaFramePayload {
  figmaFrameJson: string;
}

export interface DownloadGoogleFontPayload {
  fontFamily: string;
  fontUrl?: string;
}

export interface SendSlackNotificationPayload {
  webhookUrl: string;
  message: string;
  channel?: string;
}

// ─── Extra AI Analysis Payloads ───────────────────────────────────────────────

export interface BatchApplyStylePayload {
  stylePreset: string;
  layerQuery: string;
}

export interface DetectDuplicateLayersPayload {
  includeHidden?: boolean;
}

export interface AnalyzePsdComplexityPayload {
  detailed?: boolean;
}

export interface SuggestLayerGroupingPayload {
  mode?: "flat" | "hierarchical";
}

export interface DetectMissingAssetsPayload {
  placeholderPattern?: string;
}

export interface AutoAlignLayersPayload {
  alignType: "center" | "left" | "right" | "top" | "bottom";
}

export interface AutoSpaceLayersPayload {
  spacingType: "horizontal" | "vertical";
  spacingPx?: number;
}

export interface SmartCropToSubjectPayload {
  padding?: number;
}

export interface ExtractDominantColorsPayload {
  layerName: string;
  maxColors?: number;
}

// ─── Extra QA Verification Payloads ──────────────────────────────────────────

export interface CheckBrandColorsPayload {
  brandColors: string[];
}

export interface FindMissingPlaceholdersPayload {
  placeholderPattern?: string;
}

export interface CheckTextEditabilityPayload {
  includeHidden?: boolean;
}

export interface CheckSmartObjectsPayload {
  embedOnly?: boolean;
}

export interface ValidateExportReadinessPayload {
  checklistName?: string;
}

export interface GenerateQaReportPayload {
  outputPath: string;
}

export interface CheckLayerNamingConventionsPayload {
  namingStyle: "snake" | "camel" | "pascal" | "kebab";
}

export interface DetectOverlappingLayersPayload {
  thresholdPx?: number;
}

export interface CheckDocumentColorProfilePayload {
  expectedProfile?: string;
}

export interface ValidateBlendModesPayload {
  warnOnModes?: string[];
}

export interface SnapshotDocumentStatePayload {
  snapshotName: string;
}

// ─── Premium Plugin & Canva / AI Payloads ─────────────────────────────────────

export interface CreateAdvancedGridLayoutPayload {
  columns: number;
  rows: number;
  margins?: { top: number; bottom: number; left: number; right: number };
  gutters?: { horizontal: number; vertical: number };
  centerLines?: boolean;
}

export interface SetupBeautyRetouchSuitePayload {
  dodgeBurnStrength?: number;
  frequencySeparationRadius?: number;
}

export interface BatchRenameLayersRegexPayload {
  searchPattern: string;
  replacePattern: string;
  prefix?: string;
  suffix?: string;
  uppercaseMode?: "upper" | "lower" | "none";
}

export interface ImportCanvaDesignPayload {
  canvaDesignJson: string;
}

export interface AiSegmentAndInpaintPsdPayload {
  imagePath: string;
  outputPsdPath: string;
  detectObjectsCount?: number;
}

export interface GenerativeExtendCanvasPayload {
  direction: "left" | "right" | "top" | "bottom";
  extendPx: number;
}

export interface GenerateCharacterLimbAnimationPayload {
  characterGroup: string;
  cycleType: "breathe" | "walk";
  frameCount?: number;
}



