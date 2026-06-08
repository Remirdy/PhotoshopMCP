/**
 * mcp-server — handoff.tools.ts
 * Developer handoff tools: generate_handoff_spec.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";

export function registerHandoffTools(server: McpServer): void {
  // ─── generate_handoff_spec ─────────────────────────────────────────────────
  server.tool(
    "generate_handoff_spec",
    "Generate a complete developer spec sheet detailing all layers sizes, positions, styling, and text properties alongside SwiftUI, Kotlin, Flutter and CSS code stubs.",
    {
      outputPath: z.string().min(1).describe("Absolute path where the spec file (markdown/HTML/JSON) will be saved"),
      format: z
        .enum(["markdown", "json", "html"])
        .default("markdown")
        .describe("Format of the handoff spec output"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("generateHandoffSpec", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
