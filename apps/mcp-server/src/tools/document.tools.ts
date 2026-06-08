/**
 * mcp-server — document.tools.ts
 * Tools: create_document, open_document, close_document, save_document, set_canvas_background
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";
import { DOCUMENT_PRESETS } from "@remirdy/shared";

export function registerDocumentTools(server: McpServer): void {
  // ─── create_document ────────────────────────────────────────────────────────
  server.tool(
    "create_document",
    "Create a new Photoshop document. Supports size presets for iPhone 15 Pro Max, Instagram, App Store, and Unity UI. Set preset='custom' to specify custom width and height.",
    {
      name: z.string().min(1).max(200).describe("Document name, e.g. 'ColorCrateSort_GameplayUI_Demo'"),
      width: z.number().int().min(1).max(20000).optional().describe("Width in pixels (required if preset='custom')"),
      height: z.number().int().min(1).max(20000).optional().describe("Height in pixels (required if preset='custom')"),
      resolution: z.number().min(1).max(1200).default(72).describe("Resolution in DPI"),
      colorMode: z.enum(["RGB", "CMYK", "Grayscale"]).default("RGB"),
      backgroundColor: z.string().optional().default("#FFFFFF").describe("Background fill color as hex"),
      transparent: z.boolean().default(false).describe("Create transparent background"),
      preset: z
        .enum(["iphone_15_pro_max_game", "instagram_post_4x5", "instagram_story", "app_store_screenshot", "unity_ui_atlas", "custom"])
        .optional()
        .default("custom")
        .describe("Size preset. 'iphone_15_pro_max_game'=1290x2796, 'instagram_post_4x5'=1080x1350, 'instagram_story'=1080x1920, 'unity_ui_atlas'=2048x2048"),
    },
    async (args) => {
      try {
        let { width, height } = args;
        if (args.preset && args.preset !== "custom") {
          const preset = DOCUMENT_PRESETS[args.preset];
          width = preset.width;
          height = preset.height;
        }
        if (!width || !height) {
          return toMcpError("Width and height are required when preset='custom'");
        }
        const result = await bridgeClient.sendJob("createDocument", { ...args, width, height });
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── open_document ──────────────────────────────────────────────────────────
  server.tool(
    "open_document",
    "Open an existing PSD, PSB, PNG, or JPG file in Photoshop.",
    {
      path: z.string().min(1).describe("Absolute path to the file to open"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("openDocument", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── close_document ─────────────────────────────────────────────────────────
  server.tool(
    "close_document",
    "Close the active Photoshop document. Optionally save before closing.",
    {
      save: z.boolean().default(false).describe("Save the document before closing"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("closeDocument", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── save_document ──────────────────────────────────────────────────────────
  server.tool(
    "save_document",
    "Save the active Photoshop document. Supports PSD, PSB, PNG, and JPG formats.",
    {
      path: z.string().min(1).describe("Absolute path for the output file"),
      format: z.enum(["psd", "psb", "png", "jpg"]).default("psd").describe("Output format"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("saveDocument", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── set_canvas_background ──────────────────────────────────────────────────
  server.tool(
    "set_canvas_background",
    "Create or update a named background layer using a solid color or gradient. Creates an editable shape layer at the bottom of the stack.",
    {
      color: z.string().optional().describe("Solid background hex color, e.g. '#140B2E'"),
      gradient: z
        .object({
          type: z.enum(["linear", "radial"]).default("radial"),
          from: z.string().describe("Start hex color"),
          to: z.string().describe("End hex color"),
          angle: z.number().optional(),
        })
        .optional()
        .describe("Gradient definition (overrides solid color)"),
      layerName: z.string().default("BG_Base").describe("Name for the background layer"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("setCanvasBackground", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
