# MCP Client Setup

## Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "remirdy-photoshop": {
      "command": "node",
      "args": ["/path/to/remirdy-photoshop-mcp/apps/mcp-server/dist/index.js"],
      "env": {
        "BRIDGE_URL": "http://localhost:47831",
        "REMIRDY_BRIDGE_TOKEN": "your_token_here",
        "REMIRDY_WORKSPACE": "/Users/yourname/remirdy-workspace",
        "MOCK_MODE": "false",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

> **Dev mode** (tsx, no build needed):
> ```json
> {
>   "command": "npx",
>   "args": ["tsx", "/path/to/apps/mcp-server/src/index.ts"]
> }
> ```

## Cursor

In `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "remirdy-photoshop": {
      "command": "node",
      "args": ["/path/to/remirdy-photoshop-mcp/apps/mcp-server/dist/index.js"],
      "env": {
        "BRIDGE_URL": "http://localhost:47831",
        "REMIRDY_BRIDGE_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Generating a Secure Token

```bash
openssl rand -hex 32
# → e.g. a9f3c1d7e8b2...
```

Put this in both `.env` files and the MCP client config.

## Verifying the Connection

After connecting the MCP client, call:

```
photoshop_status
```

Expected response when fully connected:
```json
{
  "ok": true,
  "data": {
    "connected": true,
    "pluginVersion": "0.1.0",
    "activeDocument": "Untitled-1",
    "photoshopVersion": "24.x.x"
  }
}
```

Expected response in mock mode:
```json
{
  "ok": true,
  "photoshopStatus": "disconnected",
  "warnings": ["Photoshop plugin not connected; mock output created."]
}
```
