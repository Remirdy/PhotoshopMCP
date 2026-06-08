/**
 * local-bridge — websocketServer.ts
 * WebSocket server for real-time communication with the UXP plugin.
 */
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage, Server } from "http";
import type { ConnectedPlugin, PendingResolverMap } from "./types.js";
import type { JobResult } from "@remirdy/shared";
import { JobQueue } from "./jobQueue.js";
import { logger } from "./logger.js";

const HEARTBEAT_INTERVAL_MS = 15_000;
const PLUGIN_STALE_MS = 45_000;

export function createWebSocketServer(
  server: Server,
  token: string,
  jobQueue: JobQueue,
  pendingResolvers: PendingResolverMap
): {
  wss: WebSocketServer;
  getConnectedPlugin: () => ConnectedPlugin | null;
  sendJobToPlugin: (jobId: string, type: string, payload: unknown) => boolean;
} {
  let connectedPlugin: ConnectedPlugin | null = null;
  const wss = new WebSocketServer({ server, path: "/" });
  const heartbeatTimer = setInterval(() => {
    if (!connectedPlugin) return;
    const ageMs = Date.now() - connectedPlugin.lastPongAt.getTime();
    if (ageMs > PLUGIN_STALE_MS) {
      logger.warn("UXP plugin heartbeat stale; closing WebSocket", { ageMs });
      connectedPlugin.ws.close(4000, "Heartbeat stale");
      return;
    }
    if (connectedPlugin.ws.readyState === WebSocket.OPEN) {
      connectedPlugin.ws.send(JSON.stringify({ type: "ping", timestamp: new Date().toISOString() }));
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => clearInterval(heartbeatTimer));

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    // Token validation via query param or header
    const url = new URL(req.url ?? "/", "http://localhost");
    const qToken = url.searchParams.get("token");
    const hToken = req.headers["x-bridge-token"] as string | undefined;

    if (qToken !== token && hToken !== token) {
      logger.warn("WS connection rejected: invalid token");
      ws.close(1008, "Unauthorized");
      return;
    }

    logger.info("UXP plugin connected via WebSocket");

    if (connectedPlugin && connectedPlugin.ws.readyState === WebSocket.OPEN) {
      logger.warn("Replacing existing UXP plugin WebSocket connection");
      connectedPlugin.ws.close(1012, "New plugin connection established");
    }

    connectedPlugin = {
      ws,
      pluginVersion: "unknown",
      photoshopVersion: "unknown",
      activeDocument: null,
      connectedAt: new Date(),
      lastSeen: new Date(),
      lastPongAt: new Date(),
    };

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
        if (connectedPlugin?.ws !== ws) {
          logger.warn("Ignoring message from stale plugin connection");
          return;
        }
        handlePluginMessage(msg, connectedPlugin, jobQueue, pendingResolvers);
      } catch (err) {
        logger.error("Failed to parse WS message", err);
      }
    });

    ws.on("close", () => {
      logger.info("UXP plugin disconnected");
      if (connectedPlugin?.ws === ws) {
        connectedPlugin = null;
        rejectPendingJobs(
          pendingResolvers,
          jobQueue,
          "Photoshop plugin disconnected before returning a result"
        );
      }
    });

    ws.on("error", (err) => {
      logger.error("WebSocket error", err);
    });

    // Send a hello handshake
    ws.send(JSON.stringify({ type: "hello", version: "0.1.0" }));
  });

  function sendJobToPlugin(jobId: string, type: string, payload: unknown): boolean {
    if (!connectedPlugin || connectedPlugin.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      connectedPlugin.ws.send(JSON.stringify({ type: "job", jobId, jobType: type, payload }));
      return true;
    } catch (err) {
      logger.error("Failed to send job to plugin", err);
      return false;
    }
  }

  return {
    wss,
    getConnectedPlugin: () => connectedPlugin,
    sendJobToPlugin,
  };
}

function handlePluginMessage(
  msg: Record<string, unknown>,
  plugin: ConnectedPlugin,
  jobQueue: JobQueue,
  pendingResolvers: PendingResolverMap
): void {
  plugin.lastSeen = new Date();

  switch (msg.type) {
    case "handshake": {
      plugin.pluginVersion = (msg.pluginVersion as string) ?? "unknown";
      plugin.photoshopVersion = (msg.photoshopVersion as string) ?? "unknown";
      plugin.activeDocument = (msg.activeDocument as string | null) ?? null;
      logger.info("Plugin handshake received", {
        pluginVersion: plugin.pluginVersion,
        photoshopVersion: plugin.photoshopVersion,
      });
      break;
    }
    case "jobResult": {
      const jobId = msg.jobId as string;
      const result = msg.result as JobResult;
      logger.debug("Job result received", { jobId, ok: result?.ok });

      // Resolve pending promise
      const resolver = pendingResolvers.get(jobId);
      if (resolver) {
        clearTimeout(resolver.timeoutId);
        pendingResolvers.delete(jobId);
        resolver.resolve(result);
      }

      // Update job queue
      if (result?.ok) {
        jobQueue.markDone(jobId, result);
      } else {
        jobQueue.markError(jobId, result?.message ?? "Unknown error");
      }
      break;
    }
    case "statusUpdate": {
      plugin.activeDocument = (msg.activeDocument as string | null) ?? null;
      logger.debug("Plugin status update", { activeDocument: plugin.activeDocument });
      break;
    }
    case "pong": {
      plugin.lastPongAt = new Date();
      logger.debug("Pong received from plugin");
      break;
    }
    default: {
      logger.warn("Unknown message type from plugin", { type: msg.type });
    }
  }
}

function rejectPendingJobs(
  pendingResolvers: PendingResolverMap,
  jobQueue: JobQueue,
  message: string
): void {
  for (const [jobId, resolver] of pendingResolvers.entries()) {
    clearTimeout(resolver.timeoutId);
    resolver.reject(new Error(message));
    pendingResolvers.delete(jobId);
    jobQueue.markError(jobId, message);
  }
  jobQueue.markRunningAsError(message);
}
