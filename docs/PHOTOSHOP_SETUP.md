# Photoshop UXP Plugin Setup

## Requirements

- Adobe Photoshop 2024 (version 24.0) or later
- [Adobe UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/devtool/) (free)

## Loading the Plugin

### Method 1: UXP Developer Tool (Development)

1. Install Adobe UXP Developer Tool from [Creative Cloud](https://developer.adobe.com/photoshop/uxp/devtool/)
2. Open UXP Developer Tool
3. Click **"Add Plugin"**
4. Navigate to `photoshop-uxp-plugin/` and select `manifest.json`
5. Click **"Load"**
6. The "Remirdy MCP" panel should appear in Photoshop → Plugins → Remirdy MCP

### Method 2: Packaged Plugin (.ccx)

```bash
# Build and package the plugin
pnpm zip:plugin

# This creates: remirdy-photoshop-mcp.ccx
# Double-click the .ccx file to install in Photoshop
```

## Connecting to the Bridge

1. Start the local bridge first:
   ```bash
   pnpm dev:bridge
   ```

2. In the Remirdy MCP panel in Photoshop:
   - Set **Bridge URL** to: `ws://127.0.0.1:47831`
   - Set **Token** to your `REMIRDY_BRIDGE_TOKEN` value from `.env`
   - Click **Connect Bridge**
   - Status badge should turn green: ● Connected

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Panel doesn't appear | Plugins menu → Remirdy MCP |
| Cannot connect | Check bridge is running: `curl http://127.0.0.1:47831/health` |
| Token error | Ensure `.env` token matches what's in the plugin |
| Execution errors | Open UXP DevTools (⇧⌘D) to see console logs |

## UXP Developer Tools Console

To see plugin logs:
1. UXP Developer Tool → Connect to "Remirdy MCP"
2. Click **DevTools** → Console tab

All operations log with prefix `[remirdy-uxp]`.

## Network Permissions

The plugin requests permission to access:
- `http://localhost:47831` — HTTP API
- `ws://localhost:47831` — WebSocket
- `http://127.0.0.1:47831` — HTTP API
- `ws://127.0.0.1:47831` — WebSocket

These are declared in `manifest.json` under `requiredPermissions.network`.
No external network access is required.
