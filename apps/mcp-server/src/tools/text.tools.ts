/**
 * mcp-server — text.tools.ts
 * Tools: create_text_layer, update_text_layer, create_label_badge
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

export function registerTextTools(server: McpServer): void {
  // ─── create_text_layer ──────────────────────────────────────────────────────
  server.tool(
    "create_text_layer",
    "Create an editable Photoshop text layer. The text remains fully editable and scalable. Use for HUD labels, level indicators, coin counts, button labels, and popup text.",
    {
      name: z.string().min(1).max(200).describe("Layer name, e.g. 'Level_Text'"),
      text: z.string().min(1).describe("Text content"),
      x: z.number().describe("X position"),
      y: z.number().describe("Y position (baseline)"),
      fontSize: z.number().min(1).max(500).default(32).describe("Font size in points"),
      color: z.string().default("#FFFFFF").describe("Text hex color"),
      fontFamily: z.string().default("Arial").describe("Font family name. Fallback: 'Arial Rounded MT Bold', 'Arial'"),
      align: z.enum(["left", "center", "right"]).default("left").describe("Text alignment"),
      parentGroup: z.string().optional().describe("Parent group path"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createTextLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── update_text_layer ──────────────────────────────────────────────────────
  server.tool(
    "update_text_layer",
    "Update the content, font size, or color of an existing editable text layer.",
    {
      layerName: z.string().min(1).describe("Name of the text layer to update"),
      text: z.string().optional().describe("New text content"),
      fontSize: z.number().min(1).max(500).optional(),
      color: z.string().optional().describe("New text hex color"),
      fontFamily: z.string().optional(),
      align: z.enum(["left", "center", "right"]).optional(),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("updateTextLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_label_badge ─────────────────────────────────────────────────────
  server.tool(
    "create_label_badge",
    "Create a small rounded badge with editable text. Useful for booster count indicators, notification badges, and quantity labels. Creates a group containing a shape background and a text layer.",
    {
      name: z.string().min(1).max(200).describe("Badge group name, e.g. 'Booster_01_Badge'"),
      text: z.string().min(1).describe("Badge text, e.g. 'x2' or '99+'"),
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      width: z.number().min(1).default(72).describe("Badge width"),
      height: z.number().min(1).default(56).describe("Badge height"),
      fill: z.string().default("#E8424A").describe("Badge background color"),
      textColor: z.string().default("#FFFFFF").describe("Text color"),
      fontSize: z.number().min(6).max(200).default(28),
      parentGroup: z.string().optional(),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createLabelBadge", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
