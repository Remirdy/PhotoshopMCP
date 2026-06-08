/**
 * mcp-server — prompts.ts
 * MCP prompts for common Remirdy workflows.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer): void {
  // ─── /create-game-ui-psd ─────────────────────────────────────────────────────
  server.prompt(
    "create-game-ui-psd",
    "Generate a step-by-step prompt for creating a mobile game UI PSD from scratch.",
    {
      projectName: z.string().default("My Game UI").describe("Fictional project name"),
      width: z.string().default("1290").describe("Canvas width in pixels"),
      height: z.string().default("2796").describe("Canvas height in pixels"),
      theme: z.string().default("premium_purple").describe("Visual theme: premium_purple, soft_game, ios_glass, dark_luxury, clean_saas, arcade_bold"),
      includePopup: z.string().default("true").describe("Include popup modal (true/false)"),
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Create a premium mobile game UI PSD for "${args.projectName}" with these steps:

1. Call \`create_document\` with name="${args.projectName}", width=${args.width}, height=${args.height}, backgroundColor="#140B2E"
2. Call \`create_layer_tree\` to create this group structure:
   - 01_BG
   - 02_GAMEPLAY_SCENE / Game_Board, Puzzle_Area, Tile_Placeholders, Crate_Row, Lighting_FX
   - 03_UI / Top_HUD / Coin_Counter, Level_Indicator, Settings_Button
   - 03_UI / Bottom_HUD / Booster_Row
   ${args.includePopup === "true" ? "- 04_POPUP / Scrim, Modal" : ""}
   - 05_EXPORT_NOTES
3. Call \`set_canvas_background\` with color="#140B2E", layerName="BG_Base"
4. Call \`create_hud_coin_counter\` at x=80, y=80 in "03_UI/Top_HUD", style="${args.theme}"
5. Call \`create_hud_level_indicator\` at x=490, y=80 in "03_UI/Top_HUD", style="${args.theme}"
6. Call \`create_settings_button\` at x=1110, y=80 in "03_UI/Top_HUD", style="${args.theme}"
7. Call \`create_rectangle_shape\` for the game board at x=80, y=460, width=1130, height=1100, radius=32, fill="#1E0D40", stroke={color:"#6B45A0",width:4}
8. Call \`create_booster_row\` with 3 buttons in "03_UI/Bottom_HUD", style="${args.theme}"
${args.includePopup === "true" ? `9. Call \`create_dim_scrim\` in "04_POPUP/Scrim"
10. Call \`create_popup_modal\` in "04_POPUP/Modal"` : ""}
11. Call \`inspect_layer_tree\` to verify the structure
12. Call \`audit_game_ui_case\` to get a quality score
13. Call \`save_document\` as PSD

Theme: ${args.theme}
Canvas: ${args.width}×${args.height}px`,
          },
        },
      ],
    })
  );

  // ─── /premium-mobile-game-ui-case ────────────────────────────────────────────
  server.prompt(
    "premium-mobile-game-ui-case",
    "Full workflow for creating a 3-document public-safe mobile game UI case pack.",
    {
      projectName: z.string().default("Color Crate Sort").describe("Fictional public-safe game name"),
      authorName: z.string().default("Demo Author"),
      outputFolder: z.string().default("/tmp/exports/ColorCrateSort").describe("Output folder path"),
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Create a complete premium mobile game UI case pack for "${args.projectName}":

PART 1 — Scene Only (no UI elements)
1. create_document: name="ColorCrateSort_SceneOnly_Demo", preset="iphone_15_pro_max_game", backgroundColor="#140B2E"
2. create_layer_tree: 01_BG, 02_GAMEPLAY_SCENE/Game_Board, Puzzle_Area, Tile_Placeholders, Crate_Row, Lighting_FX
3. set_canvas_background: color="#140B2E"
4. Create game board shape, puzzle area, placeholder tiles, lighting FX
5. save_document as "${args.outputFolder}/ColorCrateSort_SceneOnly_Demo.psd"
6. save_document as "${args.outputFolder}/ColorCrateSort_SceneOnly_Demo.png"

PART 2 — Gameplay UI
1. create_document: name="ColorCrateSort_GameplayUI_Demo", preset="iphone_15_pro_max_game"
2. create_layer_tree: full structure including 03_UI groups
3. create_hud_coin_counter, create_hud_level_indicator, create_settings_button
4. create_booster_row with 3 boosters
5. save_document (PSD + PNG)

PART 3 — Confirmation Popup
1. create_document: name="ColorCrateSort_ConfirmationPopup_Demo"
2. create_layer_tree: include 04_POPUP/Scrim and 04_POPUP/Modal
3. create_dim_scrim (opacity=70)
4. create_popup_modal: title="Exit Game?", message="Are you sure?", confirmText="Leave Game"
5. save_document (PSD + PNG)

PART 4 — Export Package
1. export_all_top_level_groups for each document into "${args.outputFolder}/layers/"
2. generate_delivery_readme: projectName="${args.projectName}", authorName="${args.authorName}"
3. generate_layer_manifest: save to "${args.outputFolder}/layer-manifest.json"
4. package_delivery_zip: outputZipPath="${args.outputFolder}/${args.projectName.replace(/\s+/g, "_")}_Delivery_Package.zip"

Author: ${args.authorName}
Output: ${args.outputFolder}`,
          },
        },
      ],
    })
  );

  // ─── /social-post-pack ───────────────────────────────────────────────────────
  server.prompt(
    "social-post-pack",
    "Create a layered social media post template.",
    {
      brandName: z.string().default("Remirdy").describe("Brand/title name"),
      format: z.string().default("instagram_4x5").describe("Format: instagram_4x5, story_9x16, square_1x1"),
      title: z.string().default("Turn Prompts Into PSDs"),
      subtitle: z.string().default("Editable layers, clean groups, export-ready."),
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Create a layered social media post template:
1. create_social_post_template: preset="${args.format}", title="${args.title}", subtitle="${args.subtitle}", style="premium_dark"
2. inspect_layer_tree to verify structure
3. save_document as PSD and PNG

Title: ${args.title}
Subtitle: ${args.subtitle}
Format: ${args.format}`,
          },
        },
      ],
    })
  );

  // ─── /unity-ui-export ────────────────────────────────────────────────────────
  server.prompt(
    "unity-ui-export",
    "Export Photoshop groups as transparent PNGs for Unity UI.",
    {
      inputPsd: z.string().describe("Path to the source PSD"),
      outputFolder: z.string().describe("Folder for Unity PNG exports"),
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Export a PSD for Unity UI:
1. open_document: path="${args.inputPsd}"
2. inspect_layer_tree to understand structure
3. export_all_top_level_groups: outputFolder="${args.outputFolder}", prefix="UI_"
4. generate_layer_manifest: outputPath="${args.outputFolder}/layer-manifest.json"
5. package_delivery_zip: sourceFolder="${args.outputFolder}"

Each top-level group becomes one transparent PNG ready for Unity.`,
          },
        },
      ],
    })
  );

  // ─── /audit-current-psd ──────────────────────────────────────────────────────
  server.prompt(
    "audit-current-psd",
    "Audit the currently active Photoshop document for delivery readiness.",
    {
      caseType: z
        .string()
        .default("premium_mobile_game_ui")
        .describe("Case type: premium_mobile_game_ui, scene_only, confirmation_popup, social_post"),
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Audit the current PSD for delivery readiness:
1. inspect_document — check dimensions and color mode
2. inspect_layer_tree — review full layer structure
3. audit_game_ui_case: caseType="${args.caseType}" — score against standard
4. audit_required_layers: check for all required groups
5. preflight_delivery_check — run all QA checks
6. Report the audit score and list any issues found.

Case type: ${args.caseType}`,
          },
        },
      ],
    })
  );
}
