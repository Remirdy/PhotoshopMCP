/**
 * mcp-server — result.ts
 * Wraps JobResult as MCP tool response content.
 */
import type { JobResult } from "@remirdy/shared";

export function toMcpContent(result: JobResult): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

export function toMcpError(message: string): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          ok: false,
          message,
          data: null,
          warnings: [],
          jobId: "n/a",
          photoshopStatus: "error",
        }),
      },
    ],
  };
}
