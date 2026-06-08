/**
 * UXP Plugin — logger.js
 * Lightweight logger that writes to console (visible in UXP DevTools).
 */

const PREFIX = "[remirdy-uxp]";

export const logger = {
  debug: (msg, data) => console.debug(`${PREFIX} [DEBUG] ${msg}`, data ?? ""),
  info:  (msg, data) => console.info(`${PREFIX} [INFO]  ${msg}`, data ?? ""),
  warn:  (msg, data) => console.warn(`${PREFIX} [WARN]  ${msg}`, data ?? ""),
  error: (msg, data) => console.error(`${PREFIX} [ERROR] ${msg}`, data ?? ""),
};
