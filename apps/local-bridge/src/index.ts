/**
 * local-bridge — index.ts
 * Entry point: starts HTTP + WebSocket bridge on localhost only.
 */
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createHttpApp } from "./httpServer.js";
import { createWebSocketServer } from "./websocketServer.js";
import { JobQueue } from "./jobQueue.js";
import { FileStore } from "./fileStore.js";
import type { PendingResolverMap } from "./types.js";
import { logger } from "./logger.js";

// ─── Config ──────────────────────────────────────────────────────────────────

// `pnpm dev:bridge` runs with cwd=apps/local-bridge, so also load the repo-root .env
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: [path.resolve(".env"), path.join(REPO_ROOT, ".env")] });

const PORT = parseInt(process.env.BRIDGE_PORT ?? "47831", 10);
const TOKEN = process.env.REMIRDY_BRIDGE_TOKEN ?? "dev_insecure_token";
const WORKSPACE = process.env.REMIRDY_WORKSPACE ?? "/tmp/remirdy-workspace";

if (TOKEN === "dev_insecure_token") {
  logger.warn("⚠️  Using insecure dev token. Set REMIRDY_BRIDGE_TOKEN in .env for production.");
}

// ─── Initialize services ─────────────────────────────────────────────────────

const fileStore = new FileStore(WORKSPACE);
const jobQueue = new JobQueue(WORKSPACE);
const pendingResolvers: PendingResolverMap = new Map();

// ─── WebSocket server (shares HTTP server) ────────────────────────────────────

let sendJobToPlugin!: (jobId: string, type: string, payload: unknown) => boolean;
let getConnectedPlugin!: ReturnType<typeof createWebSocketServer>["getConnectedPlugin"];

// ─── HTTP app ────────────────────────────────────────────────────────────────

// We create the WS server after the HTTP server is created, so we use a
// wrapper that will be bound after construction.
const sendJobWrapper = (jobId: string, type: string, payload: unknown): boolean =>
  sendJobToPlugin ? sendJobToPlugin(jobId, type, payload) : false;

const getPluginWrapper = () => getConnectedPlugin?.() ?? null;

const app = createHttpApp(
  TOKEN,
  jobQueue,
  pendingResolvers,
  getPluginWrapper,
  sendJobWrapper
);

// ─── Start ───────────────────────────────────────────────────────────────────

const server = http.createServer(app);

const wsResult = createWebSocketServer(server, TOKEN, jobQueue, pendingResolvers);
sendJobToPlugin = wsResult.sendJobToPlugin;
getConnectedPlugin = wsResult.getConnectedPlugin;

// Bind ONLY to localhost for security
server.listen(PORT, "127.0.0.1", () => {
  logger.info(`🌉 Remirdy Local Bridge running on http://127.0.0.1:${PORT}`);
  logger.info(`   WebSocket: ws://127.0.0.1:${PORT}/`);
  logger.info(`   Workspace: ${WORKSPACE}`);
  logger.info(`   Health:    http://127.0.0.1:${PORT}/health`);
});

server.on("error", (err) => {
  logger.error("Bridge server error", err);
  process.exit(1);
});

// Optional idle shutdown (set by the /photoshop skill CLI when it starts the bridge on demand).
// Panel polling doesn't count as activity; only submitted jobs do.
const IDLE_EXIT_MINUTES = parseFloat(process.env.BRIDGE_IDLE_EXIT_MINUTES ?? "0");
if (IDLE_EXIT_MINUTES > 0) {
  let lastJobAt = Date.now();
  server.on("request", (req: http.IncomingMessage) => {
    if (req.method === "POST" && req.url === "/jobs") lastJobAt = Date.now();
  });
  setInterval(() => {
    const idleMs = Date.now() - lastJobAt;
    if (pendingResolvers.size === 0 && idleMs > IDLE_EXIT_MINUTES * 60_000) {
      logger.info(`No jobs for ${IDLE_EXIT_MINUTES} min; shutting down bridge`);
      server.close();
      process.exit(0);
    }
  }, 30_000).unref();
  logger.info(`   Idle exit: after ${IDLE_EXIT_MINUTES} min without jobs`);
}

process.on("SIGINT", () => {
  logger.info("Shutting down bridge...");
  server.close();
  process.exit(0);
});
