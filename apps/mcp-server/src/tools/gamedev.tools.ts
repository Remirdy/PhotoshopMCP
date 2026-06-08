/**
 * mcp-server — gamedev.tools.ts
 * Game development pipeline tools: slice_sprite_sheet, pack_sprite_sheet_atlas.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

export function registerGameDevTools(server: McpServer): void {
  // ─── slice_sprite_sheet ────────────────────────────────────────────────────
  server.tool(
    "slice_sprite_sheet",
    "Slice a sprite sheet PNG image into individual frame layers in Photoshop or export them to a folder.",
    {
      imagePath: z.string().min(1).describe("Absolute path to the sprite sheet image"),
      frameWidth: z.number().int().min(1).describe("Width of each animation frame in pixels"),
      frameHeight: z.number().int().min(1).describe("Height of each animation frame in pixels"),
      outputFolder: z.string().min(1).describe("Absolute path to folder where individual frame PNGs will be written"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("sliceSpriteSheet", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── pack_sprite_sheet_atlas ───────────────────────────────────────────────
  server.tool(
    "pack_sprite_sheet_atlas",
    "Pack a folder of individual frame PNGs or active Photoshop layers into a single sprite atlas PNG and output a JSON manifest.",
    {
      inputFolder: z.string().min(1).describe("Folder containing individual frame PNG assets to pack"),
      outputAtlasPath: z.string().min(1).describe("Absolute path where the packed sprite atlas PNG will be saved"),
      outputManifestPath: z.string().min(1).describe("Absolute path to save the JSON manifest (Unity/Godot compatible)"),
      columns: z.number().int().min(1).optional().describe("Optional column count to arrange frames in the grid"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("packSpriteSheetAtlas", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_color_variants ─────────────────────────────────────────────────
  server.tool(
    "create_color_variants",
    "Create multiple color variants of a layer or group by automatically duplicate-shifting Hue/Saturation.",
    {
      layerName: z.string().min(1).describe("Name of the source layer or group to duplicate and modify"),
      variantsCount: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(3)
        .describe("Number of color variants to generate"),
      hueStep: z
        .number()
        .min(-180)
        .max(180)
        .default(45)
        .describe("Hue rotation degree step for each variant (e.g. 45 degrees)"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createColorVariants", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_rig_ready_character ─────────────────────────────────────────────
  server.tool(
    "create_rig_ready_character",
    "Segment a character concept sheet or artwork into hierarchical folders containing separate layers ready for 2D skeleton rigging (Spine/Live2D).",
    {
      characterName: z.string().min(1).describe("Name of the character to use in naming groups"),
      parts: z
        .array(z.string())
        .default(["head", "torso", "arm_left", "arm_right", "leg_left", "leg_right"])
        .describe("List of parts to structure as group folders"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createRigReadyCharacter", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_ui_skin_from_tokens ────────────────────────────────────────────
  server.tool(
    "create_ui_skin_from_tokens",
    "Apply design token colors and properties globally to matching shape fill/stroke layers across the active document.",
    {
      tokens: z
        .record(z.string(), z.string())
        .describe("Key-value pair of design token identifiers (e.g. {'primary-color': '#ff00ff'})"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createUiSkinFromTokens", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_nine_slice_template ────────────────────────────────────────────
  server.tool(
    "create_nine_slice_template",
    "Generate a standard 9-slice scale layout panel template with guides set at the corners.",
    {
      width: z.number().int().min(10).max(4096).describe("Total width of the 9-slice panel template in pixels"),
      height: z.number().int().min(10).max(4096).describe("Total height of the 9-slice panel template in pixels"),
      borderSize: z.number().int().min(1).max(1024).describe("Border/margin size in pixels for the slices"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createNineSliceTemplate", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── generate_character_limb_animation ──────────────────────────────────────
  server.tool(
    "generate_character_limb_animation",
    "Auto-animate a layered character rig inside Photoshop by duplicating frames and applying joint pivot rotations (idle breathing or walk cycle), compiling them to a spritesheet sequence.",
    {
      characterGroup: z.string().min(1).describe("Name of the rig-ready character group to animate"),
      cycleType: z.enum(["breathe", "walk"]).describe("The motion profile: idle breathe or walk cycle"),
      frameCount: z.number().int().min(2).max(128).default(16).describe("Total number of frame variations to render"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("generateCharacterLimbAnimation", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
