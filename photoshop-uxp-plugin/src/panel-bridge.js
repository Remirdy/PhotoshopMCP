    if (!p.path) throw new Error("saveDocument requires an absolute output path");
    var savePath = p.path;if (!p.path) throw new Error("saveDocument requires an absolute output path");
    var savePath = p.path;if (!p.path) throw new Error("saveDocument requires an absolute output path");
    var savePath = p.path;var ws = null;
var connected = false;
var pollTimer = null;
var lastJob = null;

var statusBadge = document.getElementById("status-badge");
var docNameEl = document.getElementById("doc-name");
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
  btnConnect.textContent = connected ? "Disconnect" : "Connect Bridge";
  if (!connected) btnRunLast.disabled = true;
}

function refreshDoc() {
  try {
    var doc = typeof app !== "undefined" && app.activeDocument ? app.activeDocument : null;
    docNameEl.textContent = doc ? doc.title : "-";
  } catch (e) {
    docNameEl.textContent = "-";
  }
}

function connect() {
  if (ws) {
    try { ws.close(); } catch (e) {}
    ws = null;
  }
  setStatus("connecting");
  log("Checking bridge over HTTP: " + getUrl(), "info");

  fetch(getUrl() + "/health")
    .then(function (res) {
      if (!res.ok) throw new Error("Health returned " + res.status);
      setStatus("connected");
      log("Bridge HTTP health OK", "ok");
      startPolling();
    })
    .catch(function (e) {
      log("HTTP bridge check failed: " + e.message, "error");
      setStatus("disconnected");
    });
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(pollNextJob, 2000);
  pollNextJob();
}

function pollNextJob() {
  fetch(getUrl() + "/jobs/next", {
    headers: { "X-Bridge-Token": getToken() }
  })
    .then(function (res) {
      if (res.status === 204) return null;
      if (res.status === 401) throw new Error("Unauthorized: token does not match bridge");
      if (!res.ok) throw new Error("Polling returned " + res.status);
      return res.json();
    })
    .then(function (job) {
      if (!job) return;
      log("HTTP job received: " + job.type, "info");
      lastJob = { jobId: job.id, jobType: job.type, payload: job.payload };
      btnRunLast.disabled = false;
      handleJob(job.id, job.type, job.payload);
    })
    .catch(function (e) {
      log("HTTP polling failed: " + e.message, "error");
      setStatus("disconnected");
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
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
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (ws) {
    try { ws.close(); } catch (e) {}
    ws = null;
  }
  setStatus("disconnected");
  log("Disconnected", "warn");
}

function sendResult(jobId, result) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: "jobResult", jobId: jobId, result: result }));
    return;
  }
  fetch(getUrl() + "/jobs/" + encodeURIComponent(jobId) + "/result", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bridge-Token": getToken()
    },
    body: JSON.stringify(result)
  }).catch(function (e) {
    log("Result send failed: " + e.message, "error");
  });
}

async function handleJob(jobId, jobType, payload) {
  try {
    var result = await executeJobLocal(jobId, jobType, payload || {});
    log("Done: " + jobType, result.ok ? "ok" : "error");
    sendResult(jobId, result);
  } catch (e) {
    var errMsg = e ? (e.message || e.description || (typeof e === "string" ? e : JSON.stringify(e))) : "Unknown error";
    log("Job failed: " + errMsg, "error");
    sendResult(jobId, { ok: false, message: String(errMsg), data: null, warnings: [], jobId: jobId, photoshopStatus: "connected" });
  }
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

btnConnect.addEventListener("click", function () {
  if (connected) disconnect();
  else connect();
});

btnRefresh.addEventListener("click", function () {
  refreshDoc();
  log("Refreshed", "info");
});

btnRunLast.addEventListener("click", function () {
  if (lastJob) handleJob(lastJob.jobId + "_retry", lastJob.jobType, lastJob.payload);
});

btnClearLog.addEventListener("click", function () {
  jobLog.innerHTML = "";
});

log("Panel bridge script loaded", "ok");
log("Bridge URL: " + getUrl(), "info");
refreshDoc();
setInterval(refreshDoc, 5000);
