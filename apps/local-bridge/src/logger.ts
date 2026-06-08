/**
 * local-bridge — logger.ts
 */
const level = process.env.LOG_LEVEL ?? "info";
const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function shouldLog(l: string): boolean {
  return (LEVELS[l] ?? 1) >= (LEVELS[level] ?? 1);
}

function fmt(l: string, msg: string, data?: unknown): string {
  const ts = new Date().toISOString();
  const extra = data ? ` ${JSON.stringify(data)}` : "";
  return `[${ts}] [bridge] [${l.toUpperCase()}] ${msg}${extra}`;
}

export const logger = {
  debug: (msg: string, data?: unknown) => shouldLog("debug") && console.debug(fmt("debug", msg, data)),
  info:  (msg: string, data?: unknown) => shouldLog("info")  && console.info(fmt("info", msg, data)),
  warn:  (msg: string, data?: unknown) => shouldLog("warn")  && console.warn(fmt("warn", msg, data)),
  error: (msg: string, data?: unknown) => shouldLog("error") && console.error(fmt("error", msg, data)),
};
