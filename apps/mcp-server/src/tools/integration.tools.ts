/**
 * mcp-server — integration.tools.ts
 * Integrations with third-party platforms: Figma, Google Fonts, and Slack.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

export function registerIntegrationTools(server: McpServer): void {
  // ─── import_figma_frame ────────────────────────────────────────────────────
  server.tool(
    "import_figma_frame",
    "Import a flat JSON tree representation of a Figma frame layout and reconstruct it inside Photoshop.",
    {
      figmaFrameJson: z
        .string()
        .min(1)
        .describe("Figma JSON tree node details of the frame structure to convert"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("importFigmaFrame", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── download_google_font ──────────────────────────────────────────────────
  server.tool(
    "download_google_font",
    "Download and activate a Google Font style locally so it is editable and rendered correctly in Photoshop.",
    {
      fontFamily: z.string().min(1).describe("Name of the Google Font family to fetch (e.g. 'Inter' or 'Outfit')"),
      fontUrl: z.string().url().optional().describe("Optional direct download URL of the font asset zip/ttf"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("downloadGoogleFont", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── send_slack_notification ───────────────────────────────────────────────
  server.tool(
    "send_slack_notification",
    "Send a status update or audit/export report notification to a Slack workspace channel using a webhook URL.",
    {
      webhookUrl: z.string().url().describe("Incoming Slack webhook URL endpoint"),
      message: z.string().min(1).describe("Message text content or structured block JSON block string"),
      channel: z.string().optional().describe("Optional Slack channel override"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("sendSlackNotification", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── import_canva_design ───────────────────────────────────────────────────
  server.tool(
    "import_canva_design",
    "Import a Canva design layout element JSON tree representation and reconstruct it programmatically inside Photoshop as editable layers.",
    {
      canvaDesignJson: z
        .string()
        .min(1)
        .describe("Canva elements JSON tree node structure representing the design to import"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("importCanvaDesign", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
