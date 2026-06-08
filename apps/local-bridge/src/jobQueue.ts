/**
 * local-bridge — jobQueue.ts
 * In-memory job queue with optional JSONL persistence.
 */
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { Job, JobResult, JobType, JobStatus } from "./types.js";
import { logger } from "./logger.js";

export class JobQueue {
  private jobs = new Map<string, Job>();
  private logPath: string;

  constructor(workspace: string) {
    const logsDir = path.join(workspace, ".remirdy");
    fs.mkdirSync(logsDir, { recursive: true });
    this.logPath = path.join(logsDir, "jobs.jsonl");
  }

  create(type: JobType, payload: unknown): Job {
    const job: Job = {
      id: `job_${nanoid(10)}`,
      type,
      payload,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(job.id, job);
    this.appendLog(job);
    logger.debug("Job created", { id: job.id, type });
    return job;
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  update(id: string, updates: Partial<Job>): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    Object.assign(job, updates);
    this.appendLog(job);
    return job;
  }

  markRunning(id: string): Job | undefined {
    return this.update(id, { status: "running", startedAt: new Date().toISOString() });
  }

  markDone(id: string, result: JobResult): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    const now = new Date();
    const durationMs = job.startedAt
      ? now.getTime() - new Date(job.startedAt).getTime()
      : 0;
    return this.update(id, {
      status: "done",
      completedAt: now.toISOString(),
      durationMs,
      result,
    });
  }

  markError(id: string, error: string): Job | undefined {
    return this.update(id, {
      status: "error",
      completedAt: new Date().toISOString(),
      error,
    });
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status !== "queued") return false;
    this.update(id, { status: "cancelled" });
    return true;
  }

  nextQueued(): Job | undefined {
    return Array.from(this.jobs.values()).find((job) => job.status === "queued");
  }

  markQueued(id: string): Job | undefined {
    return this.update(id, {
      status: "queued",
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
      error: undefined,
      result: undefined,
    });
  }

  markRunningAsError(message: string): Job[] {
    const failed: Job[] = [];
    for (const job of this.jobs.values()) {
      if (job.status === "running") {
        const updated = this.markError(job.id, message);
        if (updated) failed.push(updated);
      }
    }
    return failed;
  }

  recent(limit = 20): Job[] {
    const all = Array.from(this.jobs.values());
    return all.slice(-limit).reverse();
  }

  get queueSize(): number {
    return Array.from(this.jobs.values()).filter((j) => j.status === "queued").length;
  }

  private appendLog(job: Job): void {
    try {
      fs.appendFileSync(this.logPath, JSON.stringify(job) + "\n");
    } catch {
      // non-fatal
    }
  }
}
