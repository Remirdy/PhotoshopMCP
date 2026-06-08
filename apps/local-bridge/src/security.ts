/**
 * local-bridge — security.ts
 * Token validation, path traversal protection, allowlist checks.
 */
import path from "path";
import type { Request, Response, NextFunction } from "express";
import { PathTraversalError } from "@remirdy/shared";
import { logger } from "./logger.js";

/**
 * Express middleware: validate the bearer token from Authorization header or
 * X-Bridge-Token header. Rejects requests without a valid token.
 */
export function tokenAuthMiddleware(token: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Health check is always public
    if (req.path === "/health") {
      next();
      return;
    }

    const authHeader = req.headers["authorization"];
    const tokenHeader = req.headers["x-bridge-token"];

    const provided =
      (typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null) ??
      (typeof tokenHeader === "string" ? tokenHeader : null);

    if (!provided || provided !== token) {
      logger.warn("Unauthorized request rejected", { path: req.path, ip: req.ip });
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

/**
 * Validate that a file path stays within one of the allowed base folders.
 * Throws PathTraversalError on violation.
 */
export function validatePath(
  filePath: string,
  allowedFolders: string[]
): string {
  const resolved = path.resolve(filePath);
  const safe = allowedFolders.some((base) => {
    const resolvedBase = path.resolve(base);
    return resolved.startsWith(resolvedBase + path.sep) || resolved === resolvedBase;
  });
  if (!safe) {
    throw new PathTraversalError(filePath);
  }
  return resolved;
}

/**
 * Allowlist of batchPlay action IDs considered safe for non-dangerous mode.
 */
export const SAFE_BATCHPLAY_IDS = new Set([
  "set",
  "make",
  "select",
  "move",
  "duplicate",
  "delete",
  "group",
  "ungroup",
  "rasterizeLayer",
  "flattenImage",
  "mergeVisible",
  "applyImageAdjustment",
  "addNoise",
  "gaussianBlur",
  "colorBalance",
  "hueSaturation",
  "curves",
  "levels",
  "brightnessContrast",
  "save",
  "saveAs",
  "export",
]);

/**
 * Validate a batchPlay descriptor is in the safe allowlist.
 */
export function validateBatchPlayDescriptor(
  descriptor: Record<string, unknown>,
  allowDangerous: boolean
): { valid: boolean; reason?: string } {
  if (allowDangerous) return { valid: true };

  const id = descriptor["_obj"] as string | undefined;
  if (!id) return { valid: false, reason: "Descriptor missing _obj field" };
  if (!SAFE_BATCHPLAY_IDS.has(id)) {
    return { valid: false, reason: `batchPlay action "${id}" is not in the safe allowlist. Pass allowDangerous: true to override.` };
  }
  return { valid: true };
}
