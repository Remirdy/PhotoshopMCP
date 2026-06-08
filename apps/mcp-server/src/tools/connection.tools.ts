/**
 * mcp-server — connection.tools.ts
 * Tools: photoshop_status, photoshop_ping, bridge_status
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";
import { makeOk } from "@remirdy/shared";

export function registerConnectionTools(server: McpServer): void {
  // ─── photoshop_status ───────────────────────────────────────────────────────
  server.tool(
    "photoshop_status",
    "Check whether the Photoshop UXP plugin is connected to the local bridge. Returns plugin version, active document name, and Photoshop version.",
    {},
    async () => {
      try {
        const health = await bridgeClient.healthCheck();
        if (!health.ok) {
          return toMcpContent({
            ok: false,
            message: `Bridge not available: ${health.message}`,
            data: { connected: false, pluginVersion: null, activeDocument: null, photoshopVersion: null },
            warnings: ["Run: pnpm dev:bridge to start the local bridge"],
            jobId: "n/a",
            photoshopStatus: "disconnected",
          });
        }
        const status = await bridgeClient.photoshopStatus();
        return toMcpContent(
          makeOk(status, "status", status.connected ? "Photoshop is connected." : "Photoshop plugin is not connected.")
        );
      } catch (err) {
        return toMcpError(`Failed to check status: ${err instanceof Error ? err.message : err}`);
      }
    }
  );

  // ─── photoshop_ping ─────────────────────────────────────────────────────────
  server.tool(
    "photoshop_ping",
    "Send a ping job to Photoshop and return response time in milliseconds.",
    {},
    async () => {
      const start = Date.now();
      try {
        const result = await bridgeClient.sendJob("ping", {});
        const responseTimeMs = Date.now() - start;
        return toMcpContent({
          ...result,
          data: { connected: result.ok, responseTimeMs, ...(result.data as object) },
          message: `Ping successful in ${responseTimeMs}ms`,
        });
      } catch (err) {
        return toMcpError(`Ping failed: ${err instanceof Error ? err.message : err}`);
      }
    }
  );

  // ─── bridge_status ──────────────────────────────────────────────────────────
  server.tool(
    "bridge_status",
    "Check MCP → Local Bridge health. Returns bridge connection state, port, and job queue size.",
    {},
    async () => {
      try {
        const health = await bridgeClient.healthCheck();
        return toMcpContent(
          makeOk(
            {
              bridgeConnected: health.ok,
              port: parseInt(process.env.BRIDGE_PORT ?? "47831", 10),
              message: health.message,
            },
            "bridge_status",
            health.ok ? "Bridge is running." : `Bridge offline: ${health.message}`
          )
        );
      } catch (err) {
        return toMcpError(`Bridge status check failed: ${err instanceof Error ? err.message : err}`);
      }
    }
  );
}
