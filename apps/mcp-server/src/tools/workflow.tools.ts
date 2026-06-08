/**
 * mcp-server — workflow.tools.ts
 * High-level workflow orchestration tools.
 */
import { z } from "zod";
import fs from "fs";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";
import { makeOk, WORKFLOW_PRESETS, type DesignJson } from "@remirdy/shared";
import { nanoid } from "nanoid";

export function registerWorkflowTools(server: McpServer): void {
  // ─── run_design_json ────────────────────────────────────────────────────────
  server.tool(
    "run_design_json",
    "Execute a complete Photoshop document build from a JSON design specification. The JSON describes the document, layer groups, layers (shapes, text, assets), and exports. This is the primary automation entry point.",
    {
      designJsonPath: z.string().optional().describe("Path to a design.json file"),
      designJson: z
        .object({
          document: z.object({
            name: z.string(),
            width: z.number(),
            height: z.number(),
            backgroundColor: z.string().optional(),
            resolution: z.number().optional(),
          }),
          groups: z.array(z.string()).optional(),
          layers: z.array(z.any()).optional(),
          exports: z.array(z.any()).optional(),
        })
        .optional()
        .describe("Inline design JSON (alternative to designJsonPath)"),
      outputFolder: z.string().optional().describe("Output folder for exports"),
    },
    async (args) => {
      try {
        let designJson: DesignJson | undefined;

        if (args.designJsonPath) {
          const raw = fs.readFileSync(path.resolve(args.designJsonPath), "utf-8");
          designJson = JSON.parse(raw) as DesignJson;
        } else if (args.designJson) {
          designJson = args.designJson as DesignJson;
        } else {
          return toMcpError("Provide either designJsonPath or designJson");
        }

        const result = await bridgeClient.sendJob("runDesignJson", {
          designJson,
          outputFolder: args.outputFolder,
        });
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── run_workflow_preset ────────────────────────────────────────────────────
  server.tool(
    "run_workflow_preset",
    "Execute a predefined workflow preset. Presets include: premium_mobile_game_ui_case (full game UI), game_ui_hud (HUD only), confirmation_popup, social_post, app_store_screenshot, unity_ui_export.",
    {
      preset: z
        .enum([
          "premium_mobile_game_ui_case",
          "game_ui_hud",
          "confirmation_popup",
          "social_post",
          "app_store_screenshot",
          "unity_ui_export",
        ])
        .describe("Workflow preset to run"),
      options: z
        .object({
          projectName: z.string().optional(),
          outputFolder: z.string().optional(),
          theme: z.string().optional(),
        })
        .optional()
        .describe("Optional overrides for the preset"),
    },
    async (args) => {
      try {
        const presetJson = WORKFLOW_PRESETS[args.preset];
        if (!presetJson) {
          return toMcpError(`Unknown preset: ${args.preset}`);
        }
        // Apply option overrides
        const designJson = { ...presetJson };
        if (args.options?.projectName) {
          designJson.document = {
            ...designJson.document,
            name: args.options.projectName,
          };
        }
        const result = await bridgeClient.sendJob("runDesignJson", {
          designJson,
          outputFolder: args.options?.outputFolder,
        });
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_mobile_game_layer_structure ─────────────────────────────────────
  server.tool(
    "create_mobile_game_layer_structure",
    "Create the complete professional layer group structure for a premium mobile game UI PSD. Creates all groups and sub-groups following the standard 01_BG / 02_GAMEPLAY_SCENE / 03_UI / 04_POPUP / 05_EXPORT_NOTES naming convention.",
    {
      projectName: z.string().default("Color Crate Sort").describe("Fictional project name for export notes"),
      includePopup: z.boolean().default(true).describe("Include 04_POPUP group structure"),
      includeExportGroups: z.boolean().default(true).describe("Include 05_EXPORT_NOTES group"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createMobileGameLayerStructure", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_mobile_game_case_pack ───────────────────────────────────────────
  server.tool(
    "create_mobile_game_case_pack",
    "Create a complete public-safe mobile game UI delivery pack. Generates 3 Photoshop documents (Scene Only, Gameplay UI, Confirmation Popup), exports PSD + PNG for each, generates README, layer manifest, and packages a ZIP. All content is fictional and public-safe.",
    {
      projectName: z.string().default("Color Crate Sort").describe("Fictional game name (public-safe)"),
      outputFolder: z.string().describe("Absolute path for all output files"),
      includeSceneOnly: z.boolean().default(true),
      includeGameplayUI: z.boolean().default(true),
      includePopup: z.boolean().default(true),
      assetFolder: z.string().optional().describe("Optional folder with placeholder PNG assets"),
      theme: z
        .enum(["premium_puzzle", "arcade_inventory", "fantasy_shop", "cozy_match", "dark_luxury", "clean_saas_game"])
        .default("premium_puzzle"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createMobileGameCasePack", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_social_post_template ────────────────────────────────────────────
  server.tool(
    "create_social_post_template",
    "Create a layered social media design template with editable text, background, and layout groups.",
    {
      preset: z
        .enum(["instagram_4x5", "story_9x16", "square_1x1"])
        .default("instagram_4x5"),
      title: z.string().default("Turn Prompts Into PSDs"),
      subtitle: z.string().default("Editable layers, clean groups, export-ready packages."),
      style: z
        .enum(["premium_dark", "ios_glass", "game_marketing", "clean_saas", "cyber_gradient"])
        .default("premium_dark"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createSocialPostTemplate", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_app_store_screenshot_template ────────────────────────────────────
  server.tool(
    "create_app_store_screenshot_template",
    "Create a layered App Store screenshot layout with headline, device mockup area, and subtitle.",
    {
      title: z.string().default("Premium Puzzle UI"),
      subtitle: z.string().default("Designed with editable Photoshop layers"),
      phoneMockup: z.boolean().default(true).describe("Include a phone mockup placeholder shape"),
      style: z
        .enum(["game_premium", "clean_saas", "dark_luxury", "colorful_casual"])
        .default("game_premium"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createAppStoreScreenshotTemplate", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── smart_layer_naming ──────────────────────────────────────────────────────
  server.tool(
    "smart_layer_naming",
    "Automatically rename generic layer names (Layer 1, Layer 2, Untitled) to professional names based on context mode. Use dryRun=true to preview changes without applying them.",
    {
      mode: z
        .enum(["game_ui", "social", "app_store", "unity_ui", "generic"])
        .default("game_ui")
        .describe("Naming context: game_ui gives game-specific names, social gives social media names, etc."),
      dryRun: z.boolean().default(false).describe("Preview renames without applying"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("smartLayerNaming", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── preflight_delivery_check ────────────────────────────────────────────────
  server.tool(
    "preflight_delivery_check",
    "Run a comprehensive preflight check before delivering a PSD. Checks: correct document size, required groups exist, no generic layer names, text layers are editable, export folder exists, PSD is saved, PNG preview exists, manifest generated.",
    {
      expectedWidth: z.number().int().optional().describe("Expected document width"),
      expectedHeight: z.number().int().optional().describe("Expected document height"),
      requiredLayers: z.array(z.string()).optional().describe("Required layer/group names"),
      forbiddenNames: z
        .array(z.string())
        .default(["Layer 1", "Layer 2", "Untitled"])
        .describe("Layer names that must NOT exist (generic names)"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("preflightDeliveryCheck", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── auto_export_delivery ────────────────────────────────────────────────────
  server.tool(
    "auto_export_delivery",
    "One-command delivery export: PSD, flattened PNG preview, individual transparent layer PNGs, README, layer manifest JSON, and a delivery ZIP. The fastest way to package a finished document.",
    {
      projectName: z.string().min(1).describe("Project name for file naming"),
      outputFolder: z.string().min(1).describe("Absolute output folder"),
      includeLayerPNGs: z.boolean().default(true).describe("Export individual group PNGs"),
      includeReadme: z.boolean().default(true).describe("Generate README_LAYER_STRUCTURE.txt"),
      includeManifest: z.boolean().default(true).describe("Generate layer-manifest.json"),
      zip: z.boolean().default(true).describe("Create delivery ZIP package"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("autoExportDelivery", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── generate_layer_manifest ─────────────────────────────────────────────────
  server.tool(
    "generate_layer_manifest",
    "Generate a JSON manifest file from the current Photoshop layer tree. Useful for rebuilding documents from manifest later.",
    {
      outputPath: z.string().min(1).describe("Output path for layer-manifest.json"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("generateLayerManifest", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── rebuild_from_layer_manifest ─────────────────────────────────────────────
  server.tool(
    "rebuild_from_layer_manifest",
    "Rebuild a Photoshop document from a layer manifest JSON and a folder of transparent PNG assets.",
    {
      manifestPath: z.string().min(1).describe("Path to layer-manifest.json"),
      assetFolder: z.string().min(1).describe("Folder containing PNG assets referenced in the manifest"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("rebuildFromLayerManifest", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── convert_folder_to_layered_psd ───────────────────────────────────────────
  server.tool(
    "convert_folder_to_layered_psd",
    "Take a folder of transparent PNG files and create a PSD where each file becomes one named layer. Useful for combining AI-generated art into a structured document.",
    {
      inputFolder: z.string().min(1).describe("Folder containing PNG files"),
      outputPsdPath: z.string().min(1).describe("Output PSD file path"),
      width: z.number().int().min(1).default(1290),
      height: z.number().int().min(1).default(2796),
      layout: z
        .enum(["centered", "grid", "use_manifest"])
        .default("centered")
        .describe("How to position layers: centered (all at canvas center), grid (arranged in grid), use_manifest (read positions from manifest.json in same folder)"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("convertFolderToLayeredPsd", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_case_study_pack ───────────────────────────────────────────────────
  server.tool(
    "create_case_study_pack",
    "Create a full public-safe delivery pack: PSDs, PNG previews, transparent layer exports, README, manifest JSON, and ZIP. Choose format: game_art_case, social_campaign, app_store, unity_ui_pack.",
    {
      projectName: z.string().min(1).describe("Fictional project name (public-safe)"),
      authorName: z.string().default("Demo Author"),
      outputFolder: z.string().min(1).describe("Output folder"),
      format: z
        .enum(["game_art_case", "social_campaign", "app_store", "unity_ui_pack"])
        .default("game_art_case"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createCaseStudyPack", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
