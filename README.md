# Remirdy Photoshop MCP

**Prompt → PSD. Editable layers, clean groups, export-ready packages.**

Remirdy Photoshop MCP is an AI-controlled Photoshop automation system built with [Model Context Protocol](https://modelcontextprotocol.io/), Node.js, and Adobe Photoshop UXP.

It lets AI assistants (Claude, Cursor, or any MCP client) create, organize, inspect, and export editable PSD files with clean layer groups, editable text, shape layers, asset placement, and delivery-ready export packages.

> **All demo content is fictional and public-safe.** No real client briefs, private art tests, or studio case studies are included. See [`docs/PUBLIC_SAFE_DEMOS.md`](docs/PUBLIC_SAFE_DEMOS.md).

---

## What It Does

```
User prompt: "Create a 1290×2796 premium mobile game UI PSD with separate
groups for BG, Gameplay Scene, Game Board, Puzzle Area, Tile Placeholders,
Crate Row, Top HUD, Bottom Boosters, and Popup. Export PSD and PNG previews."

→ Remirdy creates a structured, fully-editable Photoshop document.
```

**Key capabilities:**
- Create Photoshop documents from prompts or JSON design specs
- Build clean nested layer group structures in one call
- Create editable text, shape, and asset layers
- Compose UI components (HUD, popup, booster row)
- Export PSD + PNG + transparent layer PNGs + README + manifest + ZIP
- Audit documents against delivery standards
- Run complete workflows from design JSON

---

## Architecture

```
AI Client (Claude / Cursor / any MCP client)
           │
           │  MCP stdio protocol
           ▼
┌─────────────────────────────────┐
│   Remirdy MCP Server            │
│   TypeScript/Node.js            │
│   60+ tools · Zod validation    │
│   Mock mode when PS offline     │
└──────────────┬──────────────────┘
               │
               │  HTTP POST localhost:47831
               │  Bearer token auth
               ▼
┌─────────────────────────────────┐
│   Local Bridge                  │
│   Express + WebSocket           │
│   Job queue · localhost only    │
└──────────────┬──────────────────┘
               │
               │  WebSocket (or HTTP polling)
               ▼
┌─────────────────────────────────┐
│   Photoshop UXP Plugin          │
│   Panel inside Photoshop        │
│   DOM APIs + batchPlay          │
└──────────────┬──────────────────┘
               │
               ▼
         Adobe Photoshop
         PSD / PNG / ZIP output
```

---

## Demo Workflows (Public-Safe)

All demos use fictional content safe for public GitHub.

| Demo | Output |
|------|--------|
| Premium Mobile Game UI | 3 PSDs · PNG previews · Layer PNGs · README · ZIP |
| Instagram Post Pack | 1080×1350 layered template |
| App Store Screenshot | 1290×2796 layered layout |
| Unity UI Export | Transparent PNGs per group |

**Fictional demo project:** *Color Crate Sort* — a generic casual puzzle game used to demonstrate premium mobile UI structure. Not a real game.

---

## Installation

### Requirements

- Node.js ≥ 18
- pnpm ≥ 8
- Adobe Photoshop 2024+ (for live mode)
- [Adobe UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/devtool/)

### Setup

```bash
# Clone
git clone https://github.com/Remirdy/PhotoshopMCP.git
cd PhotoshopMCP

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env: set REMIRDY_BRIDGE_TOKEN to a random hex string
# openssl rand -hex 32
```

### Start the Local Bridge

```bash
pnpm dev:bridge
# Bridge starts at http://127.0.0.1:47831
```

### Load the UXP Plugin

1. Open Adobe UXP Developer Tool
2. Add Plugin → select `photoshop-uxp-plugin/manifest.json`
3. Click Load
4. In Photoshop: Plugins → Remirdy MCP
5. Enter your bridge token, click **Connect Bridge**

### Start the MCP Server

```bash
pnpm dev:mcp
```

### Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "remirdy-photoshop": {
      "command": "npx",
      "args": ["tsx", "/path/to/remirdy-photoshop-mcp/apps/mcp-server/src/index.ts"],
      "env": {
        "BRIDGE_URL": "http://localhost:47831",
        "REMIRDY_BRIDGE_TOKEN": "your_token_here",
        "REMIRDY_WORKSPACE": "/Users/yourname/remirdy-workspace"
      }
    }
  }
}
```

---

## Example Prompts

### Check Connection
```
Check if Photoshop is connected and show the active document.
```

### Create a Game UI Document
```
Create a 1290×2796 premium mobile game UI PSD called "ColorCrateSort_Demo"
with a dark purple background (#140B2E). Create groups for:
01_BG, 02_GAMEPLAY_SCENE (with Game_Board, Puzzle_Area, Tile_Placeholders,
Crate_Row, Lighting_FX), 03_UI (with Top_HUD and Bottom_HUD), 04_POPUP.
Then create the coin counter HUD at position 80,80 and level indicator at 490,80.
```

### Run a Complete Case Pack
```
Run the premium_mobile_game_ui_case workflow preset for "Color Crate Sort"
and save all exports to /tmp/exports/ColorCrateSort.
```

### Build from Design JSON
```
Run the design JSON at examples/premium-mobile-game-ui/design.json
and export the PSD and PNG preview.
```

### Audit a Document
```
Audit the current Photoshop document against the premium_mobile_game_ui standard.
Check for required groups, text editability, and naming quality.
Give me a score and list of issues.
```

### Export Everything
```
Auto export the current document: save PSD, flattened PNG, individual group PNGs,
generate a README, create a manifest, and zip everything up.
Project name: Color Crate Sort. Output: /tmp/exports/ColorCrateSort
```

---

## Example Tool Calls

```json
// Create document
{
  "tool": "create_document",
  "arguments": {
    "name": "ColorCrateSort_GameplayUI_Demo",
    "preset": "iphone_15_pro_max_game",
    "backgroundColor": "#140B2E"
  }
}

// Create layer tree
{
  "tool": "create_layer_tree",
  "arguments": {
    "groups": [
      { "name": "01_BG" },
      { "name": "02_GAMEPLAY_SCENE", "children": [
        { "name": "Game_Board" },
        { "name": "Puzzle_Area" },
        { "name": "Crate_Row" }
      ]},
      { "name": "03_UI", "children": [
        { "name": "Top_HUD" },
        { "name": "Bottom_HUD" }
      ]},
      { "name": "04_POPUP" }
    ]
  }
}

// Create HUD component
{
  "tool": "create_hud_coin_counter",
  "arguments": {
    "x": 80,
    "y": 80,
    "value": 2450,
    "parentGroup": "03_UI/Top_HUD",
    "style": "premium_purple"
  }
}

// Export everything
{
  "tool": "auto_export_delivery",
  "arguments": {
    "projectName": "Color Crate Sort",
    "outputFolder": "/tmp/exports/ColorCrateSort",
    "includeLayerPNGs": true,
    "includeReadme": true,
    "includeManifest": true,
    "zip": true
  }
}
```

---

## Two Operating Modes

### Layer Automation Mode *(primary)*
Creates real editable Photoshop layers: vector shapes, editable text, layer groups, smart objects. All positioning, naming, grouping, and text layers are fully editable in Photoshop.

### Raster Assist Mode
Places AI-generated PNG assets as Smart Object layers into named, organized groups. Layers are clearly labeled as raster assets — not editable vectors. Useful when game art comes from an image generator.

> **Important:** Raster asset layers are never presented as editable vectors. The layer naming and grouping structure remains clean and professional regardless of asset type.

---

## Project Structure

```
remirdy-photoshop-mcp/
├── apps/
│   ├── mcp-server/        # MCP server (TypeScript)
│   │   └── src/
│   │       ├── tools/     # 60+ tool handlers
│   │       ├── bridge/    # Bridge HTTP client
│   │       ├── resources/ # MCP resources
│   │       └── prompts/   # MCP prompts
│   └── local-bridge/      # HTTP + WebSocket bridge (TypeScript)
│       └── src/
├── packages/
│   └── shared/            # Shared types, schemas, design tokens
│       └── src/
├── photoshop-uxp-plugin/  # Adobe Photoshop UXP panel
│   └── src/
│       ├── photoshop/     # DOM + batchPlay API wrappers
│       ├── jobs/          # Job handler registry
│       └── ui/            # Panel CSS
├── examples/
│   ├── premium-mobile-game-ui/   # design.json + README
│   ├── instagram-post/
│   ├── app-store-screenshot/
│   └── unity-ui-export/
├── docs/                  # Architecture, setup, security, roadmap
└── scripts/               # Dev, build, zip utilities
```

---

## Scripts

```bash
pnpm dev:bridge       # Start local bridge
pnpm dev:mcp          # Start MCP server
pnpm dev              # Start both in parallel
pnpm build            # Build all packages
pnpm zip:plugin       # Package UXP plugin as .ccx
pnpm create:demo-assets  # Create placeholder demo assets
pnpm typecheck        # TypeScript check all packages
```

---

## MCP Resources

| URI | Description |
|-----|-------------|
| `photoshop://status` | Connection status |
| `photoshop://active-document` | Active document info |
| `photoshop://layer-tree` | Current layer hierarchy |
| `photoshop://recent-jobs` | Job history |
| `photoshop://templates` | Available workflow presets |
| `photoshop://design-tokens/premium-game-ui` | Design token values |
| `photoshop://docs/tool-reference` | Tool reference markdown |
| `photoshop://docs/public-safe-demos` | Demo policy |

## MCP Prompts

| Prompt | Description |
|--------|-------------|
| `/create-game-ui-psd` | Step-by-step game UI creation guide |
| `/premium-mobile-game-ui-case` | Full 3-document case pack workflow |
| `/social-post-pack` | Social media template workflow |
| `/unity-ui-export` | Unity transparent PNG export |
| `/audit-current-psd` | QA audit workflow |

---

## Security Notes

- Bridge binds to `127.0.0.1` only — not accessible from network
- All connections require a shared token (`REMIRDY_BRIDGE_TOKEN`)
- All file paths validated against configured workspace folders
- batchPlay allowlist prevents destructive Photoshop commands
- No shell commands executed from MCP tool inputs
- See [`docs/SECURITY.md`](docs/SECURITY.md) for full details

---

## Known Limitations (MVP)

1. **Shape vector masks not fully implemented** — shapes are created as solid color layers. The batchPlay descriptors for vector rounded-rect and circle masks need recording in Photoshop and adding to `shapeApi.js`. See `docs/ARCHITECTURE.md#batchplay-shapes`.
2. **Layer effects (shadows, strokes) not yet wired** — the batchPlay descriptor stubs exist in `batchPlayApi.js` but the full descriptors need to be recorded.
3. **`transform_layer` scale/rotation** — position works via DOM `translate()`, but scale/rotation require batchPlay descriptors.
4. **Asset placement** — `placeAsset` has a batchPlay `placeEvent` stub that requires the full recorded descriptor.
5. **In-memory job queue** — jobs don't persist across bridge restarts.
6. **No artboard support** — MVP creates standard documents, not artboard-based.

All these are tracked in [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Contributing

This is a public-safe open-source project. When contributing:
- All demo content must be fictional and generic
- Do not add real client/studio references
- Do not commit real PSD/PNG files (covered by `.gitignore`)
- Follow existing TypeScript patterns and Zod validation conventions

---

## License

MIT

---

*Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) · Adobe UXP · TypeScript*
