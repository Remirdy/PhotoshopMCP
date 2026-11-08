const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/panel-bridge.js"), "utf8");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function response(status, body) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

async function flush() {
  await new Promise(setImmediate);
}

function panel() {
  const elements = new Map();
  const requests = [];
  const timers = new Map();
  const executed = [];
  let nextTimer = 0;
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: "", disabled: false, textContent: "", className: "",
      events: {}, addEventListener(name, handler) { this.events[name] = handler; },
      appendChild() {}
    });
    return elements.get(id);
  }
  const context = vm.createContext({
    document: { getElementById: element, createElement: () => ({}) },
    localStorage: { getItem: () => null, setItem() {} },
    require(name) {
      if (name === "photoshop") return { app: { documents: [], activeDocument: null } };
      throw new Error("Unexpected module: " + name);
    },
    fetch(url, options = {}) {
      const pending = deferred();
      requests.push({ url, options, ...pending });
      if (options.method === "POST") pending.resolve(response(200, { ok: true }));
      return pending.promise;
    },
    setTimeout(callback, delay) { timers.set(++nextTimer, { callback, delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    setInterval() {},
    console
  });
  vm.runInContext(source, context);
  context.executeJobLocal = async (id) => {
    executed.push(id);
    return { ok: true, jobId: id, data: null };
  };
  function start(url = "http://old-bridge", token = "old-token") {
    element("bridge-url-input").value = url;
    element("bridge-token-input").value = token;
    context.connect();
    return requests.at(-1);
  }
  async function connect(url, token) {
    start(url, token).resolve(response(200));
    await flush();
    return requests.at(-1);
  }
  return { context, requests, timers, executed, element, start, connect };
}

function job(id = "job-1") {
  return { id, type: "ping", payload: {} };
}

test("Disconnect during health check ignores success and failure", async () => {
  for (const fails of [false, true]) {
    const p = panel();
    const health = p.start();
    p.element("btn-connect").events.click();
    if (fails) health.reject(new Error("offline"));
    else health.resolve(response(200));
    await flush();
    assert.equal(p.context.connected, false);
    assert.equal(p.requests.length, 1);
    assert.equal(p.timers.size, 0);
  }
});

test("a late empty poll cannot reconnect or schedule work", async () => {
  const p = panel();
  const poll = await p.connect();
  p.context.disconnect();
  poll.resolve(response(204));
  await flush();
  assert.equal(p.context.connected, false);
  assert.equal(p.timers.size, 0);
  assert.deepEqual(p.executed, []);
});

test("a late job is rejected through its original bridge", async () => {
  const p = panel();
  const poll = await p.connect();
  p.context.disconnect();
  p.start("http://new-bridge", "new-token");
  poll.resolve(response(200, job()));
  await flush();
  const report = p.requests.find(r => r.options.method === "POST");
  assert.equal(report.url, "http://old-bridge/jobs/job-1/result");
  assert.equal(report.options.headers["X-Bridge-Token"], "old-token");
  const result = JSON.parse(report.options.body);
  assert.equal(result.ok, false);
  assert.equal(result.photoshopStatus, "disconnected");
  assert.match(result.message, /not executed/);
  assert.deepEqual(p.executed, []);
  assert.equal(p.context.connected, false);
});

test("Disconnect while parsing a job body still prevents execution", async () => {
  const p = panel();
  const poll = await p.connect();
  const body = deferred();
  poll.resolve({ ok: true, status: 200, json: () => body.promise });
  await flush();
  p.context.disconnect();
  body.resolve(job());
  await flush();
  assert.deepEqual(p.executed, []);
  assert.equal(JSON.parse(p.requests.at(-1).options.body).ok, false);
});

test("stale authorization and network errors cannot disconnect a new connection", async () => {
  for (const status of [401, 503, null]) {
    const p = panel();
    const oldPoll = await p.connect();
    p.context.disconnect();
    await p.connect("http://new-bridge", "new-token");
    if (status === null) oldPoll.reject(new Error("offline"));
    else oldPoll.resolve(response(status));
    await flush();
    assert.equal(p.context.connected, true);
    assert.equal(p.context.activeConnection.url, "http://new-bridge");
    assert.equal(p.context.pollFailures, 0);
  }
});

test("stale health responses cannot replace a new connection", async () => {
  for (const fails of [false, true]) {
    const p = panel();
    const oldHealth = p.start();
    p.context.disconnect();
    await p.connect("http://new-bridge", "new-token");
    if (fails) oldHealth.reject(new Error("offline"));
    else oldHealth.resolve(response(200));
    await flush();
    assert.equal(p.context.connected, true);
    assert.equal(p.requests.filter(r => r.url === "http://new-bridge/jobs/next").length, 1);
    assert.equal(p.timers.size, 0);
  }
});

test("a connected panel executes a job once and reports success", async () => {
  const p = panel();
  const poll = await p.connect();
  poll.resolve(response(200, job()));
  await flush();
  assert.deepEqual(p.executed, ["job-1"]);
  assert.equal(JSON.parse(p.requests.at(-1).options.body).ok, true);
  assert.equal(p.context.jobRunning, false);
  assert.equal(p.timers.size, 1);
});

test("an executing job may finish after Disconnect and reports to its original bridge", async () => {
  const p = panel();
  const running = deferred();
  p.context.executeJobLocal = () => running.promise;
  const poll = await p.connect();
  poll.resolve(response(200, job()));
  await flush();
  assert.equal(p.context.jobRunning, true);
  p.context.disconnect();
  p.element("bridge-url-input").value = "http://different-bridge";
  p.element("bridge-token-input").value = "different-token";
  running.resolve({ ok: true, jobId: "job-1" });
  await flush();
  const report = p.requests.at(-1);
  assert.equal(report.url, "http://old-bridge/jobs/job-1/result");
  assert.equal(report.options.headers["X-Bridge-Token"], "old-token");
  assert.equal(p.context.connected, false);
  assert.equal(p.context.jobRunning, false);
  assert.equal(p.timers.size, 0);
});

test("session polling discards a late job and exits after reconnect", async () => {
  const p = panel();
  const firstPoll = await p.connect();
  firstPoll.resolve(response(204));
  await flush();
  const currentSession = { ending: false, executionContext: { isCancelled: false }, idleMs: 60000, lastJobAt: Date.now(), jobs: 0 };
  p.context.session = currentSession;
  const loop = p.context.runSessionLoop(currentSession, p.context.activeConnection);
  const sessionPoll = p.requests.at(-1);
  p.context.disconnect();
  await p.connect("http://new-bridge", "new-token");
  sessionPoll.resolve(response(200, job("session-job")));
  assert.equal(await loop, "disconnected");
  assert.equal(currentSession.jobs, 0);
  assert.deepEqual(p.executed, []);
});

test("cancelling a session during polling rejects an unstarted job", async () => {
  const p = panel();
  const firstPoll = await p.connect();
  firstPoll.resolve(response(204));
  await flush();
  const currentSession = { ending: false, executionContext: { isCancelled: false }, idleMs: 60000, lastJobAt: Date.now(), jobs: 0 };
  p.context.session = currentSession;
  const loop = p.context.runSessionLoop(currentSession, p.context.activeConnection);
  currentSession.executionContext.isCancelled = true;
  p.requests.at(-1).resolve(response(200, job("cancelled-job")));
  assert.equal(await loop, "cancelled");
  assert.deepEqual(p.executed, []);
  assert.equal(JSON.parse(p.requests.at(-1).options.body).ok, false);
});
