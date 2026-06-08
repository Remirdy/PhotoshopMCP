/**
 * @remirdy/shared — errors.ts
 * Shared error classes for Remirdy Photoshop MCP.
 */
export class RemirdyError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "RemirdyError";
    }
}
export class PhotoshopNotConnectedError extends RemirdyError {
    constructor() {
        super("Photoshop UXP plugin is not connected. Start Photoshop, open the Remirdy panel, and click Connect Bridge.", "PHOTOSHOP_NOT_CONNECTED");
        this.name = "PhotoshopNotConnectedError";
    }
}
export class BridgeNotAvailableError extends RemirdyError {
    constructor(port) {
        super(`Local bridge is not running on port ${port}. Run: pnpm dev:bridge`, "BRIDGE_NOT_AVAILABLE", { port });
        this.name = "BridgeNotAvailableError";
    }
}
export class JobTimeoutError extends RemirdyError {
    constructor(jobId, timeoutMs) {
        super(`Job ${jobId} timed out after ${timeoutMs}ms. Photoshop may be busy.`, "JOB_TIMEOUT", { jobId, timeoutMs });
        this.name = "JobTimeoutError";
    }
}
export class ValidationError extends RemirdyError {
    constructor(message, details) {
        super(message, "VALIDATION_ERROR", details);
        this.name = "ValidationError";
    }
}
export class PathTraversalError extends RemirdyError {
    constructor(path) {
        super(`Path traversal detected: "${path}". Only paths within configured workspace are allowed.`, "PATH_TRAVERSAL", { path });
        this.name = "PathTraversalError";
    }
}
export class SecurityError extends RemirdyError {
    constructor(message, details) {
        super(message, "SECURITY_ERROR", details);
        this.name = "SecurityError";
    }
}
export class MockModeError extends RemirdyError {
    constructor(operation) {
        super(`Operation "${operation}" was performed in mock mode. Photoshop plugin not connected.`, "MOCK_MODE", { operation });
        this.name = "MockModeError";
    }
}
