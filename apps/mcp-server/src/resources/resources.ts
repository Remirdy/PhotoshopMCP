/**
 * mcp-server — resources.ts
 * MCP resources: photoshop status, layer tree, job history, templates, design tokens, docs.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bridgeClient } from "../bridge/bridgeClient.js";
import { THEMES, WORKFLOW_PRESETS } from "@remirdy/shared";

export function registerResources(server: McpServer): void {
  // ─── photoshop://status ──────────────────────────────────────────────────────
  server.resource(
    "photoshop-status",
    "photoshop://status",
    async (uri) => {
      const health = await bridgeClient.healthCheck();
      const status = health.ok ? await bridgeClient.photoshopStatus() : null;
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                bridgeConnected: health.ok,
                bridgeMessage: health.message,
                photoshopConnected: status?.connected ?? false,
                pluginVersion: status?.pluginVersion ?? null,
                photoshopVersion: status?.photoshopVersion ?? null,
                activeDocument: status?.activeDocument ?? null,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ─── photoshop://active-document ─────────────────────────────────────────────
  server.resource(
    "photoshop-active-document",
    "photoshop://active-document",
    async (uri) => {
      const result = await bridgeClient.sendJob("inspectDocument", {});
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result.data ?? { error: "No document open" }, null, 2),
          },
        ],
      };
    }
  );

  // ─── photoshop://layer-tree ───────────────────────────────────────────────────
  server.resource(
    "photoshop-layer-tree",
    "photoshop://layer-tree",
    async (uri) => {
      const result = await bridgeClient.sendJob("inspectLayerTree", { includeHidden: true });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result.data ?? { layers: [] }, null, 2),
          },
        ],
      };
    }
  );

  // ─── photoshop://recent-jobs ──────────────────────────────────────────────────
  server.resource(
    "photoshop-recent-jobs",
    "photoshop://recent-jobs",
    async (uri) => {
      const result = await bridgeClient.sendJob("getRecentJobs", { limit: 20 });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result.data ?? [], null, 2),
          },
        ],
      };
    }
  );

  // ─── photoshop://templates ────────────────────────────────────────────────────
  server.resource(
    "photoshop-templates",
    "photoshop://templates",
    async (uri) => {
      const templates = Object.keys(WORKFLOW_PRESETS).map((key) => ({
        preset: key,
        documentName: WORKFLOW_PRESETS[key].document.name,
        width: WORKFLOW_PRESETS[key].document.width,
        height: WORKFLOW_PRESETS[key].document.height,
        groupCount: WORKFLOW_PRESETS[key].groups?.length ?? 0,
      }));
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ templates }, null, 2),
          },
        ],
      };
    }
  );

  // ─── photoshop://design-tokens/premium-game-ui ────────────────────────────────
  server.resource(
    "photoshop-design-tokens-premium-game-ui",
    "photoshop://design-tokens/premium-game-ui",
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(THEMES["premium_game_ui"], null, 2),
        },
      ],
    })
  );

  // ─── photoshop://docs/tool-reference ─────────────────────────────────────────
  server.resource(
    "photoshop-docs-tool-reference",
    "photoshop://docs/tool-reference",
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: TOOL_REFERENCE_MD,
        },
      ],
    })
  );

  // ─── photoshop://docs/public-safe-demos ──────────────────────────────────────
  server.resource(
    "photoshop-docs-public-safe-demos",
    "photoshop://docs/public-safe-demos",
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: PUBLIC_SAFE_DEMOS_MD,
        },
      ],
    })
  );
}

const TOOL_REFERENCE_MD = `
# Remirdy Photoshop MCP — Tool Reference

## Connection Tools
- \`photoshop_status\` — Check plugin connection status
- \`photoshop_ping\` — Ping Photoshop and get response time
- \`bridge_status\` — Check bridge server health

## Document Tools
- \`create_document\` — Create a new PSD with preset or custom size
- \`open_document\` — Open an existing file
- \`close_document\` — Close active document
- \`save_document\` — Save as PSD, PSB, PNG, or JPG
- \`set_canvas_background\` — Create background fill/gradient layer

## Layer & Group Tools
- \`create_group\` — Create a layer group
- \`create_layer_tree\` — Create nested group tree in one call
- \`rename_layer\` / \`move_layer\` / \`transform_layer\`
- \`duplicate_layer\` / \`delete_layer\` / \`lock_layer\`
- \`set_layer_visibility\` / \`reorder_layer\`

## Shape Tools
- \`create_rectangle_shape\` — Editable rounded rect / button
- \`create_circle_shape\` — Editable circle/ellipse
- \`create_line_shape\` — Multi-point line/polygon
- \`create_safe_area_guides\` — Mobile safe area overlays

## Text Tools
- \`create_text_layer\` — Editable text layer
- \`update_text_layer\` — Update existing text
- \`create_label_badge\` — Rounded badge with text

## Asset Tools
- \`place_asset\` — Place PNG/JPG/PSD as Smart Object
- \`place_asset_grid\` — Place multiple assets in grid
- \`replace_asset_layer\` — Swap Smart Object contents
- \`export_layer_as_png\` / \`export_group_as_png\`
- \`export_all_top_level_groups\`

## UI Component Tools
- \`create_hud_coin_counter\` — Full coin counter HUD group
- \`create_hud_level_indicator\` — Level indicator HUD group
- \`create_settings_button\` — Settings button shell
- \`create_booster_button\` / \`create_booster_row\`
- \`create_popup_modal\` — Confirmation popup
- \`create_dim_scrim\` — Popup background scrim

## Workflow Tools
- \`run_design_json\` — Build PSD from JSON spec
- \`run_workflow_preset\` — Run a named preset
- \`create_mobile_game_layer_structure\` — Full game UI group tree
- \`create_mobile_game_case_pack\` — Full 3-document delivery pack
- \`smart_layer_naming\` — Rename generic layers professionally
- \`preflight_delivery_check\` — QA before delivery
- \`auto_export_delivery\` — One-command full export + ZIP

## Inspection & QA Tools
- \`inspect_document\` / \`inspect_layer_tree\` / \`find_layer\`
- \`audit_required_layers\` — Check for required groups
- \`audit_game_ui_case\` — Score PSD against mobile game UI standard
- \`generate_delivery_readme\` / \`package_delivery_zip\`

## Developer Tools
- \`run_batchplay_descriptor\` — Advanced batchPlay escape hatch
- \`get_recent_jobs\` / \`get_job_result\` / \`cancel_job\`
- \`record_action_descriptor_helper\` — How to record PS actions
`.trim();

const PUBLIC_SAFE_DEMOS_MD = `
# Public Safe Demo Policy

All demo content in Remirdy Photoshop MCP is **fully fictional and public-safe**.

## Demo Project: Color Crate Sort

A generic fictional casual puzzle mobile game used for demo workflows.

- **No real client names or studio names are referenced**
- **No confidential art test content is included**
- **No private briefs or case study materials are present**
- **All layer names, design specs, and export examples are invented**

## What This Means for GitHub

This repository is safe to publish on GitHub as a public open-source project.
The demo content exists purely to demonstrate the MCP tool capabilities.

## Fictional Public-Safe Workflows
1. Color Crate Sort — Premium Mobile Game UI
2. Instagram Post Pack — Social media template
3. App Store Screenshot — Layered screenshot layout
4. Unity UI Export — Transparent PNG export workflow

All of these are generic, fictional, and contain no proprietary information.
`.trim();
