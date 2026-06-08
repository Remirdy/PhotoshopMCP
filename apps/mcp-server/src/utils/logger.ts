/**
 * mcp-server — logger.ts
 * Writes to stderr so it doesn't contaminate MCP stdio transport.
 */
const level = process.env.LOG_LEVEL ?? "info";
const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function shouldLog(l: string): boolean {
  return (LEVELS[l] ?? 1) >= (LEVELS[level] ?? 1);
}

function fmt(l: string, msg: string, data?: unknown): string {
  const ts = new Date().toISOString();
  const extra = data ? ` ${JSON.stringify(data)}` : "";
  return `[${ts}] [mcp] [${l.toUpperCase()}] ${msg}${extra}`;
}

export const logger = {
  debug: (msg: string, data?: unknown) => shouldLog("debug") && process.stderr.write(fmt("debug", msg, data) + "\n"),
  info:  (msg: string, data?: unknown) => shouldLog("info")  && process.stderr.write(fmt("info", msg, data) + "\n"),
  warn:  (msg: string, data?: unknown) => shouldLog("warn")  && process.stderr.write(fmt("warn", msg, data) + "\n"),
  error: (msg: string, data?: unknown) => shouldLog("error") && process.stderr.write(fmt("error", msg, data) + "\n"),
};
