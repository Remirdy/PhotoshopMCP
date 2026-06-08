/**
 * mcp-server — ai.tools.ts
 * AI-assisted analysis and automation tools for Photoshop document layouts.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

export function registerAiTools(server: McpServer): void {
  // ─── analyze_layer_usage ───────────────────────────────────────────────────
  server.tool(
    "analyze_layer_usage",
    "Audit active document layers to detect duplicate names, empty layers, and unused placeholders.",
    {
      includeHidden: z.boolean().default(true).describe("Whether to include hidden layers in the audit"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("analyzeLayerUsage", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── analyze_color_palette ──────────────────────────────────────────────────
  server.tool(
    "analyze_color_palette",
    "Extract all fill, stroke, and pixel colors used inside the active document and generate a palette analysis report.",
    {
      maxColors: z
        .number()
        .int()
        .min(1)
        .max(256)
        .default(16)
        .describe("Maximum number of dominant colors to list in the report"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("analyzeColorPalette", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── check_accessibility_contrast ──────────────────────────────────────────
  server.tool(
    "check_accessibility_contrast",
    "Analyze the contrast ratio of a text layer against its immediate background layer relative to WCAG guidelines.",
    {
      textLayerName: z.string().min(1).describe("Name of the foreground text layer to audit"),
      backgroundLayerName: z.string().min(1).describe("Name of the background shape or solid fill layer"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("checkAccessibilityContrast", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── audit_fonts ────────────────────────────────────────────────────────────
  server.tool(
    "audit_fonts",
    "Identify all fonts used across text layers in the document and report missing/non-compliant fonts.",
    {
      expectedFonts: z
        .array(z.string())
        .default(["Arial", "Helvetica", "Inter", "Roboto"])
        .describe("List of approved brand fonts to check compliance against"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("auditFonts", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── batch_replace_text ─────────────────────────────────────────────────────
  server.tool(
    "batch_replace_text",
    "Search for specific text content across all text layers in the document and replace it with a new string.",
    {
      find: z.string().min(1).describe("Sub-string to search for inside text layers"),
      replace: z.string().describe("Replacement string value"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("batchReplaceText", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── batch_apply_style ──────────────────────────────────────────────────────
  server.tool(
    "batch_apply_style",
    "Apply a specific visual style preset (drop shadow, stroke, outer glow) globally to all layers matching a query.",
    {
      stylePreset: z.string().min(1).describe("Name of target style preset (e.g. 'premium_button', 'soft_shadow')"),
      layerQuery: z.string().min(1).describe("Substring match to find layers to apply styling on"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("batchApplyStyle", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── detect_duplicate_layers ───────────────────────────────────────────────
  server.tool(
    "detect_duplicate_layers",
    "Audit document layers to find naming duplicates or identical graphic content overlaps.",
    {
      includeHidden: z.boolean().default(true).describe("Audit hidden layers as well"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("detectDuplicateLayers", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── analyze_psd_complexity ─────────────────────────────────────────────────
  server.tool(
    "analyze_psd_complexity",
    "Generate a complexity score based on layer counts, nested hierarchies, size bounds, and effect styles.",
    {
      detailed: z.boolean().default(false).describe("If true, returns layer-by-layer metric breakdowns"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("analyzePsdComplexity", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── suggest_layer_grouping ──────────────────────────────────────────────────
  server.tool(
    "suggest_layer_grouping",
    "AI-analyze layer names and spatial proximity bounds to suggest group folder hierarchies.",
    {
      mode: z.enum(["flat", "hierarchical"]).default("hierarchical").describe("Suggestions layout format style"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("suggestLayerGrouping", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── detect_missing_assets ──────────────────────────────────────────────────
  server.tool(
    "detect_missing_assets",
    "Identify layer frames with no graphical contents that act as placeholders or unresolved smart objects.",
    {
      placeholderPattern: z.string().default("placeholder|_temp|untitled").describe("Keyword search filter to scan names against"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("detectMissingAssets", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── generate_psd_diff ──────────────────────────────────────────────────────
  server.tool(
    "generate_psd_diff",
    "Compare layer manifests of two PSD documents to report added, deleted, renamed, or repositioned layers.",
    {
      manifestAPath: z.string().min(1).describe("Absolute path to first PSD JSON manifest file (base)"),
      manifestBPath: z.string().min(1).describe("Absolute path to second PSD JSON manifest file (modified)"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("generatePsdDiff", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── auto_align_layers ──────────────────────────────────────────────────────
  server.tool(
    "auto_align_layers",
    "Align selected layers in Photoshop automatically (left, right, center, top, bottom alignment).",
    {
      alignType: z
        .enum(["center", "left", "right", "top", "bottom"])
        .describe("The coordinate alignment direction"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("autoAlignLayers", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── auto_space_layers ──────────────────────────────────────────────────────
  server.tool(
    "auto_space_layers",
    "Evenly distribute horizontal/vertical spacing spacing between selected layers.",
    {
      spacingType: z.enum(["horizontal", "vertical"]).describe("Horizontal or vertical spacing distribution"),
      spacingPx: z.number().int().min(0).optional().describe("Optional padding spacing in pixels (if not distributing evenly)"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("autoSpaceLayers", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── smart_crop_to_subject ──────────────────────────────────────────────────
  server.tool(
    "smart_crop_to_subject",
    "Crop the document canvas automatically to the bounding box dimensions of the isolated subject layer.",
    {
      padding: z.number().int().min(0).default(0).describe("Optional pixel margins to add around the cropped subject bounds"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("smartCropToSubject", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── extract_dominant_colors ───────────────────────────────────────────────
  server.tool(
    "extract_dominant_colors",
    "Scan a rasterized layer to extract the top N dominant theme colors with usage frequency values.",
    {
      layerName: z.string().min(1).describe("Name of target layer to analyze"),
      maxColors: z.number().int().min(1).max(256).default(5).describe("Maximum color counts to return"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("extractDominantColors", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── check_brand_compliance ─────────────────────────────────────────────────
  server.tool(
    "check_brand_compliance",
    "Validate document styling properties (e.g., text fonts, shape colors) against a standard brand token dictionary.",
    {
      brandTokens: z
        .object({
          colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{3,8}$/)).describe("Allowed brand color hex codes"),
          fonts: z.array(z.string()).describe("Allowed brand font family names"),
        })
        .describe("Brand guideline tokens structure"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("checkBrandCompliance", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
