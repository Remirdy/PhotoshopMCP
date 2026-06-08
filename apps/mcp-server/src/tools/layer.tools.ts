/**
 * mcp-server — layer.tools.ts
 * Tools: create_group, create_layer_tree, rename_layer, move_layer, transform_layer,
 *        duplicate_layer, delete_layer, lock_layer, set_layer_visibility, reorder_layer
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

const GroupDescriptorSchema: z.ZodType<{
  name: string;
  children?: Array<{ name: string; children?: unknown[] }>;
}> = z.lazy(() =>
  z.object({
    name: z.string().min(1).max(200),
    children: z.array(GroupDescriptorSchema).optional(),
  })
);

export function registerLayerTools(server: McpServer): void {
  // ─── create_group ───────────────────────────────────────────────────────────
  server.tool(
    "create_group",
    "Create a new Photoshop layer group (folder). Use parentGroup to nest inside an existing group.",
    {
      name: z.string().min(1).max(200).describe("Group name, e.g. '03_UI'"),
      parentGroup: z.string().optional().describe("Parent group path, e.g. '03_UI/Top_HUD'"),
      opacity: z.number().min(0).max(100).default(100),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createGroup", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_layer_tree ──────────────────────────────────────────────────────
  server.tool(
    "create_layer_tree",
    "Create a full nested layer group tree in one operation. Pass an array of group descriptors with optional children. This is the fastest way to set up a document's group structure.",
    {
      groups: z.array(GroupDescriptorSchema).describe(
        "Array of group descriptors. Example: [{name:'01_BG'},{name:'02_GAMEPLAY_SCENE',children:[{name:'Game_Board'}]}]"
      ),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createLayerTree", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── rename_layer ───────────────────────────────────────────────────────────
  server.tool(
    "rename_layer",
    "Rename a Photoshop layer or group by its current name.",
    {
      from: z.string().min(1).describe("Current layer name"),
      to: z.string().min(1).max(200).describe("New layer name"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("renameLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── move_layer ─────────────────────────────────────────────────────────────
  server.tool(
    "move_layer",
    "Move a layer to absolute pixel coordinates (x, y from top-left of canvas).",
    {
      layerName: z.string().min(1).describe("Target layer or group name"),
      x: z.number().describe("X position in pixels from canvas left"),
      y: z.number().describe("Y position in pixels from canvas top"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("moveLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── transform_layer ────────────────────────────────────────────────────────
  server.tool(
    "transform_layer",
    "Move, scale, rotate, and set opacity on a layer in a single operation.",
    {
      layerName: z.string().min(1).describe("Target layer or group name"),
      x: z.number().optional().describe("X position"),
      y: z.number().optional().describe("Y position"),
      scaleX: z.number().min(1).max(10000).optional().default(100).describe("Horizontal scale percent"),
      scaleY: z.number().min(1).max(10000).optional().default(100).describe("Vertical scale percent"),
      rotation: z.number().min(-360).max(360).optional().default(0).describe("Rotation in degrees"),
      opacity: z.number().min(0).max(100).optional().default(100),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("transformLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── duplicate_layer ────────────────────────────────────────────────────────
  server.tool(
    "duplicate_layer",
    "Duplicate a layer or group and give the copy a new name.",
    {
      layerName: z.string().min(1).describe("Source layer name to duplicate"),
      newName: z.string().min(1).max(200).describe("Name for the duplicate"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("duplicateLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── delete_layer ───────────────────────────────────────────────────────────
  server.tool(
    "delete_layer",
    "Delete a layer or group by name. Irreversible — use with caution.",
    {
      layerName: z.string().min(1).describe("Name of the layer or group to delete"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("deleteLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── lock_layer ─────────────────────────────────────────────────────────────
  server.tool(
    "lock_layer",
    "Lock or unlock a layer to prevent accidental edits.",
    {
      layerName: z.string().min(1).describe("Layer name"),
      lock: z.boolean().default(true).describe("true to lock, false to unlock"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("lockLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── set_layer_visibility ───────────────────────────────────────────────────
  server.tool(
    "set_layer_visibility",
    "Show or hide a layer or group.",
    {
      layerName: z.string().min(1).describe("Layer name"),
      visible: z.boolean().default(true).describe("true to show, false to hide"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("setLayerVisibility", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── reorder_layer ──────────────────────────────────────────────────────────
  server.tool(
    "reorder_layer",
    "Change layer stacking order. Position options: 'front', 'back', 'above', 'below'.",
    {
      layerName: z.string().min(1).describe("Layer to move"),
      position: z.enum(["front", "back", "above", "below"]).describe("Stacking position"),
      targetLayer: z.string().optional().describe("Reference layer for 'above'/'below' positions"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("reorderLayer", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── batch_rename_layers_regex ──────────────────────────────────────────────
  server.tool(
    "batch_rename_layers_regex",
    "Batch rename layers matching a search term/pattern using Regular Expressions, with support for prefixes, suffixes, numbering increments, and casing conversion (Renamy replica).",
    {
      searchPattern: z.string().min(1).describe("Search string or Regular Expression match pattern"),
      replacePattern: z.string().describe("Replacement string value (supports match groups like $1, or %N for auto-increment)"),
      prefix: z.string().optional().describe("Optional prefix to prepend to matching layers"),
      suffix: z.string().optional().describe("Optional suffix to append to matching layers"),
      uppercaseMode: z
        .enum(["upper", "lower", "none"])
        .default("none")
        .describe("Casing force mode: force UPPERCASE, force lowercase, or preserve casing"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("batchRenameLayersRegex", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
