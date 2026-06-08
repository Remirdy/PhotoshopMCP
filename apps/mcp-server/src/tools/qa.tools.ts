/**
 * mcp-server — qa.tools.ts
 * QA and layout verification tools for Photoshop documents.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

export function registerQaTools(server: McpServer): void {
  // ─── check_brand_colors ────────────────────────────────────────────────────
  server.tool(
    "check_brand_colors",
    "Audit shape fills and strokes to find layers that violate the corporate brand color palette.",
    {
      brandColors: z
        .array(z.string().regex(/^#[0-9A-Fa-f]{3,8}$/))
        .describe("List of allowed brand color hex codes"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("checkBrandColors", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── check_resolutions ──────────────────────────────────────────────────────
  server.tool(
    "check_resolutions",
    "Audit all raster and smart object layer DPI resolutions to flag assets below the target threshold.",
    {
      minDpi: z.number().min(1).default(72).describe("Minimum acceptable layer resolution in DPI"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("checkResolutions", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── find_missing_placeholders ──────────────────────────────────────────────
  server.tool(
    "find_missing_placeholders",
    "Find placeholder layers (by name patterns) that have not yet been replaced with production assets.",
    {
      placeholderPattern: z
        .string()
        .default("placeholder|_temp|untitled")
        .describe("Substring match or regex pattern for placeholder names"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("findMissingPlaceholders", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── check_text_editability ──────────────────────────────────────────────────
  server.tool(
    "check_text_editability",
    "Scan text layers in the document to identify text layers that have been rasterized and are no longer editable.",
    {
      includeHidden: z.boolean().default(true).describe("Whether to include hidden text layers in the audit"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("checkTextEditability", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── check_smart_objects ────────────────────────────────────────────────────
  server.tool(
    "check_smart_objects",
    "Audit all Smart Object layers to verify whether they are locally embedded or externally linked.",
    {
      embedOnly: z.boolean().default(false).describe("If true, warns on any externally linked Smart Objects"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("checkSmartObjects", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── validate_export_readiness ──────────────────────────────────────────────
  server.tool(
    "validate_export_readiness",
    "Check sizing, profiles, group nesting, and naming conventions to ensure the PSD is ready for developer handoff.",
    {
      checklistName: z.string().default("general").describe("Name of target checklist ruleset to apply"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("validateExportReadiness", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── generate_qa_report ─────────────────────────────────────────────────────
  server.tool(
    "generate_qa_report",
    "Generate a unified quality assurance dashboard and compile a detailed compliance report file in the workspace.",
    {
      outputPath: z.string().min(1).describe("Absolute path where the QA report (JSON/Markdown) will be saved"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("generateQaReport", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── check_layer_naming_conventions ──────────────────────────────────────────
  server.tool(
    "check_layer_naming_conventions",
    "Scan layer names to detect structural naming rule violations (e.g. spaces, casings, lowercase starts).",
    {
      namingStyle: z
        .enum(["snake", "camel", "pascal", "kebab"])
        .default("snake")
        .describe("Expected naming style casing for exporting layers"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("checkLayerNamingConventions", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── detect_overlapping_layers ──────────────────────────────────────────────
  server.tool(
    "detect_overlapping_layers",
    "Find layers that occupy identical coordinate bounds and suggest depth alignment fixes.",
    {
      thresholdPx: z.number().min(0).default(0).describe("Minimum intersection threshold in pixels to report"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("detectOverlappingLayers", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── check_document_color_profile ──────────────────────────────────────────
  server.tool(
    "check_document_color_profile",
    "Validate that the active PSD color profile (RGB, CMYK, sRGB, P3) matches the target platform requirements.",
    {
      expectedProfile: z.string().default("sRGB IEC61966-2.1").describe("The expected color profile name"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("checkDocumentColorProfile", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── validate_blend_modes ───────────────────────────────────────────────────
  server.tool(
    "validate_blend_modes",
    "Scan for unusual or non-standard blend modes that may cause rendering mismatches during export pipelines.",
    {
      warnOnModes: z
        .array(z.string())
        .default(["dissolve", "hardMix"])
        .describe("Blend modes to trigger warnings on"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("validateBlendModes", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── snapshot_document_state ─────────────────────────────────────────────────
  server.tool(
    "snapshot_document_state",
    "Save the active layer hierarchy state as a JSON manifest to track versions and generate diff reports.",
    {
      snapshotName: z.string().min(1).describe("Name identifier for the state snapshot version"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("snapshotDocumentState", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
