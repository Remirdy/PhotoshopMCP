/**
 * mcp-server — paths.ts
 * Path helpers and workspace resolution.
 */
import path from "path";
import os from "os";

export const WORKSPACE =
  process.env.REMIRDY_WORKSPACE ?? path.join(os.homedir(), ".remirdy-workspace");

export function resolveWorkspacePath(...segments: string[]): string {
  return path.resolve(WORKSPACE, ...segments);
}

export function resolveExportPath(projectName: string): string {
  const safe = projectName.replace(/[^A-Za-z0-9_\-]/g, "_");
  return resolveWorkspacePath("exports", safe);
}
