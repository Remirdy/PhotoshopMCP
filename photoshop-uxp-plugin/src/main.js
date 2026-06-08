/**
 * UXP Plugin — main.js
 * Panel entry point: manages UI, bridge connection, job execution.
 */
import { BridgeClient } from "./bridgeClient.js";
import { logger } from "./utils/logger.js";

// Lazy-load executeJob so photoshop/* imports don't block panel startup
let _executeJob = null;
async function getExecuteJob() {
  if (!_executeJob) {
    const mod = await import("./jobs/executeJob.js");
    _executeJob = mod.executeJob;
  }
  return _executeJob;
}

// ─── State ────────────────────────────────────────────────────────────────────

let bridgeClient = null;
let lastJob = null;

// ─── UI Elements ──────────────────────────────────────────────────────────────

const statusBadge    = document.getElementById("status-badge");
const docName        = document.getElementById("doc-name");
const btnConnect     = document.getElementById("btn-connect");
const btnRefresh     = document.getElementById("btn-refresh");
const btnRunLast     = document.getElementById("btn-run-last");
const btnClearLog    = document.getElementById("btn-clear-log");
const jobLog         = document.getElementById("job-log");
const bridgeUrlInput = document.getElementById("bridge-url-input");
const bridgeTokenInput = document.getElementById("bridge-token-input");

// ─── Bridge Token ─────────────────────────────────────────────────────────────

function getToken() {
  return bridgeTokenInput.value.trim() || "dev_insecure_token";
}

function getBridgeUrl() {
  return bridgeUrlInput.value.trim() || "ws://127.0.0.1:47831";
}

// ─── Connection ───────────────────────────────────────────────────────────────

function setConnected(connected) {
  if (connected) {
    statusBadge.className = "status-badge connected";
    statusBadge.textContent = "●  Connected";
    btnConnect.textContent = "Disconnect";
  } else {
    statusBadge.className = "status-badge disconnected";
    statusBadge.textContent = "●  Disconnected";
    btnConnect.textContent = "Connect Bridge";
    btnRunLast.disabled = true;
  }
  refreshDocInfo();
}

function setConnecting() {
  statusBadge.className = "status-badge connecting";
  statusBadge.textContent = "●  Connecting...";
}

// ─── Doc Info ─────────────────────────────────────────────────────────────────

function refreshDocInfo() {
  try {
    const doc = typeof app !== "undefined" && app.activeDocument ? app.activeDocument : null;
    docName.textContent = doc ? doc.title : "—";

    if (bridgeClient?.connected && doc) {
      bridgeClient.sendStatus({ activeDocument: doc.title });
    }
  } catch {
    docName.textContent = "—";
  }
}

// ─── Job Execution ────────────────────────────────────────────────────────────

async function handleJob(jobId, jobType, payload) {
  lastJob = { jobId, jobType, payload };
  btnRunLast.disabled = false;

  appendLog(`→ ${jobType}`, "info");

  const executeJob = await getExecuteJob();
  const result = await executeJob(jobId, jobType, payload);
  await bridgeClient.sendResult(jobId, result);

  if (result.ok) {
    appendLog(`✓ ${jobType} done`, "ok");
  } else {
    appendLog(`✗ ${jobType}: ${result.message}`, "error");
  }
}

// ─── Logging ──────────────────────────────────────────────────────────────────

function appendLog(message, type = "info") {
  const time = new Date().toTimeString().slice(0, 8);
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-${type}">${escapeHtml(message)}</span>`;
  jobLog.appendChild(entry);
  jobLog.scrollTop = jobLog.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

btnConnect.addEventListener("click", () => {
  if (bridgeClient?.connected) {
    bridgeClient.disconnect();
    bridgeClient = null;
    setConnected(false);
    appendLog("Disconnected from bridge", "warn");
  } else {
    setConnecting();
    appendLog(`Connecting to ${getBridgeUrl()}...`, "info");

    bridgeClient = new BridgeClient(
      getBridgeUrl(),
      getToken(),
      handleJob,
      setConnected
    );
    bridgeClient.connect();
  }
});

btnRefresh.addEventListener("click", () => {
  refreshDocInfo();
  appendLog("Status refreshed", "info");
});

btnRunLast.addEventListener("click", async () => {
  if (!lastJob) return;
  appendLog(`Re-running: ${lastJob.jobType}`, "info");
  await handleJob(lastJob.jobId + "_retry", lastJob.jobType, lastJob.payload);
});

btnClearLog.addEventListener("click", () => {
  jobLog.innerHTML = "";
});

// ─── Auto-connect on load ─────────────────────────────────────────────────────

appendLog("Remirdy Photoshop MCP panel loaded", "info");
appendLog("Click 'Connect Bridge' to start", "info");

// Try auto-connect if token is present in storage
// (UXP doesn't support localStorage, but we can try env-based default)
setTimeout(() => {
  if (bridgeTokenInput.value.trim()) {
    btnConnect.click();
  }
}, 500);

// Refresh doc info every 5 seconds
setInterval(refreshDocInfo, 5000);
