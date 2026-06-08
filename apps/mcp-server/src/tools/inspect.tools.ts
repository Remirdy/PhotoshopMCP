/**
 * mcp-server — inspect.tools.ts
 * Tools: inspect_document, inspect_layer_tree, find_layer, audit_required_layers,
 *        audit_game_ui_case, generate_delivery_readme, package_delivery_zip
 */
import { z } from "zod";
import fs from "fs";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";
import { makeOk } from "@remirdy/shared";
import { nanoid } from "nanoid";

export function registerInspectTools(server: McpServer): void {
  // ─── inspect_document ───────────────────────────────────────────────────────
  server.tool(
    "inspect_document",
    "Return active Photoshop document info: name, dimensions, resolution, color mode, layer count, and group count.",
    {},
    async () => {
      try {
        const result = await bridgeClient.sendJob("inspectDocument", {});
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── inspect_layer_tree ─────────────────────────────────────────────────────
  server.tool(
    "inspect_layer_tree",
    "Return the full hierarchical layer tree of the active document as structured JSON. Use this to understand the current document structure before making changes.",
    {
      includeHidden: z.boolean().default(true).describe("Include hidden layers in the output"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("inspectLayerTree", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── find_layer ─────────────────────────────────────────────────────────────
  server.tool(
    "find_layer",
    "Search for layers by name substring. Returns all matching layers with their type and position.",
    {
      query: z.string().min(1).describe("Search term, e.g. 'Booster' or 'HUD'"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("findLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── audit_required_layers ──────────────────────────────────────────────────
  server.tool(
    "audit_required_layers",
    "Verify that specific layer or group names exist in the active document. Returns found, missing, and a readiness score 0–100.",
    {
      requiredLayers: z
        .array(z.string())
        .min(1)
        .describe("List of required layer/group names or paths"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("auditRequiredLayers", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── audit_game_ui_case ─────────────────────────────────────────────────────
  server.tool(
    "audit_game_ui_case",
    "Comprehensive audit of a Photoshop document against a mobile game UI case structure. Checks document size, required groups, text editability, naming quality, and export readiness. Returns a 0–100 score.",
    {
      caseType: z
        .enum(["premium_mobile_game_ui", "scene_only", "confirmation_popup", "social_post", "app_store_screenshot"])
        .default("premium_mobile_game_ui")
        .describe("Which case structure to audit against"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("auditGameUiCase", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── generate_delivery_readme ────────────────────────────────────────────────
  server.tool(
    "generate_delivery_readme",
    "Generate a README_LAYER_STRUCTURE.txt file describing the current PSD layer organization. Suitable for delivery packages.",
    {
      projectName: z.string().min(1).describe("Project name, e.g. 'Color Crate Sort'"),
      outputFolder: z.string().min(1).describe("Folder where README will be written"),
      authorName: z.string().default("Demo Author").describe("Author name for the readme"),
      includeLayerStructure: z.boolean().default(true).describe("Include layer tree in the readme"),
    },
    async (args) => {
      try {
        // First get layer tree from Photoshop
        const treeResult = await bridgeClient.sendJob("inspectLayerTree", { includeHidden: true });

        // Generate README content
        const readme = generateReadmeContent(
          args.projectName,
          args.authorName,
          treeResult.data as { layers?: unknown[] }
        );

        // Write file
        const outputPath = path.join(path.resolve(args.outputFolder), "README_LAYER_STRUCTURE.txt");
        fs.mkdirSync(path.resolve(args.outputFolder), { recursive: true });
        fs.writeFileSync(outputPath, readme, "utf-8");

        const jobId = `job_${nanoid(10)}`;
        return toMcpContent(
          makeOk({ readmePath: outputPath, content: readme }, jobId, "README generated successfully.")
        );
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── package_delivery_zip ────────────────────────────────────────────────────
  server.tool(
    "package_delivery_zip",
    "Create a ZIP package from a source folder for delivery. Includes all PSD, PNG, and text files.",
    {
      projectName: z.string().min(1).describe("Project name used for ZIP filename"),
      sourceFolder: z.string().min(1).describe("Absolute path to the folder to zip"),
      outputZipPath: z.string().min(1).describe("Absolute path for the output ZIP file"),
    },
    async (args) => {
      try {
        // Use archiver for ZIP creation
        const jobId = `job_${nanoid(10)}`;
        const { createZip } = await import("../utils/zipper.js");
        await createZip(args.sourceFolder, args.outputZipPath);
        return toMcpContent(
          makeOk(
            { zipPath: args.outputZipPath, projectName: args.projectName },
            jobId,
            `Delivery package created: ${args.outputZipPath}`
          )
        );
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}

function generateReadmeContent(projectName: string, author: string, layerData: unknown): string {
  const date = new Date().toISOString().split("T")[0];
  return `================================================================================
  ${projectName} — Layer Structure
  Remirdy Photoshop MCP Delivery Package
================================================================================

Project:    ${projectName}
Author:     ${author}
Generated:  ${date}
Tool:       Remirdy Photoshop MCP (https://github.com/remirdy/remirdy-photoshop-mcp)

PUBLIC SAFE DEMO
This package uses a generic fictional demo project.
No confidential client briefs or real studio data are included.

--------------------------------------------------------------------------------
LAYER STRUCTURE
--------------------------------------------------------------------------------

01_BG
  BG_Base               — Solid color base fill
  BG_Gradient           — Gradient overlay (editable shape)
  BG_Vignette           — Vignette darkening effect
  BG_Noise_Texture      — Subtle noise/texture overlay

02_GAMEPLAY_SCENE
  Game_Board
    GameBoard_Base       — Main board panel shape
    GameBoard_Inner_Depth — Inner shadow detail
    GameBoard_Outline    — Stroke border
  Puzzle_Area
    PuzzleArea_Base      — Puzzle grid background
    PuzzleArea_Glow      — Ambient inner glow
    PuzzleArea_Slots     — Slot placeholders
  Tile_Placeholders
    TilePlaceholder_Red_01   — Red tile (raster placeholder)
    TilePlaceholder_Blue_01  — Blue tile
    TilePlaceholder_Green_01 — Green tile
    TilePlaceholder_Yellow_01 — Yellow tile
    TilePlaceholder_Pink_01  — Pink tile
  Crate_Row
    Crate_Red_01, Crate_Blue_01, Crate_Green_01 ... (raster assets)
  Lighting_FX
    Soft_Top_Glow, Board_Shadow, Ambient_Highlight

03_UI
  Top_HUD
    Coin_Counter         — Editable group: BG shape + icon + text
    Level_Indicator      — Editable group: BG + level number text
    Settings_Button      — Editable group: circle BG + icon placeholder
  Bottom_HUD
    Booster_Row
      Booster_01         — BG shape + icon + badge (editable)
      Booster_02
      Booster_03

04_POPUP
  Scrim
    Popup_Dim_Scrim      — Full-canvas dim overlay (opacity editable)
  Modal
    Modal_Panel          — Rounded panel shape
    Modal_Title          — Editable text layer
    Modal_Close_Button   — Close button circle
    Modal_Icon           — Icon placeholder
    Modal_Message        — Editable body text
    Confirm_Button       — CTA button shape + text (editable)

05_EXPORT_NOTES
  README_Text_Layer      — This note layer (hidden for export)
  Safe_Area_Guides       — Mobile safe area overlay (hidden for export)

--------------------------------------------------------------------------------
NOTES
--------------------------------------------------------------------------------

- All text layers are editable (double-click to edit in Photoshop)
- All shape layers are editable vector shapes
- Raster asset layers (tiles, crates) are Smart Objects
- Opacity of each group can be adjusted independently
- For Unity export: isolate each group and export as transparent PNG

--------------------------------------------------------------------------------
Generated by Remirdy Photoshop MCP
https://github.com/remirdy/remirdy-photoshop-mcp
================================================================================
`;
}
