/**
 * UXP Plugin — exportApi.js
 * PSD and PNG export operations.
 */
import { executeAsModal, batchPlay } from "photoshop/action";
import { app } from "photoshop";
import { findLayerByName, resolveLayerPath } from "./layerApi.js";
import { logger } from "../utils/logger.js";

/**
 * Export active document as PNG.
 */
export async function exportPng(payload) {
  const { outputPath } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    await doc.saveAs.png(outputPath, { compression: 6, interlaced: false }, true);
    return { exported: true, path: outputPath, format: "png" };
  }, { commandName: "Export PNG" });
}

/**
 * Export active document as PSD.
 */
export async function exportPsd(payload) {
  const { outputPath } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    await doc.saveAs.psd(outputPath, {}, true);
    return { exported: true, path: outputPath, format: "psd" };
  }, { commandName: "Export PSD" });
}

/**
 * Export a single layer as transparent PNG.
 * Method: hide all other layers, export, restore visibility.
 */
export async function exportLayerAsPng(payload) {
  const { layerName, outputPath, trimTransparent = true } = payload;

  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const targetLayer = findLayerByName(doc.layers, layerName);
    if (!targetLayer) throw new Error(`Layer "${layerName}" not found`);

    // Save visibility state
    const visibilityMap = new Map();
    saveVisibility(doc.layers, visibilityMap);

    // Hide everything except target
    hideAll(doc.layers);
    targetLayer.visible = true;

    // Export
    await doc.saveAs.png(outputPath, { compression: 6 }, true);

    // Restore visibility
    restoreVisibility(doc.layers, visibilityMap);

    return { exported: true, path: outputPath, layerName };
  }, { commandName: `Export Layer PNG: ${layerName}` });
}

/**
 * Export a group as transparent PNG.
 */
export async function exportGroupAsPng(payload) {
  const { groupName, outputPath, trimTransparent = true } = payload;

  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const group = resolveLayerPath(doc, groupName);
    if (!group) throw new Error(`Group "${groupName}" not found`);

    const visibilityMap = new Map();
    saveVisibility(doc.layers, visibilityMap);
    hideAll(doc.layers);
    group.visible = true;

    await doc.saveAs.png(outputPath, { compression: 6 }, true);
    restoreVisibility(doc.layers, visibilityMap);

    return { exported: true, path: outputPath, groupName };
  }, { commandName: `Export Group PNG: ${groupName}` });
}

/**
 * Export all top-level groups as separate PNGs.
 */
export async function exportAllTopLevelGroups(payload) {
  const { outputFolder, prefix = "" } = payload;
  const exported = [];

  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const topGroups = Array.from(doc.layers).filter(l => l.kind === "group");

    for (const group of topGroups) {
      const safeName = group.name.replace(/[^A-Za-z0-9_\-]/g, "_");
      const outputPath = `${outputFolder}/${prefix}${safeName}.png`;

      const visibilityMap = new Map();
      saveVisibility(doc.layers, visibilityMap);
      hideAll(doc.layers);
      group.visible = true;

      await doc.saveAs.png(outputPath, { compression: 6 }, true);
      restoreVisibility(doc.layers, visibilityMap);
      exported.push({ group: group.name, path: outputPath });
    }

    return { exported };
  }, { commandName: "Export All Groups" });
}

// ─── Visibility helpers ───────────────────────────────────────────────────────

function saveVisibility(layers, map) {
  for (const layer of layers) {
    map.set(layer.id, layer.visible);
    if (layer.layers) saveVisibility(layer.layers, map);
  }
}

function hideAll(layers) {
  for (const layer of layers) {
    layer.visible = false;
    if (layer.layers) hideAll(layer.layers);
  }
}

function restoreVisibility(layers, map) {
  for (const layer of layers) {
    if (map.has(layer.id)) layer.visible = map.get(layer.id);
    if (layer.layers) restoreVisibility(layer.layers, map);
  }
}
