#!/usr/bin/env node
/**
 * mcp-server — index.ts
 * Entry point: starts the MCP server over stdio (Claude Desktop / Cursor compatible).
 */
import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  logger.info("Starting Remirdy Photoshop MCP server...");
  logger.info(`Bridge URL: ${process.env.BRIDGE_URL ?? "http://localhost:47831"}`);
  logger.info(`Mock mode: ${process.env.MOCK_MODE === "true" ? "ON" : "OFF"}`);

  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("Remirdy Photoshop MCP server running on stdio transport.");
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
