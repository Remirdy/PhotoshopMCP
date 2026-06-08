# Architecture — Remirdy Photoshop MCP

## System Overview

```
AI Client (Claude / Cursor / any MCP client)
        │
        │  MCP stdio protocol
        ▼
┌─────────────────────────────┐
│   Remirdy MCP Server        │  apps/mcp-server
│   TypeScript / Node.js      │
│   60+ tools, resources,     │
│   prompts. Zod validation.  │
└─────────────┬───────────────┘
              │
              │  HTTP POST /jobs  (localhost:47831)
              │  Bearer token auth
              ▼
┌─────────────────────────────┐
│   Local Bridge              │  apps/local-bridge
│   Express + WebSocket       │
│   Job queue, result routing │
│   localhost only, token     │
└─────────────┬───────────────┘
              │
              │  WebSocket  ws://localhost:47831
              │  (or HTTP polling fallback)
              ▼
┌─────────────────────────────┐
│   Photoshop UXP Plugin      │  photoshop-uxp-plugin/
│   JS panel inside PS        │
│   Job handlers, DOM APIs,   │
│   batchPlay when needed     │
└─────────────┬───────────────┘
              │
              │  Photoshop DOM / batchPlay
              ▼
         Adobe Photoshop
         PSD / PNG / ZIP output
```

## Component Responsibilities

### MCP Server (`apps/mcp-server`)
- Exposes MCP tools, resources, and prompts via stdio
- Validates all inputs with Zod
- Sends jobs to the local bridge via HTTP
- Waits for async results
- Falls back to mock mode if bridge/plugin not connected
- Never directly touches Photoshop

### Local Bridge (`apps/local-bridge`)
- Runs on `127.0.0.1:47831` only
- Accepts jobs from MCP server via HTTP POST
- Delivers jobs to UXP plugin via WebSocket
- Provides HTTP polling fallback
- Authenticates with shared token
- Logs all jobs to `.remirdy/jobs.jsonl`
- Returns results to MCP server
- Tracks queue, pending result, plugin heartbeat, and stale connection state
- Keeps jobs queued when Photoshop is offline so polling fallback can claim them

### Photoshop UXP Plugin (`photoshop-uxp-plugin`)
- Runs inside Photoshop as a UXP panel
- Connects to local bridge via WebSocket
- Receives jobs and executes them in Photoshop
- Uses DOM APIs for document, layer, text operations
- Uses batchPlay for shapes, layer effects, transforms
- Returns structured results to bridge

### Shared Package (`packages/shared`)
- Job type definitions
- Zod schemas
- Design tokens (6 themes)
- Layer naming utilities
- Workflow presets
- Error classes

## Job Lifecycle

```
1. AI → MCP tool call
2. MCP server validates input with Zod
3. MCP server POST /jobs to bridge
4. Bridge creates a queued job
5. If the plugin is connected, bridge dispatches via WS and marks job running
6. If the plugin is offline, bridge returns 202 and leaves the job queued
7. Plugin executes job in Photoshop
8. Plugin sends JobResult back via WS or HTTP polling fallback
9. Bridge resolves the waiting HTTP response and marks job done/error
10. MCP server returns result to AI
```

## Bridge Resilience

The local bridge is designed for Photoshop and UXP restarts:

- WebSocket heartbeat pings detect stale plugin connections.
- New plugin connections replace older open sockets cleanly.
- Pending jobs fail with a clear disconnect error if the plugin drops mid-job.
- HTTP polling fallback claims queued jobs with `GET /jobs/next` and submits results with `POST /jobs/:id/result`.
- MCP client requests retry transient bridge/network failures before falling back to mock mode.
- `/bridge/status` reports queue size, pending result count, Photoshop connection state, and plugin last-seen time.

```
Online:  queued -> running -> done/error
Offline: queued -> claimed by polling fallback -> running -> done/error
Dropped: running -> error with disconnect reason
```

## Security Model

- Bridge binds to `127.0.0.1` only — never accessible from network
- All requests require `REMIRDY_BRIDGE_TOKEN` (bearer token)
- Path traversal prevention on all file inputs
- batchPlay allowlist prevents destructive descriptors
- No shell command execution from MCP tools

## batchPlay Usage

Photoshop DOM APIs cover most operations. batchPlay is used for:

| Operation | Reason |
|-----------|--------|
| Shape layers (vector) | DOM lacks shape creation API |
| Layer effects (shadow, stroke) | DOM lacks effect API |
| Precise transforms | DOM scale API unreliable |
| Clipping masks | DOM lacks mask API |
| Asset placement | batchPlay `placeEvent` more reliable |

### Recording batchPlay Descriptors

1. Open Photoshop → Window → Actions panel
2. New Action → Record
3. Perform the operation
4. Stop recording
5. Right-click action → Copy as JavaScript
6. Extract the `batchPlay([...])` call
7. Add to the appropriate `*Api.js` file

### Key batchPlay TODOs

These are marked with `// TODO:` in the source:

- `shapeApi.js`: roundedRect vector mask, circle mask
- `shapeApi.js`: stroke and shadow layer effects via descriptor
- `layerApi.js`: transform descriptor for scale/rotation
- `assetApi.js`: placeEvent descriptor for smart object placement
- `documentApi.js`: solid color background fill
- `layerApi.js`: reorder layer descriptor
- `batchPlayApi.js`: applyDropShadow, applyInnerShadow, applyStroke

## Mock Mode

When `MOCK_MODE=true` or the bridge is unreachable:

- All jobs return a mock result with `photoshopStatus: "disconnected"`
- Design JSON, intended layer tree, and README are written to `.remirdy/mock/`
- Development and CI can continue without Photoshop

## Design Token System

6 built-in themes in `packages/shared/src/designTokens.ts`:

| Theme | Use Case |
|-------|----------|
| `premium_game_ui` | Dark purple premium mobile game |
| `soft_game` | Pastel casual mobile game |
| `ios_glass` | iOS-style frosted glass |
| `dark_luxury` | High-end dark product |
| `clean_saas` | Modern SaaS / web app |
| `arcade_bold` | Retro arcade / neon |
