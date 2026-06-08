/**
 * mcp-server — developer.tools.ts
 * Developer escape hatch tools: batchplay, job timeline.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { toMcpContent, toMcpError } from "../utils/result.js";
import { makeOk } from "@remirdy/shared";
import { nanoid } from "nanoid";

const ALLOW_DANGEROUS = process.env.ALLOW_DANGEROUS_BATCHPLAY === "true";

export function registerDeveloperTools(server: McpServer): void {
  // ─── record_action_descriptor_helper ────────────────────────────────────────
  server.tool(
    "record_action_descriptor_helper",
    "Explains how to record Photoshop actions and extract the batchPlay descriptor JSON for use with run_batchplay_descriptor. Useful for implementing Photoshop operations not covered by DOM APIs.",
    {},
    async () => {
      const jobId = `job_${nanoid(10)}`;
      return toMcpContent(
        makeOk(
          {
            guide: [
              "1. Open Photoshop → Window → Actions panel",
              "2. Click 'New Action', name it, and press Record",
              "3. Perform the Photoshop operation you want to automate",
              "4. Press Stop in the Actions panel",
              "5. Right-click the action → 'Copy as JavaScript'",
              "6. The copied code contains batchPlay descriptor JSON",
              "7. Paste the descriptor._obj and descriptor body into run_batchplay_descriptor",
            ],
            safeAllowlist: [
              "set", "make", "select", "move", "duplicate", "delete",
              "group", "ungroup", "rasterizeLayer", "flattenImage",
              "mergeVisible", "save", "saveAs", "export",
              "gaussianBlur", "colorBalance", "hueSaturation", "curves",
              "levels", "brightnessContrast",
            ],
            warning: "Always test batchPlay descriptors in a copy of your document first.",
          },
          jobId,
          "Action recorder guide generated."
        )
      );
    }
  );

  // ─── run_batchplay_descriptor ────────────────────────────────────────────────
  server.tool(
    "run_batchplay_descriptor",
    "Advanced escape hatch: Execute a Photoshop batchPlay descriptor directly. Only allowlisted action IDs are permitted unless allowDangerous=true. Log every operation. Use only for operations not supported by DOM APIs.",
    {
      descriptor: z.record(z.unknown()).describe("batchPlay descriptor object (must include _obj field)"),
      reason: z.string().min(1).describe("Why DOM APIs are insufficient for this operation"),
      allowDangerous: z.boolean().default(false).describe("Allow non-allowlisted descriptors. Requires ALLOW_DANGEROUS_BATCHPLAY=true in env."),
    },
    async (args) => {
      try {
        // Security: if allowDangerous is requested but env forbids it
        if (args.allowDangerous && !ALLOW_DANGEROUS) {
          return toMcpError(
            "allowDangerous=true is blocked by server configuration. Set ALLOW_DANGEROUS_BATCHPLAY=true in .env only for development."
          );
        }
        const result = await bridgeClient.sendJob("runBatchplayDescriptor", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── get_recent_jobs ────────────────────────────────────────────────────────
  server.tool(
    "get_recent_jobs",
    "Return the recent Photoshop job history with status, duration, and results.",
    {
      limit: z.number().int().min(1).max(100).default(20).describe("Number of recent jobs to return"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("getRecentJobs", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── get_job_result ─────────────────────────────────────────────────────────
  server.tool(
    "get_job_result",
    "Get the result of a specific job by its ID.",
    {
      jobId: z.string().min(1).describe("Job ID, e.g. 'job_abc123'"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("getJobResult", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // ─── cancel_job ─────────────────────────────────────────────────────────────
  server.tool(
    "cancel_job",
    "Cancel a queued job before it is executed by Photoshop.",
    {
      jobId: z.string().min(1).describe("Job ID to cancel"),
    },
    async (args) => {
      try {
        const result = await bridgeClient.sendJob("cancelJob", args);
        return toMcpContent(result);
      } catch (err) {
        return toMcpError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
