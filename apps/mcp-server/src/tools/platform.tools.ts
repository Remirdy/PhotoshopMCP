/**
 * mcp-server — platform.tools.ts
 * Platform export tools: export_app_icon_pack.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

export function registerPlatformTools(server: McpServer): void {
  // ─── export_app_icon_pack ──────────────────────────────────────────────────
  server.tool(
    "export_app_icon_pack",
    "Export a master icon asset to all standard iOS, Android, and Web icon sizes.",
    {
      masterIconPath: z.string().optional().describe("Optional path to master icon file (if not using active Photoshop document)"),
      outputFolder: z.string().min(1).describe("Absolute path to folder where icons will be exported"),
      platforms: z
        .array(z.enum(["ios", "android", "web"]))
        .default(["ios", "android", "web"])
        .describe("Target platforms to generate icons for"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("exportAppIconPack", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── export_react_native_assets ─────────────────────────────────────────────
  server.tool(
    "export_react_native_assets",
    "Export layers or active document into iOS/Android assets at standard density scale factors (@1x, @2x, @3x) alongside a assets.ts index file.",
    {
      outputPath: z.string().min(1).describe("Absolute path to the output directory to write scale-factor images and assets.ts"),
      scaleFactors: z
        .array(z.number())
        .default([1, 2, 3])
        .describe("Scaling factors to generate (e.g. 1, 2, 3)"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("exportReactNativeAssets", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── export_flutter_assets ──────────────────────────────────────────────────
  server.tool(
    "export_flutter_assets",
    "Export assets structured for Flutter project directories (e.g., assets/2.0x/, assets/3.0x/) and output a pubspec.yaml declaration code snippet.",
    {
      outputPath: z.string().min(1).describe("Absolute path to the root output assets folder"),
      scaleFactors: z
        .array(z.number())
        .default([1, 1.5, 2, 3, 4])
        .describe("Density scale factors for Flutter (e.g. 1.5, 2, 3, 4)"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("exportFlutterAssets", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── export_unity_package ───────────────────────────────────────────────────
  server.tool(
    "export_unity_package",
    "Export a Sprite Atlas PNG alongside matching unity .meta files and import settings configuration.",
    {
      outputPath: z.string().min(1).describe("Absolute output directory for Unity assets"),
      atlasPath: z.string().min(1).describe("Absolute path to the packed sprite atlas image"),
      metaSettings: z
        .record(z.string(), z.any())
        .optional()
        .describe("Optional key-value overrides for the generated metadata parameters"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("exportUnityPackage", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── export_godot_spritesheet ───────────────────────────────────────────────
  server.tool(
    "export_godot_spritesheet",
    "Generate a .tres resource descriptor file alongside a packed spritesheet image compatible with Godot Engine.",
    {
      outputPath: z.string().min(1).describe("Absolute path to save the .tres resource configuration file"),
      spritesheetPath: z.string().min(1).describe("Absolute path to the packed spritesheet PNG image file"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("exportGodotSpritesheet", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── export_open_graph_pack ─────────────────────────────────────────────────
  server.tool(
    "export_open_graph_pack",
    "Create social media previews by exporting Open Graph images (1200x630), Twitter Cards (800x418), and LinkedIn banners.",
    {
      outputPath: z.string().min(1).describe("Absolute path to export the social graphics pack"),
      title: z.string().min(1).describe("Main title text to use for custom social layers"),
      siteName: z.string().optional().describe("Optional site name prefix (e.g. 'My Website')"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("exportOpenGraphPack", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── export_ad_banner_pack ──────────────────────────────────────────────────
  server.tool(
    "export_ad_banner_pack",
    "Resize canvas and export a master marketing composition to standard display ad banner sizes: 300x250, 728x90, 160x600, and 320x50.",
    {
      outputPath: z.string().min(1).describe("Absolute output directory path where the banners will be saved"),
      campaignName: z.string().min(1).describe("Campaign name prefix to use in filenames"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("exportAdBannerPack", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
