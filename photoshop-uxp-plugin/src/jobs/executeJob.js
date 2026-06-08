/**
 * UXP Plugin — executeJob.js
 * Receives a job from the bridge, dispatches to the correct handler,
 * and returns a structured JobResult.
 */
import { JOB_HANDLERS } from "./jobHandlers.js";
import { logger } from "../utils/logger.js";
import { formatError } from "../utils/errors.js";

/**
 * Execute a job and return a structured JobResult.
 *
 * @param {string} jobId
 * @param {string} jobType
 * @param {object} payload
 * @returns {Promise<JobResult>}
 */
export async function executeJob(jobId, jobType, payload) {
  logger.info(`Executing job: ${jobType}`, { jobId });

  const handler = JOB_HANDLERS[jobType];
  if (!handler) {
    logger.warn(`No handler for job type: ${jobType}`);
    return {
      ok: false,
      message: `Unsupported job type: "${jobType}"`,
      data: null,
      warnings: [],
      jobId,
      photoshopStatus: "connected",
    };
  }

  try {
    const data = await handler(payload);
    logger.info(`Job ${jobId} (${jobType}) completed successfully`);
    return {
      ok: true,
      message: "Operation completed successfully.",
      data,
      warnings: [],
      jobId,
      photoshopStatus: "connected",
    };
  } catch (err) {
    const message = formatError(err);
    logger.error(`Job ${jobId} (${jobType}) failed: ${message}`);
    return {
      ok: false,
      message,
      data: null,
      warnings: [],
      jobId,
      photoshopStatus: "connected",
    };
  }
}
