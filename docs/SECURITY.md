# Security

## Threat Model

Remirdy Photoshop MCP is a **local-only developer tool**. It is not designed to be exposed to the internet or multi-user environments. All security controls target the local development scenario.

## Controls

### Network Isolation
- Bridge binds to `127.0.0.1` only. Never `0.0.0.0`.
- All bridge HTTP/WS connections require a shared secret token.
- The UXP plugin only connects to `localhost`.

### Authentication
- `REMIRDY_BRIDGE_TOKEN` is a shared secret between MCP server and UXP plugin.
- Generate with: `openssl rand -hex 32`
- Set in `.env` — never commit to git (`.gitignore` covers `.env`).

### Path Traversal Prevention
- All file path inputs are validated against an allowlist of configured workspace folders.
- Paths are `path.resolve()`d and checked with `startsWith(allowedBase)`.
- Requests with paths outside allowed folders are rejected with a 400 error.

### batchPlay Allowlist
- Only allowlisted action IDs can be used without `allowDangerous: true`.
- The server environment must have `ALLOW_DANGEROUS_BATCHPLAY=true` to permit dangerous descriptors.
- Never set `ALLOW_DANGEROUS_BATCHPLAY=true` in production.

### No Shell Execution
- MCP tools never execute shell commands from user input.
- File operations use Node.js `fs` APIs only.

### Input Validation
- All MCP tool inputs are validated with Zod schemas before any processing.
- Malformed inputs return a structured error, never crash the server.

## Known Limitations

1. **Token is plaintext** — the token is a static shared secret, not a rotating credential.
2. **No TLS** — the bridge uses plain HTTP/WS. Since it's localhost-only, this is acceptable.
3. **Single-tenant** — designed for a single developer on one machine.

## Responsible Use

This tool gives AI assistants the ability to create and modify files on your machine via Photoshop. Review what the AI is doing before approving export operations to new paths.
