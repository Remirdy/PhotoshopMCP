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
export const GroupDescriptorSchema = z.lazy(() => z.object({
    name: z.string().min(1).max(200),
    children: z.array(GroupDescriptorSchema).optional(),
}));
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
