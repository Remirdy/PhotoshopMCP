/**
 * local-bridge — httpServer.ts
 * Express HTTP API for the local bridge.
 */
import express from "express";
import cors from "cors";
import { tokenAuthMiddleware } from "./security.js";
import type { JobQueue } from "./jobQueue.js";
import type {
  ConnectedPlugin,
  PendingResolverMap,
} from "./types.js";
import type { JobResult, JobType } from "@remirdy/shared";
import { logger } from "./logger.js";

const JOB_TIMEOUT_MS = 60_000;
const MAX_JOB_TIMEOUT_MS = 5 * 60_000;

export function createHttpApp(
  token: string,
  jobQueue: JobQueue,
  pendingResolvers: PendingResolverMap,
  getConnectedPlugin: () => ConnectedPlugin | null,
  sendJobToPlugin: (jobId: string, type: string, payload: unknown) => boolean
): express.Express {
  const app = express();

  // ─── Middleware ──────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: ["http://localhost", "null"],
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(tokenAuthMiddleware(token));

  // ─── Health ──────────────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Photoshop Status ────────────────────────────────────────────────────────
  app.get("/photoshop/status", (_req, res) => {
    const plugin = getConnectedPlugin();
    res.json({
      connected: plugin !== null,
      pluginVersion: plugin?.pluginVersion ?? null,
      photoshopVersion: plugin?.photoshopVersion ?? null,
      activeDocument: plugin?.activeDocument ?? null,
      connectedAt: plugin?.connectedAt?.toISOString() ?? null,
    });
  });

  // ─── Bridge Status ───────────────────────────────────────────────────────────
  app.get("/bridge/status", (_req, res) => {
    const plugin = getConnectedPlugin();
    res.json({
      bridgeConnected: true,
      port: (res.socket as { localPort?: number })?.localPort ?? 47831,
      queueSize: jobQueue.queueSize,
      photoshopConnected: plugin !== null,
      pluginLastSeenAt: plugin?.lastSeen.toISOString() ?? null,
      pendingResults: pendingResolvers.size,
    });
  });

  // ─── Recent Jobs ─────────────────────────────────────────────────────────────
  app.get("/jobs/recent", (req, res) => {
    const parsedLimit = parseInt((req.query.limit as string) ?? "20", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;
    res.json(jobQueue.recent(limit));
  });

  // ─── Submit Job ──────────────────────────────────────────────────────────────
  app.post("/jobs", (req, res): void => {
    const body = req.body as { type?: string; payload?: unknown };
    if (!body.type) {
      res.status(400).json({ error: "Job type is required" });
      return;
    }

    const timeoutMs = getJobTimeoutMs(req.body);
    const job = jobQueue.create(body.type as JobType, body.payload ?? {});

    const plugin = getConnectedPlugin();
    if (!plugin) {
      // No plugin connected — return immediately as pending
      logger.warn("No plugin connected, job queued but cannot be dispatched", { jobId: job.id });
      res.status(202).json({
        jobId: job.id,
        status: "queued",
        message: "Photoshop plugin is not connected. Job queued.",
      });
      return;
    }

    // Dispatch to plugin and return a promise
    const dispatched = sendJobToPlugin(job.id, body.type, body.payload ?? {});
    if (!dispatched) {
      res.status(202).json({ jobId: job.id, status: "queued" });
      return;
    }
    jobQueue.markRunning(job.id);

    // Wait for result via pending resolvers
    const resultPromise = new Promise<JobResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingResolvers.delete(job.id);
        jobQueue.markError(job.id, "Timeout waiting for Photoshop response");
        reject(new Error(`Job ${job.id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      pendingResolvers.set(job.id, { resolve, reject, timeoutId });
    });

    resultPromise
      .then((result) => {
        res.json(result);
      })
      .catch((err: Error) => {
        res.status(504).json({
          ok: false,
          message: err.message,
          jobId: job.id,
          photoshopStatus: "error",
          data: null,
          warnings: [],
        });
      });
  });

  // ─── Poll Next Job (for HTTP polling fallback) ────────────────────────────────
  app.get("/jobs/next", (_req, res) => {
    // Returns the next queued job for plugins that poll instead of using WS
    const queued = jobQueue.nextQueued();
    if (!queued) {
      res.status(204).end();
      return;
    }
    jobQueue.markRunning(queued.id);
    res.json(queued);
  });

  // ─── Submit Job Result (HTTP polling fallback) ────────────────────────────────
  app.post("/jobs/:id/result", (req, res): void => {
    const { id } = req.params;
    const result = req.body as JobResult;

    const resolver = pendingResolvers.get(id);
    if (resolver) {
      clearTimeout(resolver.timeoutId);
      pendingResolvers.delete(id);
      resolver.resolve(result);
    }

    if (result?.ok) {
      jobQueue.markDone(id, result);
    } else {
      jobQueue.markError(id, result?.message ?? "Unknown error");
    }

    res.json({ ok: true, jobId: id });
  });

  // ─── Get Job ─────────────────────────────────────────────────────────────────
  app.get("/jobs/:id", (req, res): void => {
    const job = jobQueue.get(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(job);
  });

  return app;
}

function getJobTimeoutMs(body: unknown): number {
  const timeoutMs = (body as { timeoutMs?: unknown })?.timeoutMs;
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs)) return JOB_TIMEOUT_MS;
  return Math.min(Math.max(timeoutMs, 1_000), MAX_JOB_TIMEOUT_MS);
}
