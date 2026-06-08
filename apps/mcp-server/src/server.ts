/**
 * mcp-server — server.ts
 * Assembles the MCP server: registers all tools, resources, and prompts.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerConnectionTools } from "./tools/connection.tools.js";
import { registerDocumentTools } from "./tools/document.tools.js";
import { registerLayerTools } from "./tools/layer.tools.js";
import { registerShapeTools } from "./tools/shape.tools.js";
import { registerTextTools } from "./tools/text.tools.js";
import { registerAssetTools } from "./tools/asset.tools.js";
import { registerUITools } from "./tools/ui.tools.js";
import { registerInspectTools } from "./tools/inspect.tools.js";
import { registerWorkflowTools } from "./tools/workflow.tools.js";
import { registerTemplateTools } from "./tools/template.tools.js";
import { registerDeveloperTools } from "./tools/developer.tools.js";
import { registerCreativeTools } from "./tools/creative.tools.js";
import { registerGameDevTools } from "./tools/gamedev.tools.js";
import { registerPlatformTools } from "./tools/platform.tools.js";
import { registerHandoffTools } from "./tools/handoff.tools.js";
import { registerIntegrationTools } from "./tools/integration.tools.js";
import { registerQaTools } from "./tools/qa.tools.js";
import { registerAiTools } from "./tools/ai.tools.js";
import { registerResources } from "./resources/resources.js";
import { registerPrompts } from "./prompts/prompts.js";
import { logger } from "./utils/logger.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "remirdy-photoshop-mcp",
    version: "0.1.0",
  });

  // ─── Tools ────────────────────────────────────────────────────────────────────
  logger.info("Registering connection tools...");
  registerConnectionTools(server);

  logger.info("Registering document tools...");
  registerDocumentTools(server);

  logger.info("Registering layer tools...");
  registerLayerTools(server);

  logger.info("Registering shape tools...");
  registerShapeTools(server);

  logger.info("Registering text tools...");
  registerTextTools(server);

  logger.info("Registering asset tools...");
  registerAssetTools(server);

  logger.info("Registering UI component tools...");
  registerUITools(server);

  logger.info("Registering inspect/QA tools...");
  registerInspectTools(server);

  logger.info("Registering workflow tools...");
  registerWorkflowTools(server);

  logger.info("Registering template/mask/effect tools...");
  registerTemplateTools(server);

  logger.info("Registering developer tools...");
  registerDeveloperTools(server);

  logger.info("Registering creative tools...");
  registerCreativeTools(server);

  logger.info("Registering game dev tools...");
  registerGameDevTools(server);

  logger.info("Registering platform tools...");
  registerPlatformTools(server);

  logger.info("Registering handoff tools...");
  registerHandoffTools(server);

  logger.info("Registering integration tools...");
  registerIntegrationTools(server);

  logger.info("Registering QA verification tools...");
  registerQaTools(server);

  logger.info("Registering AI analysis tools...");
  registerAiTools(server);

  // ─── Resources ───────────────────────────────────────────────────────────────
  logger.info("Registering resources...");
  registerResources(server);

  // ─── Prompts ─────────────────────────────────────────────────────────────────
  logger.info("Registering prompts...");
  registerPrompts(server);

  logger.info("MCP server assembled successfully.");
  return server;
}
