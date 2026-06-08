/**
 * UXP Plugin — bridgeClient.js
 * Manages WebSocket connection to the local bridge with HTTP polling fallback.
 */
import { logger } from "./utils/logger.js";

const RECONNECT_DELAY_MS = 3000;
const RECONNECT_MAX_DELAY_MS = 30000;
const POLL_INTERVAL_MS = 2000;

export class BridgeClient {
  constructor(url, token, onJob, onStatusChange) {
    this.url = url;
    this.token = token;
    this.onJob = onJob;
    this.onStatusChange = onStatusChange;
    this.ws = null;
    this.connected = false;
    this.reconnectTimer = null;
    this.pollTimer = null;
    this.usePolling = false;
    this.reconnectAttempts = 0;
  }

  connect() {
    this._clearTimers();
    this._connectWebSocket();
  }

  disconnect() {
    this._clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._setConnected(false);
  }

  /**
   * Send a job result back to the bridge.
   */
  async sendResult(jobId, result) {
    if (this.connected && this.ws && this.ws.readyState === 1 /* OPEN */) {
      this.ws.send(JSON.stringify({ type: "jobResult", jobId, result }));
    } else {
      // HTTP fallback
      const httpUrl = this.url.replace(/^ws/, "http");
      await fetch(`${httpUrl}/jobs/${jobId}/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bridge-Token": this.token,
        },
        body: JSON.stringify(result),
      });
    }
  }

  /**
   * Send a status update to the bridge.
   */
  sendStatus(data) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ type: "statusUpdate", ...data }));
    }
  }

  _connectWebSocket() {
    try {
      const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.addEventListener("open", () => {
        logger.info("WebSocket connected to bridge");
        this._setConnected(true);
        this.usePolling = false;
        this.reconnectAttempts = 0;
        this._clearTimers();

        // Send handshake
        this.ws.send(JSON.stringify({
          type: "handshake",
          pluginVersion: "0.1.0",
          photoshopVersion: typeof app !== "undefined" ? app.version : "unknown",
          activeDocument: this._getActiveDocumentName(),
        }));
      });

      this.ws.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch (err) {
          logger.error("Failed to parse bridge message", err);
        }
      });

      this.ws.addEventListener("close", () => {
        logger.warn("WebSocket disconnected, scheduling reconnect");
        this._setConnected(false);
        this._scheduleReconnect();
      });

      this.ws.addEventListener("error", (err) => {
        logger.error("WebSocket error, falling back to HTTP polling", err);
        this._setConnected(false);
        this._startPolling();
      });
    } catch (err) {
      logger.error("Failed to create WebSocket", err);
      this._startPolling();
    }
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case "hello":
        logger.info("Bridge handshake received");
        break;
      case "job":
        logger.info(`Job received: ${msg.jobType}`, { jobId: msg.jobId });
        if (this.onJob) this.onJob(msg.jobId, msg.jobType, msg.payload);
        break;
      case "ping":
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
        }
        break;
      default:
        logger.debug(`Unknown message type: ${msg.type}`);
    }
  }

  _startPolling() {
    this.usePolling = true;
    this._clearTimers();
    this.pollTimer = setInterval(() => this._pollNextJob(), POLL_INTERVAL_MS);
    logger.info("HTTP polling mode active");
  }

  async _pollNextJob() {
    try {
      const httpUrl = this.url.replace(/^ws/, "http");
      const res = await fetch(`${httpUrl}/jobs/next`, {
        headers: { "X-Bridge-Token": this.token },
      });
      if (res.status === 204) return; // no job
      if (!res.ok) return;
      const job = await res.json();
      if (job && job.id && this.onJob) {
        this.onJob(job.id, job.type, job.payload);
      }
    } catch (err) {
      // bridge may not be running yet
    }
  }

  _scheduleReconnect() {
    this._clearTimers();
    this.reconnectAttempts += 1;
    const delay = Math.min(
      RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
      RECONNECT_MAX_DELAY_MS
    );
    this.reconnectTimer = setTimeout(() => {
      logger.info("Attempting WebSocket reconnect...");
      this._connectWebSocket();
    }, delay);
  }

  _clearTimers() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  _setConnected(connected) {
    this.connected = connected;
    if (this.onStatusChange) this.onStatusChange(connected);
  }

  _getActiveDocumentName() {
    try {
      return typeof app !== "undefined" && app.activeDocument
        ? app.activeDocument.title
        : null;
    } catch {
      return null;
    }
  }
}
