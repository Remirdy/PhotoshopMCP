#!/usr/bin/env node
/**
 * ps.mjs — command-line client for the Remirdy Photoshop bridge.
 * Used by the Claude /photoshop skill. Zero dependencies (Node >= 18).
 *
 *   ps.mjs launch [--wait SEC]        Start Photoshop + bridge if needed, wait for the panel
 *   ps.mjs quit                       Quit Photoshop (refuses if any document is unsaved) and stop the bridge
 *   ps.mjs bridge                     Start the local bridge if it isn't running
 *   ps.mjs stop                       Stop the local bridge
 *   ps.mjs status                     Bridge + Photoshop panel connection status
 *   ps.mjs target [<title|id>]        Pin later jobs to this document (no argument: show the target)
 *   ps.mjs target --active | --clear  Pin to the front document / forget the target
 *   ps.mjs state [--depth N] [--full-text]
 *                                     Open documents + full layer tree of the target (or front) document
 *   ps.mjs preview [out.png] [--max PX]
 *                                     Flattened image of the target document (default max 2048px)
 *   ps.mjs run <file.js|-> [opts]     Run a UXP script on the target document (one undo step)
 *   ps.mjs eval '<code>' [opts]       Same as run, with inline code
 *   ps.mjs batchplay <file.json|->    Run an array of batchPlay descriptors (one undo step)
 *   ps.mjs open <file>                Open a PSD/image and pin it as the target
 *   ps.mjs new --width PX --height PX [--res PPI] [--name NAME] [--fill white|black|transparent|backgroundColor]
 *                                     Create an unsaved RGB document and pin it as the target
 *   ps.mjs save [file]                Save the target document (Save As PSD when a path is given)
 *   ps.mjs session begin [--label TEXT] [--idle SEC]
 *                                     Lock the user out of Photoshop until `session end`,
 *                                     SEC seconds without jobs (default 60), or Cancel
 *   ps.mjs session end                Release the lock
 *
 * run, eval, batchplay, preview, save and session begin need a target. They refuse
 * when the user has another document in front instead of editing that one.
 *
 * run/eval options:
 *   --args '<json>'   Value exposed to the script as `args`
 *   --name '<text>'   History step name (default "Claude edit")
 *   --no-history      Don't wrap in a single history step (no rollback on failure)
 *   --no-modal        Run outside executeAsModal (read-only scripts only)
 *   --timeout MS      Job timeout (default 120000, max 300000)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.env.PHOTOSHOP_MCP_REPO ?? path.resolve(SCRIPT_DIR, "../../..");
const ENV = loadEnv(path.join(REPO_ROOT, ".env"));
const PORT = process.env.BRIDGE_PORT ?? ENV.BRIDGE_PORT ?? "47831";
const BRIDGE_URL = process.env.BRIDGE_URL ?? `http://127.0.0.1:${PORT}`;
const TOKEN = process.env.REMIRDY_BRIDGE_TOKEN ?? ENV.REMIRDY_BRIDGE_TOKEN ?? "dev_insecure_token";
const OUT_DIR = path.join(os.tmpdir(), "claude-photoshop");
const BRIDGE_LOG = path.join(OUT_DIR, "bridge.log");
const TARGET_FILE = path.join(OUT_DIR, "target.json");
// Present while this CLI believes a session lock is open
const SESSION_FILE = path.join(OUT_DIR, "session.json");
const BRIDGE_ENTRY = "apps/local-bridge/src/index.ts";
// A bridge started by this CLI shuts itself down after this long without jobs
const BRIDGE_IDLE_EXIT_MINUTES = process.env.BRIDGE_IDLE_EXIT_MINUTES ?? "15";
const PHOTOSHOP_BUNDLE_ID = "com.adobe.Photoshop";

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--no-")) flags[a.slice(5)] = false;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) flags[key] = true;
      else { flags[key] = next; i++; }
    } else positional.push(a);
  }
  return { positional, flags };
}

async function request(method, route, body, timeoutMs = 5000) {
  const res = await fetch(BRIDGE_URL + route, {
    method,
    headers: { "Content-Type": "application/json", "X-Bridge-Token": TOKEN },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (res.status === 401) fail("bridge rejected the token. The token in the Photoshop panel must match REMIRDY_BRIDGE_TOKEN in " + path.join(REPO_ROOT, ".env"));
  return { status: res.status, data };
}

async function bridgeHealthy() {
  try {
    const { status } = await request("GET", "/health", null, 1500);
    return status === 200;
  } catch {
    return false;
  }
}

async function startBridge() {
  if (await bridgeHealthy()) return { started: false, url: BRIDGE_URL };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tsx = path.join(REPO_ROOT, "node_modules/.bin/tsx");
  if (!fs.existsSync(tsx)) fail(`tsx not found at ${tsx}. Run \`pnpm install\` in ${REPO_ROOT}.`);
  const log = fs.openSync(BRIDGE_LOG, "a");
  const child = spawn(tsx, [BRIDGE_ENTRY], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ["ignore", log, log],
    env: { ...process.env, BRIDGE_IDLE_EXIT_MINUTES },
  });
  child.unref();
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await bridgeHealthy()) return { started: true, url: BRIDGE_URL, pid: child.pid, log: BRIDGE_LOG };
  }
  fail(`bridge did not come up within 10s. See ${BRIDGE_LOG}`);
}

function stopBridge() {
  try {
    execFileSync("pkill", ["-f", BRIDGE_ENTRY]);
    return { stopped: true };
  } catch {
    return { stopped: false, note: "bridge was not running" };
  }
}

function photoshopRunning() {
  try {
    const out = execFileSync("osascript", ["-e", `application id "${PHOTOSHOP_BUNDLE_ID}" is running`], { encoding: "utf8" });
    return out.trim() === "true";
  } catch {
    return false;
  }
}

async function launch(waitSeconds) {
  const wasRunning = photoshopRunning();
  if (!wasRunning) execFileSync("open", ["-b", PHOTOSHOP_BUNDLE_ID]);
  await startBridge();
  const deadline = Date.now() + waitSeconds * 1000;
  while (Date.now() < deadline) {
    const s = await status();
    if (s.photoshop) return { launched: !wasRunning, connected: true };
    await new Promise((r) => setTimeout(r, 1000));
  }
  fail(
    `Photoshop is ${wasRunning ? "running" : "starting"} but the Remirdy panel didn't connect within ${waitSeconds}s. ` +
    "Open Plugins > Remirdy MCP once and leave it docked so it reopens with Photoshop."
  );
}

async function quit() {
  if (photoshopRunning()) {
    const s = await status();
    if (s.photoshop) {
      const unsaved = (await sendJob("runScript", {
        code: "return Array.from(app.documents).filter((d) => !d.saved).map((d) => d.title);",
        modal: false,
      })).result;
      if (unsaved.length) fail(`not quitting: unsaved changes in ${unsaved.join(", ")}. Save or close them first.`);
    }
    execFileSync("osascript", ["-e", `tell application id "${PHOTOSHOP_BUNDLE_ID}" to quit`]);
  }
  return { photoshopQuit: true, ...stopBridge() };
}

async function status() {
  if (!(await bridgeHealthy())) {
    return { bridge: false, photoshop: false, hint: "Bridge not running. Run: ps.mjs bridge" };
  }
  const { data } = await request("GET", "/photoshop/status");
  return {
    bridge: true,
    photoshop: !!data.connected,
    ...data,
    ...(data.connected ? {} : { hint: "Bridge is up but the Photoshop panel isn't polling. In Photoshop: Plugins > Remirdy MCP, then Connect Bridge." }),
  };
}

async function sendJob(type, payload, timeoutMs = 120_000) {
  const s = await status();
  if (!s.bridge || !s.photoshop) fail(s.hint);
  let res;
  try {
    res = await request("POST", "/jobs", { type, payload, timeoutMs }, timeoutMs + 5000);
  } catch (e) {
    fail(`job ${type} failed to complete: ${e.message}`);
  }
  const result = res.data;
  if (!result || typeof result !== "object") fail(`unexpected bridge response (${res.status}): ${String(result)}`);
  if (result.session === false && type !== "beginSession" && fs.existsSync(SESSION_FILE)) {
    fs.rmSync(SESSION_FILE, { force: true });
    process.stderr.write("warning: the session lock has ended (idle timeout or the user pressed Cancel). Jobs now run unlocked; run `session begin` again if needed.\n");
  }
  // executeAsModal stringifies errors, so panel messages can arrive as "Error: ..."
  if (!result.ok) fail(String(result.message ?? `job ${type} failed`).replace(/^(Error: )+/, ""));
  return result.data;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function writeJson(file, value) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value) + "\n");
}

function validTarget(value) {
  return !!value && Number.isInteger(value.id);
}

// Stores the target document. Titles are only for messages; jobs match by id.
function pin(doc) {
  if (!validTarget(doc)) fail(`can't pin ${JSON.stringify(doc)}: no document id`);
  const target = { id: doc.id, title: doc.title };
  writeJson(TARGET_FILE, target);
  return target;
}

// Adds the pinned document to a job payload; refuses when no valid target is set,
// since a job without a documentId would act on whichever document is in front
function pinned(payload) {
  const target = readJson(TARGET_FILE);
  if (!validTarget(target)) fail("no target document. Run `ps.mjs target <title|id>` (or `target --active`) first.");
  return { ...payload, documentId: target.id, documentTitle: target.title };
}

// Keeps the stored title current after Save As renames the document
function refreshTargetTitle(current, doc) {
  if (doc && doc.id === current.id && doc.title !== current.title) return pin(doc);
  return current;
}

async function target(query, flags) {
  if (flags.clear) {
    fs.rmSync(TARGET_FILE, { force: true });
    return { target: null };
  }
  const { documents } = await sendJob("getDocumentState", { maxDepth: 0 });
  if (!query && !flags.active) {
    const current = readJson(TARGET_FILE);
    if (!validTarget(current)) return { target: null, documents, hint: "No target. Run: ps.mjs target <title|id>" };
    const doc = documents.find((d) => d.id === current.id);
    return { target: refreshTargetTitle(current, doc), open: !!doc, documents };
  }
  let matches;
  if (flags.active) {
    matches = documents.filter((d) => d.active);
  } else {
    matches = /^\d+$/.test(query) ? documents.filter((d) => d.id === Number(query)) : [];
    if (!matches.length) matches = documents.filter((d) => d.title === query);
    if (!matches.length) matches = documents.filter((d) => d.title.toLowerCase() === query.toLowerCase());
  }
  const list = documents.map((d) => `${d.title} (id ${d.id})`).join(", ") || "none";
  if (!matches.length) fail(`no open document matches ${flags.active ? "--active" : JSON.stringify(query)}. Open: ${list}`);
  if (matches.length > 1) fail(`${matches.length} open documents are called ${JSON.stringify(query)}; pass the id instead. Open: ${list}`);
  return { target: pin(matches[0]) };
}

function readSource(arg) {
  if (!arg) fail("missing file argument (use - for stdin)");
  if (arg === "-") return fs.readFileSync(0, "utf8");
  return fs.readFileSync(path.resolve(arg), "utf8");
}

function scriptPayload(code, flags) {
  let args = {};
  if (flags.args) {
    try { args = JSON.parse(flags.args); } catch (e) { fail(`--args is not valid JSON: ${e.message}`); }
  }
  return {
    code,
    args,
    historyName: typeof flags.name === "string" ? flags.name : undefined,
    history: flags.history !== false,
    modal: flags.modal !== false,
  };
}

function timeoutFrom(flags) {
  return flags.timeout ? Math.min(Number(flags.timeout), 300_000) : 120_000;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseArgs(rest);
  let out;

  switch (command) {
    case "launch":
      out = await launch(flags.wait ? Number(flags.wait) : 120);
      break;
    case "quit":
      out = await quit();
      break;
    case "bridge":
      out = await startBridge();
      break;
    case "stop":
      out = stopBridge();
      break;
    case "status":
      out = await status();
      break;
    case "target":
      out = await target(positional[0], flags);
      break;
    case "state": {
      // Read-only, so it works without a target (then it describes the front document)
      let current = readJson(TARGET_FILE);
      if (!validTarget(current)) current = null;
      const data = await sendJob("getDocumentState", {
        maxDepth: flags.depth !== undefined ? Number(flags.depth) : undefined,
        fullText: !!flags["full-text"],
        ...(current ? { documentId: current.id, documentTitle: current.title } : {}),
      });
      if (current) current = refreshTargetTitle(current, data.document);
      out = { target: current, ...data };
      if (!current) out.hint = "No target. Run: ps.mjs target <title|id> before editing.";
      else if (data.targetMissing) out.hint = `Target ${current.title} (id ${current.id}) is no longer open. Run: ps.mjs target <title|id>`;
      break;
    }
    case "preview": {
      const maxSize = flags.max ? Number(flags.max) : 2048;
      const requested = path.resolve(positional[0] ?? path.join(OUT_DIR, `preview-${Date.now()}.jpg`));
      fs.mkdirSync(path.dirname(requested), { recursive: true });
      const stem = requested.replace(/\.(png|jpe?g)$/i, "");
      // With Photoshop's imaging API the panel returns a base64 JPEG; otherwise it writes this PNG itself
      const data = await sendJob("exportPreview", pinned({ path: stem + ".png", maxSize }));
      if (data.base64) {
        const file = stem + ".jpg";
        fs.writeFileSync(file, Buffer.from(data.base64, "base64"));
        const { base64, ...rest } = data;
        out = { path: file, ...rest };
      } else {
        out = data;
      }
      break;
    }
    case "run":
      out = await sendJob("runScript", pinned(scriptPayload(readSource(positional[0]), flags)), timeoutFrom(flags));
      break;
    case "eval":
      if (!positional[0]) fail("eval needs code");
      out = await sendJob("runScript", pinned(scriptPayload(positional[0], flags)), timeoutFrom(flags));
      break;
    case "batchplay": {
      let descriptors;
      try { descriptors = JSON.parse(readSource(positional[0])); } catch (e) { fail(`descriptor JSON invalid: ${e.message}`); }
      if (!Array.isArray(descriptors)) descriptors = [descriptors];
      out = await sendJob("batchPlay", pinned({
        descriptors,
        historyName: typeof flags.name === "string" ? flags.name : undefined,
        history: flags.history !== false,
      }), timeoutFrom(flags));
      break;
    }
    case "open": {
      if (!positional[0]) fail("open needs a file path");
      const file = path.resolve(positional[0]);
      if (!fs.existsSync(file)) fail(`no such file: ${file}`);
      const { result: opened } = await sendJob("runScript", {
        code: "const opened = await app.open(await fileEntry(args.path)); return { id: opened.id, title: opened.title, width: opened.width, height: opened.height };",
        args: { path: file },
        history: false,
      });
      out = { ...opened, pinned: pin(opened) };
      break;
    }
    case "new": {
      const width = Number(flags.width);
      const height = Number(flags.height);
      if (!(width > 0 && height > 0)) fail("new needs --width and --height in pixels");
      const fill = typeof flags.fill === "string" ? flags.fill : "white";
      if (!["white", "black", "transparent", "backgroundColor"].includes(fill)) fail("--fill must be white, black, transparent or backgroundColor");
      const { result: created } = await sendJob("runScript", {
        code: [
          "const created = await app.documents.add({ width: args.width, height: args.height, resolution: args.resolution, name: args.name, mode: 'RGBColorMode', fill: args.fill });",
          "return { id: created.id, title: created.title, width: created.width, height: created.height, resolution: created.resolution };",
        ].join("\n"),
        args: {
          width,
          height,
          resolution: flags.res ? Number(flags.res) : 72,
          name: typeof flags.name === "string" ? flags.name : "Untitled",
          fill,
        },
        history: false,
      });
      out = { ...created, pinned: pin(created), note: "Not saved yet. Use `save /abs/path.psd` to write it to disk." };
      break;
    }
    case "save": {
      const file = positional[0] ? path.resolve(positional[0]) : null;
      if (file) fs.mkdirSync(path.dirname(file), { recursive: true });
      out = await sendJob("runScript", pinned({
        code: [
          "if (args.path) { await doc.saveAs.psd(await fileEntry(args.path, { create: true }), { maximizeCompatibility: true }); }",
          "else { await doc.save(); }",
          "let savedPath = args.path; try { savedPath = doc.path || args.path; } catch (e) {}",
          "return { id: doc.id, title: doc.title, path: savedPath };",
        ].join("\n"),
        args: { path: file },
        history: false,
      }));
      // Save As renames the document; keep the pin's title in step
      out.pinned = pin(out.result);
      break;
    }
    case "session": {
      if (positional[0] === "begin") {
        out = await sendJob("beginSession", pinned({
          label: typeof flags.label === "string" ? flags.label : undefined,
          idleMs: flags.idle ? Number(flags.idle) * 1000 : undefined,
        }));
        writeJson(SESSION_FILE, out);
      } else if (positional[0] === "end") {
        out = await sendJob("endSession", {});
        fs.rmSync(SESSION_FILE, { force: true });
      } else {
        fail("usage: session begin [--label TEXT] [--idle SEC] | session end");
      }
      break;
    }
    default:
      process.stdout.write(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^#!.*\n\/\*\*\n/, "") + "\n");
      process.exit(command ? 1 : 0);
  }

  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}

main().catch((e) => fail(e.stack ?? String(e)));
