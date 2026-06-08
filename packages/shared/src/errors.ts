/**
 * @remirdy/shared — errors.ts
 * Shared error classes for Remirdy Photoshop MCP.
 */

export class RemirdyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "RemirdyError";
  }
}

export class PhotoshopNotConnectedError extends RemirdyError {
  constructor() {
    super(
      "Photoshop UXP plugin is not connected. Start Photoshop, open the Remirdy panel, and click Connect Bridge.",
      "PHOTOSHOP_NOT_CONNECTED"
    );
    this.name = "PhotoshopNotConnectedError";
  }
}

export class BridgeNotAvailableError extends RemirdyError {
  constructor(port: number) {
    super(
      `Local bridge is not running on port ${port}. Run: pnpm dev:bridge`,
      "BRIDGE_NOT_AVAILABLE",
      { port }
    );
    this.name = "BridgeNotAvailableError";
  }
}

export class JobTimeoutError extends RemirdyError {
  constructor(jobId: string, timeoutMs: number) {
    super(
      `Job ${jobId} timed out after ${timeoutMs}ms. Photoshop may be busy.`,
      "JOB_TIMEOUT",
      { jobId, timeoutMs }
    );
    this.name = "JobTimeoutError";
  }
}

export class ValidationError extends RemirdyError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class PathTraversalError extends RemirdyError {
  constructor(path: string) {
    super(
      `Path traversal detected: "${path}". Only paths within configured workspace are allowed.`,
      "PATH_TRAVERSAL",
      { path }
    );
    this.name = "PathTraversalError";
  }
}

export class SecurityError extends RemirdyError {
  constructor(message: string, details?: unknown) {
    super(message, "SECURITY_ERROR", details);
    this.name = "SecurityError";
  }
}

export class MockModeError extends RemirdyError {
  constructor(operation: string) {
    super(
      `Operation "${operation}" was performed in mock mode. Photoshop plugin not connected.`,
      "MOCK_MODE",
      { operation }
    );
    this.name = "MockModeError";
  }
}
