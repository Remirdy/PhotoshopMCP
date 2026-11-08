var ws = null;
var connected = false;
var pollTimer = null;
var lastJob = null;
var jobRunning = false;
var pollFailures = 0;
var reconnectTimer = null;
var activeConnection = null;

var POLL_INTERVAL_MS = 400;
var POLL_IDLE_INTERVAL_MS = 2000;
var POLL_IDLE_AFTER_MS = 60000;
var POLL_RETRY_MAX_MS = 5000;
var lastJobAt = 0;

// Session lock: one long executeAsModal scope that runs incoming jobs, so the
// user stays locked out for the whole build instead of only during each job.
var SESSION_IDLE_DEFAULT_MS = 60000;
var SESSION_IDLE_MAX_MS = 30 * 60000;
var session = null;
// Document the last pinned job targeted, shown in the panel
var lastTarget = null;

var statusBadge = document.getElementById("status-badge");
var activityEl = document.getElementById("activity");
var docNameEl = document.getElementById("doc-name");
var targetNameEl = document.getElementById("target-name");
var btnConnect = document.getElementById("btn-connect");
var btnRefresh = document.getElementById("btn-refresh");
var btnRunLast = document.getElementById("btn-run-last");
var btnClearLog = document.getElementById("btn-clear-log");
var jobLog = document.getElementById("job-log");
var urlInput = document.getElementById("bridge-url-input");
var tokenInput = document.getElementById("bridge-token-input");

function getUrl() {
  return urlInput.value.trim() || "http://127.0.0.1:47831";
}

function getToken() {
  return tokenInput.value.trim() || "dev_insecure_token";
}

// Remember URL/token between Photoshop sessions
function loadSettings() {
  try {
    var savedUrl = localStorage.getItem("remirdy.bridgeUrl");
    var savedToken = localStorage.getItem("remirdy.bridgeToken");
    if (savedUrl) urlInput.value = savedUrl;
    if (savedToken) tokenInput.value = savedToken;
    return !!savedToken;
  } catch (e) {
    return false;
  }
}

function saveSettings() {
  try {
    localStorage.setItem("remirdy.bridgeUrl", urlInput.value.trim());
    localStorage.setItem("remirdy.bridgeToken", tokenInput.value.trim());
  } catch (e) {}
}

function log(msg, type) {
  var t = new Date().toTimeString().slice(0, 8);
  var entry = document.createElement("div");
  entry.className = "log-entry";
  var safe = String(msg).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  entry.innerHTML = '<span class="log-time">' + t + '</span><span class="log-' + (type || "info") + '">' + safe + '</span>';
  jobLog.appendChild(entry);
  jobLog.scrollTop = jobLog.scrollHeight;
}

function setStatus(state) {
  connected = state === "connected";
  statusBadge.className = "status-badge " + state;
  if (state === "connected") statusBadge.textContent = "Connected";
  else if (state === "connecting") statusBadge.textContent = "Connecting...";
  else statusBadge.textContent = "Disconnected";
  btnConnect.textContent = state === "disconnected" ? "Connect Bridge" : "Disconnect";
  if (!connected) btnRunLast.disabled = true;
}

// "idle", "working" (one job) or "session" (locked for a build)
function setActivity(state, detail) {
  activityEl.className = "activity " + state;
  if (state === "session") activityEl.textContent = "Claude session: hands off" + (detail ? " (" + detail + ")" : "") + ". Cancel in Photoshop's progress dialog to stop.";
  else if (state === "working") activityEl.textContent = "Claude working: " + (detail || "job");
  else activityEl.textContent = "Idle";
}

function refreshDoc() {
  var front = null;
  try {
    front = activeDocumentOrNull(require("photoshop").app);
  } catch (e) {}
  docNameEl.textContent = front ? front.title : "-";
  targetNameEl.textContent = lastTarget ? lastTarget.title || String(lastTarget.id) : "-";
  // Highlight when Claude's target isn't the document in front
  targetNameEl.className = "doc-name" + (lastTarget && front && front.id !== lastTarget.id ? " mismatch" : "");
}

function connect(retrying) {
  var connection = { url: getUrl(), token: getToken() };
  activeConnection = connection;
  if (pollTimer) clearTimeout(pollTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) {
    try { ws.close(); } catch (e) {}
    ws = null;
  }
  reconnectTimer = null;
  setStatus("connecting");
  if (!retrying) {
    saveSettings();
    log("Checking bridge over HTTP: " + getUrl(), "info");
  }

  fetch(connection.url + "/health")
    .then(function (res) {
      if (activeConnection !== connection) return;
      if (!res.ok) throw new Error("Health returned " + res.status);
      setStatus("connected");
      log("Bridge HTTP health OK", "ok");
      startPolling();
    })
    .catch(function (e) {
      if (activeConnection !== connection) return;
      if (!retrying) log("Bridge not reachable (" + e.message + "). Retrying every 3s until it starts.", "warn");
      setStatus("connecting");
      reconnectTimer = setTimeout(function () {
        if (activeConnection === connection) connect(true);
      }, 3000);
    });
}

function startPolling() {
  if (pollTimer) clearTimeout(pollTimer);
  pollFailures = 0;
  pollNextJob();
}

function schedulePoll(delayMs) {
  if (!connected) return;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(pollNextJob, delayMs);
}

// Resolves to the next queued job, or null when the queue is empty
function fetchNextJob(connection) {
  return fetch(connection.url + "/jobs/next", {
    headers: { "X-Bridge-Token": connection.token }
  }).then(async function (res) {
    if (res.status === 204) return null;
    if (activeConnection !== connection && !res.ok) return null;
    if (res.status === 401) {
      var authErr = new Error("Unauthorized: token does not match bridge");
      authErr.fatal = true;
      throw authErr;
    }
    if (!res.ok) throw new Error("Polling returned " + res.status);
    var job = await res.json();
    if (activeConnection !== connection) {
      await discardJob(job, connection);
      return null;
    }
    return job;
  });
}

function discardJob(job, connection) {
  return sendResult(job.id, {
    ok: false,
    message: "Job was not executed because its panel connection or session ended.",
    data: null,
    warnings: [],
    jobId: job.id,
    photoshopStatus: activeConnection === connection ? "connected" : "disconnected"
  }, connection);
}

// Poll one job at a time: Photoshop rejects overlapping executeAsModal calls,
// so the next poll is only scheduled after the current job has finished.
// While a session is open, its own loop polls instead.
function pollNextJob() {
  pollTimer = null;
  if (!connected || jobRunning || session) return;
  var connection = activeConnection;
  if (!connection) return;
  fetchNextJob(connection)
    .then(function (job) {
      if (activeConnection !== connection) {
        if (job) return discardJob(job, connection);
        return;
      }
      if (pollFailures > 0) log("Bridge reachable again", "ok");
      pollFailures = 0;
      setStatus("connected");
      if (!job) {
        // Poll quickly while Claude is working, slowly once it's been quiet for a minute
        schedulePoll(Date.now() - lastJobAt > POLL_IDLE_AFTER_MS ? POLL_IDLE_INTERVAL_MS : POLL_INTERVAL_MS);
        return;
      }
      lastJobAt = Date.now();
      log("Job received: " + job.type, "info");
      lastJob = { jobId: job.id, jobType: job.type, payload: job.payload };
      btnRunLast.disabled = false;
      jobRunning = true;
      handleJob(job.id, job.type, job.payload, connection).then(function () {
        jobRunning = false;
        schedulePoll(0);
      });
    })
    .catch(function (e) {
      if (activeConnection !== connection) return;
      if (e.fatal) {
        log(e.message, "error");
        disconnect();
        return;
      }
      pollFailures++;
      if (pollFailures === 1) log("Bridge polling failed: " + e.message + " (retrying)", "warn");
      // Keep retrying with backoff so a bridge restart doesn't need a manual reconnect
      schedulePoll(Math.min(POLL_INTERVAL_MS * Math.pow(2, pollFailures), POLL_RETRY_MAX_MS));
    });
}

function connectWebSocketUnused() {
  var wsUrl = getUrl().replace(/^http/, "ws") + "?token=" + encodeURIComponent(getToken());
  log("Opening WebSocket: " + wsUrl, "info");

  try {
    ws = new WebSocket(wsUrl);
  } catch (e) {
    log("WebSocket create failed: " + e.message, "error");
    setStatus("disconnected");
    return;
  }

  ws.onopen = function () {
    setStatus("connected");
    log("Connected to bridge", "ok");
    ws.send(JSON.stringify({
      type: "handshake",
      pluginVersion: "0.1.0",
      photoshopVersion: typeof app !== "undefined" && app.version ? app.version : "unknown",
      activeDocument: null
    }));
  };

  ws.onmessage = function (event) {
    try {
      var msg = JSON.parse(event.data);
      if (msg.type === "hello") {
        log("Bridge handshake OK", "ok");
      } else if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
      } else if (msg.type === "job") {
        log("Job received: " + msg.jobType, "info");
        lastJob = msg;
        btnRunLast.disabled = false;
        handleJob(msg.jobId, msg.jobType, msg.payload);
      }
    } catch (e) {
      log("Message parse error: " + e.message, "error");
    }
  };

  ws.onerror = function () {
    log("WebSocket error. Check token and manifest network permission.", "error");
    setStatus("disconnected");
  };

  ws.onclose = function (event) {
    var closeInfo = event ? " code=" + event.code + (event.reason ? " reason=" + event.reason : "") : "";
    log("WebSocket closed." + closeInfo, "warn");
    setStatus("disconnected");
    ws = null;
  };
}

function disconnect() {
  activeConnection = null;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try { ws.close(); } catch (e) {}
    ws = null;
  }
  setStatus("disconnected");
  log("Disconnected", "warn");
}

function sendResult(jobId, result, connection) {
  if (!connection && ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: "jobResult", jobId: jobId, result: result }));
    return;
  }
  connection = connection || activeConnection || { url: getUrl(), token: getToken() };
  return fetch(connection.url + "/jobs/" + encodeURIComponent(jobId) + "/result", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bridge-Token": connection.token
    },
    body: JSON.stringify(result)
  }).then(function (res) {
    if (!res.ok) throw new Error("Bridge returned " + res.status);
  }).catch(function (e) {
    log("Result send failed: " + e.message, "error");
  });
}

async function handleJob(jobId, jobType, payload, connection) {
  connection = connection || activeConnection || { url: getUrl(), token: getToken() };
  payload = payload || {};
  if (payload.documentId !== undefined && payload.documentId !== null) {
    lastTarget = { id: payload.documentId, title: payload.documentTitle };
    refreshDoc();
  }
  if (!session) setActivity("working", payload.historyName || jobType);
  var result;
  try {
    result = await executeJobLocal(jobId, jobType, payload);
    log("Done: " + jobType, result.ok ? "ok" : "error");
  } catch (e) {
    var errMsg = e ? (e.message || e.description || (typeof e === "string" ? e : JSON.stringify(e))) : "Unknown error";
    log("Job failed: " + errMsg, "error");
    result = { ok: false, message: String(errMsg), data: null, warnings: [], jobId: jobId, photoshopStatus: "connected" };
  }
  // Tells the CLI whether this job ran inside a session lock
  result.session = !!session;
  await sendResult(jobId, result, connection);
  if (session) setActivity("session", session.label);
  else setActivity("idle");
}

function ok(jobId, data, message) {
  return { ok: true, message: message || "Operation completed successfully.", data: data || null, warnings: [], jobId: jobId, photoshopStatus: "connected" };
}

async function executeJobLocal(jobId, jobType, payload) {
  if (jobType === "ping") return ok(jobId, { pong: true }, "pong");

  var ps = require("photoshop");
  var app = ps.app;
  var action = ps.action || require("photoshop/action");
  var batchPlay = action.batchPlay;
  var executeAsModal = (ps.core && ps.core.executeAsModal) || action.executeAsModal;
  if (!executeAsModal) throw new Error("executeAsModal unavailable in this Photoshop UXP context");

  // General-purpose editing jobs (used by the Claude /photoshop skill)
  if (jobType === "runScript") return ok(jobId, await runScript(payload));
  if (jobType === "batchPlay") return ok(jobId, await runBatchPlay(payload));
  if (jobType === "getDocumentState") return ok(jobId, await getDocumentState(payload));
  if (jobType === "exportPreview") return ok(jobId, await exportPreview(payload));
  if (jobType === "beginSession") return ok(jobId, await beginSession(payload), "Session started");
  if (jobType === "endSession") {
    var wasOpen = !!session;
    if (session) session.ending = true;
    return ok(jobId, { ended: wasOpen }, wasOpen ? "Session ending" : "No session was open");
  }

  // The jobs below open their own executeAsModal, which can't run inside a session
  if (session) throw new Error(jobType + " can't run inside a session. Run `ps.mjs session end` first.");

  // placeAsset needs its own executeAsModal (cannot nest placeEvent inside another modal)
  if (jobType === "placeAsset") {
    var p = payload;
    if (!p.path) throw new Error("No file path provided for placeAsset");
    var result = await executeAsModal(async function() {
      var placed = false;
      // Try placeEvent first
      try {
        await batchPlay([{
          _obj: "placeEvent",
          null: { _path: p.path, _kind: "local" },
          linked: false,
          freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" }
        }], { synchronousExecution: true });
        placed = true;
      } catch (e1) {
        log("placeEvent err: " + (e1.message || e1.description || JSON.stringify(e1)), "warn");
      }
      // Fallback: open → copy → close → paste
      if (!placed) {
        var targetDocId = app.activeDocument ? app.activeDocument.id : null;
        await batchPlay([{ _obj: "open", null: { _path: p.path, _kind: "local" } }], { synchronousExecution: true });
        await batchPlay([{ _obj: "selectAll" }], { synchronousExecution: true });
        await batchPlay([{ _obj: "copyEvent", copyHint: "pixels" }], { synchronousExecution: true });
        await batchPlay([{ _obj: "close", saving: { _enum: "yesNo", _value: "no" } }], { synchronousExecution: true });
        if (targetDocId) {
          await batchPlay([{ _obj: "select", _target: [{ _ref: "document", _id: targetDocId }] }], { synchronousExecution: true });
        }
        await batchPlay([{ _obj: "paste", antiAlias: { _enum: "antiAliasType", _value: "antiAliasNone" } }], { synchronousExecution: true });
        placed = true;
      }
      // Scale
      var sx = p.scaleX || p.scale || 100;
      var sy = p.scaleY || p.scale || 100;
      if (sx !== 100 || sy !== 100) {
        await batchPlay([{
          _obj: "transform",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
          offset: { _obj: "offset", horizontal: { _unit: "pixelsUnit", _value: 0 }, vertical: { _unit: "pixelsUnit", _value: 0 } },
          width: { _unit: "percentUnit", _value: sx },
          height: { _unit: "percentUnit", _value: sy },
          interfaceIconFrameDimmed: false
        }], { synchronousExecution: true });
      }
      // Rename
      if (p.layerName) {
        await batchPlay([{
          _obj: "set",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _obj: "layer", name: p.layerName }
        }], { synchronousExecution: true });
      }
      return { layerName: p.layerName || "Placed Asset", path: p.path };
    }, { commandName: "Place Asset" });
    return ok(jobId, result);
  }

  function hexToRgb(hex) {
    var clean = String(hex || "#FFFFFF").replace("#", "");
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function colorDesc(hex) {
    var rgb = hexToRgb(hex);
    return { _obj: "RGBColor", red: rgb.r, green: rgb.g, blue: rgb.b };
  }

  async function makeRect(p) {
    await batchPlay([{
      _obj: "make",
      _target: [{ _ref: "contentLayer" }],
      using: {
        _obj: "contentLayer",
        name: p.name,
        type: { _obj: "solidColorLayer", color: colorDesc(p.fill) },
        shape: {
          _obj: "rectangle",
          top: { _unit: "pixelsUnit", _value: p.y },
          left: { _unit: "pixelsUnit", _value: p.x },
          bottom: { _unit: "pixelsUnit", _value: p.y + p.height },
          right: { _unit: "pixelsUnit", _value: p.x + p.width },
          topLeftCorner: { _unit: "pixelsUnit", _value: p.radius || 0 },
          topRightCorner: { _unit: "pixelsUnit", _value: p.radius || 0 },
          bottomLeftCorner: { _unit: "pixelsUnit", _value: p.radius || 0 },
          bottomRightCorner: { _unit: "pixelsUnit", _value: p.radius || 0 }
        }
      }
    }], { synchronousExecution: true });
    return { name: p.name };
  }

  async function makeCircle(p) {
    await batchPlay([{
      _obj: "make",
      _target: [{ _ref: "contentLayer" }],
      using: {
        _obj: "contentLayer",
        name: p.name,
        type: { _obj: "solidColorLayer", color: colorDesc(p.fill) },
        shape: {
          _obj: "ellipse",
          top: { _unit: "pixelsUnit", _value: p.y },
          left: { _unit: "pixelsUnit", _value: p.x },
          bottom: { _unit: "pixelsUnit", _value: p.y + p.diameter },
          right: { _unit: "pixelsUnit", _value: p.x + p.diameter }
        }
      }
    }], { synchronousExecution: true });
    return { name: p.name };
  }

  async function makeText(p) {
    await batchPlay([{
      _obj: "make",
      _target: [{ _ref: "textLayer" }],
      using: {
        _obj: "textLayer",
        name: p.name,
        textKey: p.text || "",
        textClickPoint: {
          _obj: "point",
          horizontal: { _unit: "pixelsUnit", _value: p.x },
          vertical: { _unit: "pixelsUnit", _value: p.y }
        },
        textStyleRange: [{
          _obj: "textStyleRange",
          from: 0,
          to: String(p.text || "").length,
          textStyle: {
            _obj: "textStyle",
            size: { _unit: "pixelsUnit", _value: p.fontSize || 32 },
            color: colorDesc(p.color || "#FFFFFF")
          }
        }]
      }
    }], { synchronousExecution: true });
    return { name: p.name };
  }

  async function saveDoc(p) {
    var doc = app.activeDocument;
    if (!doc) throw new Error("No active document to save");
    if (!p.path) throw new Error("saveDocument requires an absolute output path");
    var savePath = p.path;
    // Try UXP storage API first (recommended for UXP plugins)
    try {
      var uxp = require("uxp");
      var fs = uxp.storage.localFileSystem;
      var file = await fs.getEntryWithUrl("file:" + savePath);
      await doc.saveAs.psd(file, { maximizeCompatibility: true }, true);
      return { saved: true, path: savePath };
    } catch (uxpErr) {
      // Fallback: batchPlay save descriptor without documentID
      await batchPlay([{
        _obj: "save",
        as: { _obj: "photoshop35Format", maximizeCompatibility: true },
        in: { _path: savePath, _kind: "local" },
        copy: false,
        lowerCase: true
      }], { synchronousExecution: true });
      return { saved: true, path: savePath };
    }
  }

  async function placeAsset(p) {
    if (!p.path) throw new Error("placeAsset requires path");
    await batchPlay([{
      _obj: "placeEvent",
      null: { _path: p.path, _kind: "local" },
      freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
      offset: {
        _obj: "offset",
        horizontal: { _unit: "pixelsUnit", _value: p.x || 0 },
        vertical: { _unit: "pixelsUnit", _value: p.y || 0 }
      },
      width: { _unit: "percentUnit", _value: p.scaleX || p.scale || 100 },
      height: { _unit: "percentUnit", _value: p.scaleY || p.scale || 100 }
    }], { synchronousExecution: true });
    return { placed: true, path: p.path };
  }

  return executeAsModal(async function () {
    if (jobType === "createDocument") {
      var w = payload.width || 1290;
      var h = payload.height || 2796;
      var res = payload.resolution || 72;
      var docName = payload.name || "KnitFlow";
      // Use UXP DOM API for reliable document creation
      var newDoc = await app.documents.add({
        width: w,
        height: h,
        resolution: res,
        name: docName,
        mode: "RGBColorMode",
        fill: "transparent"
      });
      // Fill background color if specified
      if (payload.backgroundColor && payload.backgroundColor !== "#FFFFFF") {
        var rgb = hexToRgb(payload.backgroundColor);
        await batchPlay([{
          _obj: "set",
          _target: [{ _ref: "color", _property: "foregroundColor" }],
          to: { _obj: "RGBColor", red: rgb.r, green: rgb.g, blue: rgb.b }
        }], { synchronousExecution: true });
        await batchPlay([{ _obj: "fill", using: { _enum: "fillContents", _value: "foregroundColor" }, opacity: { _unit: "percentUnit", _value: 100 } }], { synchronousExecution: true });
      }
      return ok(jobId, { name: newDoc ? newDoc.title : docName });
    }

    if (jobType === "inspectDocument") {
      var doc = app.activeDocument;
      return ok(jobId, doc ? { name: doc.title, width: doc.width, height: doc.height } : { error: "No active document" });
    }

    if (jobType === "createLayerTree") return ok(jobId, { note: "Groups skipped in fallback mode", groups: payload.groups || [] });
    if (jobType === "createRectangleShape") return ok(jobId, await makeRect(payload));
    if (jobType === "createCircleShape") return ok(jobId, await makeCircle(payload));
    if (jobType === "createTextLayer") return ok(jobId, await makeText(payload));
    if (jobType === "saveDocument") return ok(jobId, await saveDoc(payload));

    return { ok: false, message: "Unsupported fallback job type: " + jobType, data: null, warnings: [], jobId: jobId, photoshopStatus: "connected" };
  }, { commandName: "Remirdy fallback " + jobType });
}

// ─── General-purpose editing jobs ─────────────────────────────────────────────

// Convert script return values to JSON-safe data. Photoshop DOM objects
// (Layer, Document, ...) expose a typeName and are reduced to a short summary.
function toPlain(value) {
  if (value === undefined) return null;
  var seen = [];
  try {
    return JSON.parse(JSON.stringify(value, function (key, v) {
      if (v && typeof v === "object") {
        if (typeof v.typeName === "string") {
          var summary = { typeName: v.typeName };
          try { summary.id = v.id; } catch (e) {}
          try { summary.name = v.name !== undefined ? v.name : v.title; } catch (e) {}
          return summary;
        }
        if (seen.indexOf(v) !== -1) return "[Circular]";
        seen.push(v);
      }
      return v;
    }));
  } catch (e) {
    return String(value);
  }
}

function formatLogArg(arg) {
  if (typeof arg === "string") return arg;
  try { return JSON.stringify(toPlain(arg)); } catch (e) { return String(arg); }
}

function errorMessage(e) {
  if (!e) return "Unknown error";
  return e.message || e.description || (typeof e === "string" ? e : JSON.stringify(e));
}

function activeDocumentOrNull(app) {
  try { return app.activeDocument || null; } catch (e) { return null; }
}

// File entry for an absolute path. Requires localFileSystem: fullAccess.
async function fileEntry(path, options) {
  var lfs = require("uxp").storage.localFileSystem;
  var url = "file:" + path;
  if (options && options.create && lfs.createEntryWithUrl) {
    try {
      return await lfs.createEntryWithUrl(url, { overwrite: true });
    } catch (e) {
      // Fall through: the file may already exist
    }
  }
  return await lfs.getEntryWithUrl(url);
}

function findDocument(app, id) {
  for (var i = 0; i < app.documents.length; i++) {
    if (app.documents[i].id === id) return app.documents[i];
  }
  return null;
}

function hasTarget(payload) {
  return payload.documentId !== undefined && payload.documentId !== null;
}

// The document a job is pinned to (payload.documentId), never whichever one is
// in front. Jobs without a documentId fall back to the active document.
function targetDocument(app, payload) {
  if (!hasTarget(payload)) return activeDocumentOrNull(app);
  var doc = findDocument(app, payload.documentId);
  if (!doc) {
    throw new Error("Target document " + (payload.documentTitle ? payload.documentTitle + " (id " + payload.documentId + ")" : payload.documentId) +
      " is no longer open. Run `ps.mjs target` again.");
  }
  return doc;
}

// Scripts and targetEnum descriptors act on the front document, so a pinned
// edit only runs when its target is in front. Call this inside the modal scope:
// Photoshop blocks input there, so the front document can't change before the edit.
function ensureTargetInFront(app, doc) {
  var front = activeDocumentOrNull(app);
  if (!doc || (front && front.id === doc.id)) return;
  if (session) {
    // The user is locked out, so only Claude's own scripts can have switched documents
    app.activeDocument = doc;
    return;
  }
  throw new Error("Active document changed (you're in " + (front ? front.title : "no document") + ", I expected " + doc.title + "). Nothing was changed.");
}

// Run modal work, reusing the session's modal scope when one is open
async function withModal(name, work) {
  if (session) {
    try { session.executionContext.reportProgress({ commandName: "Claude: " + session.label + " - " + name }); } catch (e) {}
    return work(session.executionContext);
  }
  return require("photoshop").core.executeAsModal(work, { commandName: name });
}

// Run modal work on the job's target document as a single history step.
// If the work throws, the history step is rolled back so the document is untouched.
async function runAsHistoryStep(name, useHistory, payload, work) {
  var ps = require("photoshop");
  return withModal(name, async function (executionContext) {
    var doc = targetDocument(ps.app, payload);
    if (hasTarget(payload)) ensureTargetInFront(ps.app, doc);
    var suspensionId = null;
    if (doc && useHistory !== false) {
      suspensionId = await executionContext.hostControl.suspendHistory({ documentID: doc.id, name: name });
    }
    var succeeded = false;
    try {
      var value = await work(executionContext, doc);
      succeeded = true;
      return value;
    } finally {
      if (suspensionId !== null) {
        try {
          await executionContext.hostControl.resumeHistory(suspensionId, succeeded);
        } catch (e) {
          // The script may have closed or switched documents; nothing to resume
        }
      }
    }
  });
}

async function runScript(payload) {
  if (!payload.code) throw new Error("runScript requires code");
  var ps = require("photoshop");
  var uxp = require("uxp");
  var nodeFs = null;
  try { nodeFs = require("fs"); } catch (e) {}

  var AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  var fn;
  try {
    fn = new AsyncFunction(
      "ps", "app", "batchPlay", "core", "constants", "uxp", "fs", "args", "executionContext", "log", "fileEntry", "doc",
      payload.code
    );
  } catch (e) {
    var msg = errorMessage(e);
    if (/code generation|eval|unsafe/i.test(msg)) {
      throw new Error("Script compilation is blocked (" + msg + "). Reload the plugin in UXP Developer Tool so the manifest permission allowCodeGenerationFromStrings takes effect.");
    }
    if (/\bdoc\b.*already been declared/.test(msg)) {
      throw new Error("Script syntax error: " + msg + ". `doc` is already defined as the target document; remove your `const doc = ...` line.");
    }
    throw new Error("Script syntax error: " + msg);
  }

  var logs = [];
  function scriptLog() {
    logs.push(Array.prototype.map.call(arguments, formatLogArg).join(" "));
  }
  function run(executionContext, doc) {
    return fn(ps, ps.app, ps.action.batchPlay, ps.core, ps.constants, uxp, nodeFs,
      payload.args || {}, executionContext, scriptLog, fileEntry, doc);
  }

  var name = payload.historyName || "Claude edit";
  var value;
  try {
    value = payload.modal === false
      ? await run(null, targetDocument(ps.app, payload))
      : await runAsHistoryStep(name, payload.history, payload, run);
  } catch (e) {
    var err = new Error(errorMessage(e) + (logs.length ? "\nScript log:\n" + logs.join("\n") : ""));
    throw err;
  }
  return { result: toPlain(value), logs: logs };
}

async function runBatchPlay(payload) {
  var descriptors = payload.descriptors || (payload.descriptor ? [payload.descriptor] : null);
  if (!descriptors || !descriptors.length) throw new Error("batchPlay requires descriptors");
  var batchPlay = require("photoshop").action.batchPlay;
  var name = payload.historyName || "Claude batchPlay";
  var results = await runAsHistoryStep(name, payload.history, payload, async function () {
    var batchResults = await batchPlay(descriptors, payload.options || {});
    var failed = (batchResults || []).filter(function (r) { return r && r._obj === "error"; });
    // Throw inside the history step so the whole batch is rolled back
    if (failed.length) {
      throw new Error("batchPlay error: " + failed.map(function (r) { return r.message || JSON.stringify(r); }).join("; "));
    }
    return batchResults;
  });
  return { results: toPlain(results) };
}

function describeLayer(layer, depth, opts) {
  var d = {};
  function grab(key, getter) {
    try {
      var v = getter();
      if (v !== undefined) d[key] = v;
    } catch (e) {}
  }
  grab("id", function () { return layer.id; });
  grab("name", function () { return layer.name; });
  grab("kind", function () { return String(layer.kind); });
  grab("visible", function () { return layer.visible; });
  grab("opacity", function () { return layer.opacity; });
  grab("fillOpacity", function () { return layer.fillOpacity; });
  grab("blendMode", function () { return String(layer.blendMode); });
  grab("locked", function () { return layer.allLocked; });
  grab("clipped", function () { return layer.isClippingMask; });
  grab("bounds", function () {
    var b = layer.bounds;
    return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
  });
  if (d.kind === "text") {
    grab("text", function () {
      var t = layer.textItem.contents;
      return opts.fullText || t.length <= 300 ? t : t.slice(0, 300) + "…";
    });
    grab("font", function () { return layer.textItem.characterStyle.font; });
    grab("fontSize", function () { return layer.textItem.characterStyle.size; });
  }
  var children = null;
  try { children = layer.layers; } catch (e) {}
  if (children && children.length) {
    if (depth < opts.maxDepth) {
      d.children = [];
      for (var i = 0; i < children.length; i++) d.children.push(describeLayer(children[i], depth + 1, opts));
    } else {
      d.childCount = children.length;
    }
  }
  return d;
}

async function getDocumentState(payload) {
  var app = require("photoshop").app;
  var documents = [];
  var active = activeDocumentOrNull(app);
  for (var i = 0; i < app.documents.length; i++) {
    var od = app.documents[i];
    documents.push({ id: od.id, title: od.title, active: !!active && od.id === active.id });
  }
  var doc = active;
  if (hasTarget(payload)) {
    // Read-only, so report a closed target instead of failing: the caller still needs the document list
    doc = findDocument(app, payload.documentId);
    if (!doc) return { documents: documents, document: null, targetMissing: true };
  }
  if (!doc) return { documents: documents, document: null };

  var info = { id: doc.id, title: doc.title, inFront: !!active && active.id === doc.id };
  function grab(key, getter) {
    try {
      var v = getter();
      if (v !== undefined) info[key] = v;
    } catch (e) {}
  }
  grab("path", function () { return doc.path; });
  grab("width", function () { return doc.width; });
  grab("height", function () { return doc.height; });
  grab("resolution", function () { return doc.resolution; });
  grab("mode", function () { return String(doc.mode); });
  grab("bitsPerChannel", function () { return String(doc.bitsPerChannel); });
  grab("saved", function () { return doc.saved; });
  grab("activeLayers", function () {
    return doc.activeLayers.map(function (l) { return { id: l.id, name: l.name }; });
  });
  var opts = { maxDepth: payload.maxDepth !== undefined ? payload.maxDepth : 50, fullText: !!payload.fullText };
  info.layers = [];
  for (var k = 0; k < doc.layers.length; k++) info.layers.push(describeLayer(doc.layers[k], 0, opts));
  return { documents: documents, document: info };
}

async function exportPreview(payload) {
  var ps = require("photoshop");
  var app = ps.app;
  var source = targetDocument(app, payload);
  if (!source) throw new Error("No active document to preview");
  var maxSize = payload.maxSize || 2048;

  // Preferred: read the composite through the imaging API. No temporary document
  // is opened, the target doesn't need to be in front, and the result is returned
  // as a base64 JPEG flattened onto white.
  if (ps.imaging) {
    return withModal("Claude preview", async function () {
      var scale = Math.min(1, maxSize / Math.max(source.width, source.height));
      var targetSize = {
        width: Math.max(1, Math.round(source.width * scale)),
        height: Math.max(1, Math.round(source.height * scale))
      };
      // componentSize 8: the JPEG encoder rejects 16-bit image data
      var pixels = await ps.imaging.getPixels({ documentID: source.id, targetSize: targetSize, componentSize: 8, applyAlpha: true });
      try {
        var jpeg = await ps.imaging.encodeImageData({ imageData: pixels.imageData, base64: true });
        return {
          format: "jpeg",
          base64: jpeg,
          width: pixels.imageData.width,
          height: pixels.imageData.height,
          sourceWidth: source.width,
          sourceHeight: source.height
        };
      } finally {
        pixels.imageData.dispose();
      }
    });
  }

  // Fallback: save a merged, resized duplicate as PNG to payload.path
  if (!payload.path) throw new Error("exportPreview fallback requires an absolute output path");
  return withModal("Claude preview", async function () {
    var front = activeDocumentOrNull(app);
    var sourceWidth = source.width;
    var sourceHeight = source.height;
    // Merged duplicate keeps the original document and its history untouched
    var copy = await source.duplicate("claude_preview", true);
    var width = sourceWidth;
    var height = sourceHeight;
    try {
      var scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
      if (scale < 1) {
        width = Math.max(1, Math.round(sourceWidth * scale));
        height = Math.max(1, Math.round(sourceHeight * scale));
        await copy.resizeImage(width, height);
      }
      var entry = await fileEntry(payload.path, { create: true });
      await copy.saveAs.png(entry, { compression: 6 }, true);
    } finally {
      await copy.closeWithoutSaving();
      // Put back whichever document the user had in front
      try { if (front) app.activeDocument = front; } catch (e) {}
    }
    return { path: payload.path, width: width, height: height, sourceWidth: sourceWidth, sourceHeight: sourceHeight };
  });
}

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// Open a session: one executeAsModal scope that keeps the user locked out while
// it polls and runs jobs itself. Resolves as soon as the scope is open; the scope
// closes on endSession, after idleMs without jobs, or when the user presses Cancel.
function beginSession(payload) {
  if (session) return Promise.reject(new Error("A session is already open (" + session.label + ")"));
  var ps = require("photoshop");
  var label = payload.label || "Claude session";
  var idleMs = Math.min(Math.max(Number(payload.idleMs) || SESSION_IDLE_DEFAULT_MS, 5000), SESSION_IDLE_MAX_MS);
  var connection = activeConnection;

  return new Promise(function (resolve, reject) {
    ps.core.executeAsModal(async function (executionContext) {
      if (!connection || activeConnection !== connection) throw new Error("Panel disconnected before the session started");
      var doc = targetDocument(ps.app, payload);
      if (!doc) throw new Error("No document to lock a session to");
      var front = activeDocumentOrNull(ps.app);
      if (!front || front.id !== doc.id) ps.app.activeDocument = doc;
      session = { executionContext: executionContext, label: label, idleMs: idleMs, lastJobAt: Date.now(), ending: false, jobs: 0 };
      try { executionContext.reportProgress({ commandName: "Claude: " + label }); } catch (e) {}
      setActivity("session", label);
      log("Session started: " + label + " on " + doc.title, "ok");
      resolve({ label: label, documentId: doc.id, title: doc.title, idleSeconds: idleMs / 1000 });
      return runSessionLoop(session, connection);
    }, { commandName: "Claude: " + label }).then(function (reason) {
      log("Session ended (" + reason + ")" + (session ? ", " + session.jobs + " jobs" : ""), reason === "cancelled" ? "warn" : "ok");
    }, function (e) {
      // Rejects the job only if the scope never opened; otherwise resolve already ran
      reject(e);
      if (session) log("Session ended with error: " + errorMessage(e), "error");
    }).then(function () {
      session = null;
      setActivity("idle");
      schedulePoll(0);
    });
  });
}

async function runSessionLoop(currentSession, connection) {
  while (true) {
    if (session !== currentSession || activeConnection !== connection) return "disconnected";
    if (session.ending) return "ended";
    if (session.executionContext.isCancelled) return "cancelled";
    if (!connected) return "disconnected";
    if (Date.now() - session.lastJobAt > session.idleMs) return "idle " + Math.round(session.idleMs / 1000) + "s";
    var job;
    try {
      job = await fetchNextJob(connection);
    } catch (e) {
      if (activeConnection !== connection) return "disconnected";
      if (e.fatal) {
        log(e.message, "error");
        return "unauthorized";
      }
      await delay(POLL_INTERVAL_MS);
      continue;
    }
    if (activeConnection !== connection || session !== currentSession || currentSession.executionContext.isCancelled) {
      if (job) await discardJob(job, connection);
      return currentSession.executionContext.isCancelled ? "cancelled" : "disconnected";
    }
    if (!job) {
      await delay(POLL_INTERVAL_MS);
      continue;
    }
    session.jobs++;
    lastJobAt = Date.now();
    log("Job received: " + job.type, "info");
    lastJob = { jobId: job.id, jobType: job.type, payload: job.payload };
    await handleJob(job.id, job.type, job.payload, connection);
    // Idle time counts from when a job finishes, so a long job can't end the session
    session.lastJobAt = Date.now();
  }
}

btnConnect.addEventListener("click", function () {
  if (activeConnection || connected || reconnectTimer) disconnect();
  else connect();
});

btnRefresh.addEventListener("click", function () {
  refreshDoc();
  log("Refreshed", "info");
});

btnRunLast.addEventListener("click", function () {
  if (session || jobRunning) {
    log("Claude is running a job; try again when it's idle", "warn");
    return;
  }
  if (lastJob) handleJob(lastJob.jobId + "_retry", lastJob.jobType, lastJob.payload);
});

btnClearLog.addEventListener("click", function () {
  jobLog.innerHTML = "";
});

log("Panel bridge script loaded", "ok");
var hasSavedToken = loadSettings();
log("Bridge URL: " + getUrl(), "info");
setActivity("idle");
refreshDoc();
setInterval(refreshDoc, 5000);
if (hasSavedToken) connect();
