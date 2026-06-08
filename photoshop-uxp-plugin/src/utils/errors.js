/**
 * UXP Plugin — errors.js
 */

export class PluginError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = "PluginError";
    this.code = code;
    this.details = details;
  }
}

export function formatError(err) {
  if (err instanceof Error) return err.message;
  return String(err);
}
