/**
 * mcp-server — shape.tools.ts
 * Tools: create_rectangle_shape, create_circle_shape, create_line_shape, create_safe_area_guides
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

const StrokeSchema = z.object({
  color: z.string().describe("Stroke hex color"),
  width: z.number().min(0).max(200).describe("Stroke width in pixels"),
});

const ShadowSchema = z.object({
  enabled: z.boolean().default(true),
  opacity: z.number().min(0).max(100).default(35),
  blur: z.number().min(0).max(250).default(18),
  distance: z.number().min(0).max(500).default(8),
  angle: z.number().min(0).max(360).default(90),
  color: z.string().default("#000000"),
});

export function registerShapeTools(server: McpServer): void {
  // ─── create_rectangle_shape ─────────────────────────────────────────────────
  server.tool(
    "create_rectangle_shape",
    "Create an editable vector rectangle or rounded-rectangle shape layer. Use for panel backgrounds, buttons, cards, and UI containers. Supports fill, stroke, and drop shadow.",
    {
      name: z.string().min(1).max(200).describe("Layer name, e.g. 'TopHUD_CoinCounter_BG'"),
      x: z.number().describe("X position from canvas left"),
      y: z.number().describe("Y position from canvas top"),
      width: z.number().min(1).describe("Width in pixels"),
      height: z.number().min(1).describe("Height in pixels"),
      radius: z.number().min(0).max(999).default(0).describe("Corner radius. Use 999 for capsule shape."),
      fill: z.string().optional().describe("Fill hex color"),
      stroke: StrokeSchema.optional(),
      shadow: ShadowSchema.optional(),
      parentGroup: z.string().optional().describe("Parent group path, e.g. '03_UI/Top_HUD'"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createRectangleShape", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_circle_shape ────────────────────────────────────────────────────
  server.tool(
    "create_circle_shape",
    "Create an editable vector circle (ellipse) shape layer. Use for coin icons, avatar frames, booster backgrounds, and decorative elements.",
    {
      name: z.string().min(1).max(200).describe("Layer name"),
      x: z.number().describe("X position of the circle center or top-left"),
      y: z.number().describe("Y position"),
      diameter: z.number().min(1).describe("Diameter in pixels"),
      fill: z.string().optional().describe("Fill hex color"),
      stroke: StrokeSchema.optional(),
      parentGroup: z.string().optional(),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createCircleShape", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_line_shape ──────────────────────────────────────────────────────
  server.tool(
    "create_line_shape",
    "Create an editable vector line or polygon shape layer from a list of points. Use for outlines, borders, and decorative separators.",
    {
      name: z.string().min(1).max(200).describe("Layer name"),
      points: z
        .array(z.object({ x: z.number(), y: z.number() }))
        .min(2)
        .describe("Array of {x,y} coordinate points"),
      stroke: StrokeSchema.describe("Stroke color and width (required for visible line)"),
      fill: z.string().optional().describe("Optional fill for closed polygons"),
      parentGroup: z.string().optional(),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createLineShape", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_safe_area_guides ────────────────────────────────────────────────
  server.tool(
    "create_safe_area_guides",
    "Create safe area guide overlays for mobile UI design. Can be hidden for export but visible during design.",
    {
      preset: z.enum(["iphone_15_pro_max", "iphone_14", "android_generic", "custom"]).default("iphone_15_pro_max"),
      top: z.number().default(80).describe("Top safe inset in pixels"),
      bottom: z.number().default(120).describe("Bottom safe inset in pixels"),
      left: z.number().default(48).describe("Left safe inset in pixels"),
      right: z.number().default(48).describe("Right safe inset in pixels"),
      visible: z.boolean().default(true).describe("Show guides initially"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createSafeAreaGuides", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_advanced_grid_layout ───────────────────────────────────────────
  server.tool(
    "create_advanced_grid_layout",
    "Calculate and draw an advanced grid of vertical and horizontal guide lines based on margins, columns, rows, and gutters (GuideGuide replica).",
    {
      columns: z.number().int().min(1).max(100).describe("Number of columns to calculate"),
      rows: z.number().int().min(1).max(100).describe("Number of rows to calculate"),
      margins: z
        .object({
          top: z.number().int().default(0),
          bottom: z.number().int().default(0),
          left: z.number().int().default(0),
          right: z.number().int().default(0),
        })
        .optional()
        .describe("Outer document margins in pixels"),
      gutters: z
        .object({
          horizontal: z.number().int().default(0),
          vertical: z.number().int().default(0),
        })
        .optional()
        .describe("Spacing between columns/rows in pixels"),
      centerLines: z.boolean().default(false).describe("Whether to draw horizontal and vertical center guide lines"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createAdvancedGridLayout", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
