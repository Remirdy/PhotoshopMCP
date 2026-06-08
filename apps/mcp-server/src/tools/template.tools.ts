/**
 * mcp-server — template.tools.ts
 * Selection, mask, layer effects, and style presets.
 * Also: developer tools (batchplay, job management).
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";
import { makeOk } from "@remirdy/shared";
import { nanoid } from "nanoid";

export function registerTemplateTools(server: McpServer): void {
  // ─── select_layer_bounds ────────────────────────────────────────────────────
  server.tool(
    "select_layer_bounds",
    "Select the visible pixel bounds of a layer (equivalent to Ctrl+click on layer thumbnail).",
    {
      layerName: z.string().min(1).describe("Layer name"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("selectLayerBounds", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_mask_from_layer ─────────────────────────────────────────────────
  server.tool(
    "create_mask_from_layer",
    "Use a source layer's luminosity as a mask applied to a target layer.",
    {
      sourceLayer: z.string().min(1).describe("Layer whose shape/luminosity defines the mask"),
      targetLayer: z.string().min(1).describe("Layer to apply the mask to"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createMaskFromLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── apply_clipping_mask ────────────────────────────────────────────────────
  server.tool(
    "apply_clipping_mask",
    "Apply a clipping mask so a layer clips to the shape of the layer below it.",
    {
      layerName: z.string().min(1).describe("Layer to clip"),
      clippedTo: z.string().min(1).describe("Base layer to clip to"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("applyClippingMask", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── apply_layer_effect_preset ──────────────────────────────────────────────
  server.tool(
    "apply_layer_effect_preset",
    "Apply a named effect preset to a layer. Presets: soft_shadow, inner_depth, premium_button, soft_glow, gold_rim, dark_glass, subtle_emboss, floating_card.",
    {
      layerName: z.string().min(1).describe("Target layer name"),
      preset: z
        .enum(["soft_shadow", "inner_depth", "premium_button", "soft_glow", "gold_rim", "dark_glass", "subtle_emboss", "floating_card"])
        .describe("Effect preset to apply"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("applyLayerEffectPreset", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── apply_style_to_group ───────────────────────────────────────────────────
  server.tool(
    "apply_style_to_group",
    "Apply a style preset to all shape/text layers within a group. Useful for retheming an entire UI section at once.",
    {
      groupName: z.string().min(1).describe("Group path to restyle"),
      preset: z
        .enum(["premium_game_ui", "soft_game", "ios_glass", "dark_luxury", "arcade_bold", "clean_saas"])
        .describe("Style preset to apply"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("applyStyleToGroup", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── apply_color_grading_preset ─────────────────────────────────────────────
  server.tool(
    "apply_color_grading_preset",
    "Apply a cinematic or artistic color grading adjustment layer preset (Curves, Color Balance) to the active layer or document.",
    {
      layerName: z.string().optional().describe("Optional layer or group name to apply the adjustment above"),
      preset: z
        .enum(["warm", "cool", "vintage", "cyberpunk"])
        .describe("Color grading preset style"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("colorGradePreset", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
