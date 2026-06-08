# Tool Reference

Quick reference for all 60+ MCP tools. Full schemas are in each tool registration file.

## Connection

| Tool | Description |
|------|-------------|
| `photoshop_status` | Check UXP plugin connection status |
| `photoshop_ping` | Ping Photoshop, get response time |
| `bridge_status` | Check local bridge health |

## Document

| Tool | Description |
|------|-------------|
| `create_document` | Create new PSD with preset or custom size |
| `open_document` | Open existing PSD/PNG/JPG |
| `close_document` | Close active document |
| `save_document` | Save as PSD/PSB/PNG/JPG |
| `set_canvas_background` | Create background fill layer |

## Layer & Group

| Tool | Description |
|------|-------------|
| `create_group` | Create a layer group/folder |
| `create_layer_tree` | Create nested group hierarchy at once |
| `rename_layer` | Rename layer by current name |
| `move_layer` | Move to absolute pixel coords |
| `transform_layer` | Position, scale, rotate, opacity |
| `duplicate_layer` | Duplicate with new name |
| `delete_layer` | Delete layer or group |
| `lock_layer` | Lock/unlock a layer |
| `set_layer_visibility` | Show/hide a layer |
| `reorder_layer` | Restack: front/back/above/below |

## Shape

| Tool | Description |
|------|-------------|
| `create_rectangle_shape` | Editable rect/rounded-rect vector |
| `create_circle_shape` | Editable circle/ellipse vector |
| `create_line_shape` | Multi-point line/polygon |
| `create_safe_area_guides` | Mobile safe area overlays |

## Text

| Tool | Description |
|------|-------------|
| `create_text_layer` | Editable text layer |
| `update_text_layer` | Update content/font/color |
| `create_label_badge` | Rounded badge with text |

## Asset

| Tool | Description |
|------|-------------|
| `place_asset` | Place PNG/JPG/PSD as Smart Object |
| `place_asset_grid` | Place multiple assets in grid |
| `replace_asset_layer` | Swap Smart Object contents |
| `export_layer_as_png` | Export single layer as PNG |
| `export_group_as_png` | Export group as PNG |
| `export_all_top_level_groups` | Export all top groups as PNGs |

## UI Components

| Tool | Description |
|------|-------------|
| `create_hud_coin_counter` | Full coin counter HUD group |
| `create_hud_level_indicator` | Level indicator HUD group |
| `create_settings_button` | Settings button shell |
| `create_booster_button` | Single booster button |
| `create_booster_row` | Row of booster buttons |
| `create_popup_modal` | Confirmation popup |
| `create_dim_scrim` | Popup dim scrim |

## Game Layout

| Tool | Description |
|------|-------------|
| `create_mobile_game_layer_structure` | Full game UI group tree |
| `create_mobile_game_case_pack` | 3-document delivery pack |
| `create_social_post_template` | Social media template |
| `create_app_store_screenshot_template` | App Store screenshot layout |

## Workflow

| Tool | Description |
|------|-------------|
| `run_design_json` | Build PSD from JSON spec |
| `run_workflow_preset` | Run named workflow preset |
| `smart_layer_naming` | Rename generic layers professionally |
| `preflight_delivery_check` | QA before delivery |
| `auto_export_delivery` | One-command full export + ZIP |
| `generate_layer_manifest` | JSON manifest from layer tree |
| `rebuild_from_layer_manifest` | Rebuild PSD from manifest |
| `convert_folder_to_layered_psd` | Folder of PNGs → layered PSD |
| `create_case_study_pack` | Full delivery pack |

## Inspection / QA

| Tool | Description |
|------|-------------|
| `inspect_document` | Document info |
| `inspect_layer_tree` | Full layer hierarchy |
| `find_layer` | Search layers by name |
| `audit_required_layers` | Check required groups exist |
| `audit_game_ui_case` | Score against mobile game standard |
| `generate_delivery_readme` | README_LAYER_STRUCTURE.txt |
| `package_delivery_zip` | Create delivery ZIP |

## Selection & Effects

| Tool | Description |
|------|-------------|
| `select_layer_bounds` | Select layer pixel bounds |
| `create_mask_from_layer` | Layer-based mask |
| `apply_clipping_mask` | Clip layer to layer below |
| `apply_layer_effect_preset` | Apply named effect preset |
| `apply_style_to_group` | Retheme entire group |

## Developer

| Tool | Description |
|------|-------------|
| `record_action_descriptor_helper` | How to record batchPlay actions |
| `run_batchplay_descriptor` | Safe batchPlay escape hatch |
| `get_recent_jobs` | Job history |
| `get_job_result` | Get specific job result |
| `cancel_job` | Cancel queued job |
