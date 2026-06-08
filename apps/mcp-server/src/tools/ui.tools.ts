/**
 * mcp-server — ui.tools.ts
 * High-level UI component tools for mobile game HUDs and UI elements.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

const UIStyleSchema = z.enum([
  "premium_purple", "soft_game", "glass_dark", "arcade_bold",
  "luxury_dark", "ios_glass", "dark_luxury", "clean_saas",
]);

export function registerUITools(server: McpServer): void {
  // ─── create_hud_coin_counter ────────────────────────────────────────────────
  server.tool(
    "create_hud_coin_counter",
    "Create a complete, editable coin counter HUD component. Creates a group with shape background, coin icon circle, and value text layer. All sub-layers are named and editable.",
    {
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      value: z.number().int().min(0).default(2450).describe("Starting coin value"),
      parentGroup: z.string().optional().describe("Parent group path, e.g. '03_UI/Top_HUD'"),
      style: UIStyleSchema.default("premium_purple"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createHudCoinCounter", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_hud_level_indicator ─────────────────────────────────────────────
  server.tool(
    "create_hud_level_indicator",
    "Create an editable level indicator HUD component with background panel and level number text.",
    {
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      level: z.number().int().min(1).default(12).describe("Current level number"),
      parentGroup: z.string().optional(),
      style: UIStyleSchema.default("premium_purple"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createHudLevelIndicator", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_settings_button ─────────────────────────────────────────────────
  server.tool(
    "create_settings_button",
    "Create an editable settings button shell with background circle and icon placeholder.",
    {
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      parentGroup: z.string().optional(),
      style: UIStyleSchema.default("premium_purple"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createSettingsButton", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_booster_button ──────────────────────────────────────────────────
  server.tool(
    "create_booster_button",
    "Create a single editable booster button with optional icon asset and count badge.",
    {
      name: z.string().min(1).max(200).describe("Booster button group name, e.g. 'Booster_01'"),
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      iconAssetPath: z.string().optional().describe("Path to booster icon PNG (optional; creates placeholder if not set)"),
      count: z.number().int().min(0).default(2).describe("Badge count value"),
      parentGroup: z.string().optional(),
      style: UIStyleSchema.default("premium_purple"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createBoosterButton", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_booster_row ─────────────────────────────────────────────────────
  server.tool(
    "create_booster_row",
    "Create a complete bottom row of booster buttons as an editable group. Each button gets its own sub-group with BG, icon, and badge layers.",
    {
      x: z.number().describe("X start position"),
      y: z.number().describe("Y position"),
      buttons: z
        .array(
          z.object({
            name: z.string().min(1).describe("Button name"),
            iconAssetPath: z.string().optional().describe("Icon PNG path"),
            count: z.number().int().min(0).default(2),
          })
        )
        .min(1)
        .describe("List of booster button definitions"),
      parentGroup: z.string().optional(),
      style: UIStyleSchema.default("premium_purple"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createBoosterRow", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_popup_modal ─────────────────────────────────────────────────────
  server.tool(
    "create_popup_modal",
    "Create a fully editable popup/modal UI component with title, message, confirm button, and close button. All text layers remain editable.",
    {
      name: z.string().min(1).max(200).describe("Modal group name"),
      title: z.string().default("Exit").describe("Modal title text"),
      message: z.string().default("Are you sure?").describe("Modal body message"),
      confirmText: z.string().default("Confirm").describe("Confirm button label"),
      x: z.number().default(145).describe("Modal X position"),
      y: z.number().default(740).describe("Modal Y position"),
      width: z.number().min(100).default(1000).describe("Modal panel width"),
      height: z.number().min(100).default(1100).describe("Modal panel height"),
      iconAssetPath: z.string().optional().describe("Optional icon PNG for the modal"),
      parentGroup: z.string().optional(),
      style: UIStyleSchema.default("premium_purple"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createPopupModal", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── create_dim_scrim ───────────────────────────────────────────────────────
  server.tool(
    "create_dim_scrim",
    "Create a full-canvas dim overlay layer (scrim) for use behind popup modals.",
    {
      opacity: z.number().min(0).max(100).default(70).describe("Scrim opacity 0–100"),
      color: z.string().default("#000000").describe("Scrim color (usually black)"),
      parentGroup: z.string().optional().describe("Parent group, e.g. '04_POPUP/Scrim'"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("createDimScrim", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
