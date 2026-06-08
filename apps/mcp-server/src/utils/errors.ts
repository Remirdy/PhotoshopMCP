/**
 * mcp-server — errors.ts
 * MCP-layer error formatting.
 */
import { ZodError } from "zod";

export function formatZodError(err: ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
