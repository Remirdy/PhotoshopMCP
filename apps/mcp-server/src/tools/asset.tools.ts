/**
 * mcp-server — asset.tools.ts
 * Tools: place_asset, place_asset_grid, replace_asset_layer, export_layer_as_png,
 *        export_group_as_png, export_all_top_level_groups
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

export function registerAssetTools(server: McpServer): void {
  // ─── place_asset ────────────────────────────────────────────────────────────
  server.tool(
    "place_asset",
    "Place an external PNG, JPG, or PSD file as a raster Smart Object layer at specified coordinates. The layer is clearly labeled as a raster asset — not an editable vector. Use for game art, icons, and illustrations.",
    {
      path: z.string().min(1).describe("Absolute path to the PNG/JPG/PSD asset"),
      layerName: z.string().min(1).max(200).describe("Name for the placed layer"),
      x: z.number().default(0).describe("X position"),
      y: z.number().default(0).describe("Y position"),
      scale: z.number().min(1).max(1000).default(100).describe("Uniform scale percentage"),
      scaleX: z.number().min(1).max(1000).optional().describe("Horizontal scale percentage (overrides scale)"),
      scaleY: z.number().min(1).max(1000).optional().describe("Vertical scale percentage (overrides scale)"),
      rotation: z.number().min(-360).max(360).default(0).describe("Rotation in degrees"),
      parentGroup: z.string().optional().describe("Parent group path"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("placeAsset", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── place_asset_grid ───────────────────────────────────────────────────────
  server.tool(
    "place_asset_grid",
    "Place multiple PNG/JPG assets in an evenly-spaced row or grid. Ideal for tile placeholders, crate rows, and booster button backgrounds.",
    {
      assets: z
        .array(
          z.object({
            path: z.string().min(1).describe("Asset file path"),
            layerName: z.string().min(1).max(200).describe("Layer name for this asset"),
          })
        )
        .min(1)
        .describe("List of assets to place"),
      startX: z.number().describe("X position of the first asset"),
      startY: z.number().describe("Y position of the first asset"),
      gapX: z.number().default(160).describe("Horizontal gap between assets in pixels"),
      gapY: z.number().default(160).describe("Vertical gap between rows in pixels"),
      columns: z.number().int().min(1).default(5).describe("Number of columns before wrapping to next row"),
      scale: z.number().min(1).max(1000).default(100),
      parentGroup: z.string().optional(),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("placeAssetGrid", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── replace_asset_layer ────────────────────────────────────────────────────
  server.tool(
    "replace_asset_layer",
    "Replace the contents of a Smart Object asset layer with a new file, keeping position and transform.",
    {
      layerName: z.string().min(1).describe("Layer name to replace"),
      newAssetPath: z.string().min(1).describe("Path to the new asset file"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("replaceAssetLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── export_layer_as_png ────────────────────────────────────────────────────
  server.tool(
    "export_layer_as_png",
    "Export a single layer as a transparent PNG file. Optionally trim transparent pixels.",
    {
      layerName: z.string().min(1).describe("Layer name to export"),
      outputPath: z.string().min(1).describe("Absolute path for the output PNG file"),
      trimTransparent: z.boolean().default(true).describe("Trim transparent edges from the export"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("exportLayerAsPng", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── export_group_as_png ────────────────────────────────────────────────────
  server.tool(
    "export_group_as_png",
    "Export a layer group (folder) as a flattened transparent PNG.",
    {
      groupName: z.string().min(1).describe("Group path, e.g. '03_UI/Bottom_HUD/Booster_Row'"),
      outputPath: z.string().min(1).describe("Output PNG file path"),
      trimTransparent: z.boolean().default(true),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("exportGroupAsPng", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── export_all_top_level_groups ────────────────────────────────────────────
  server.tool(
    "export_all_top_level_groups",
    "Export every top-level group as a separate transparent PNG. Useful for delivering individual layer composites.",
    {
      outputFolder: z.string().min(1).describe("Folder path where PNGs will be saved"),
      prefix: z.string().default("").describe("Optional filename prefix, e.g. 'PremiumPuzzle'"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("exportAllTopLevelGroups", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
