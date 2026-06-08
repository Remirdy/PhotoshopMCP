/**
 * UXP Plugin — layerApi.js
 * Layer and group operations using Photoshop DOM APIs.
 */
import { executeAsModal, batchPlay } from "photoshop/action";
import { app, constants } from "photoshop";
import { logger } from "../utils/logger.js";

/**
 * Find a layer by name (recursive search).
 */
export function findLayerByName(layers, name) {
  for (const layer of layers) {
    if (layer.name === name) return layer;
    if (layer.layers) {
      const found = findLayerByName(layer.layers, name);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Resolve a nested path like "03_UI/Top_HUD" to a layer group.
 */
export function resolveLayerPath(doc, path) {
  if (!path) return null;
  const parts = path.split("/");
  let current = doc.layers;
  let layer = null;
  for (const part of parts) {
    layer = null;
    for (const l of current) {
      if (l.name === part) {
        layer = l;
        current = l.layers ?? [];
        break;
      }
    }
    if (!layer) return null;
  }
  return layer;
}

/**
 * Create a layer group.
 */
export async function createGroup(payload) {
  const { name, parentGroup, opacity = 100 } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const parent = parentGroup ? resolveLayerPath(doc, parentGroup) : null;
    const targetDoc = parent ?? doc;

    const group = await targetDoc.createLayerGroup({ name });
    group.opacity = opacity;
    return { groupId: group.id, name: group.name };
  }, { commandName: "Create Group" });
}

/**
 * Create a full nested layer tree from a descriptor array.
 */
export async function createLayerTree(payload) {
  const { groups } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const created = [];
    for (const descriptor of groups) {
      await createGroupRecursive(doc, descriptor, null, created);
    }
    return { created };
  }, { commandName: "Create Layer Tree" });
}

async function createGroupRecursive(doc, descriptor, parentGroup, created) {
  const target = parentGroup ?? doc;
  const group = await target.createLayerGroup({ name: descriptor.name });
  created.push(descriptor.name);

  if (descriptor.children) {
    for (const child of descriptor.children) {
      await createGroupRecursive(doc, child, group, created);
    }
  }
}

/**
 * Rename a layer.
 */
export async function renameLayer(payload) {
  const { from, to } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const layer = findLayerByName(doc.layers, from);
    if (!layer) throw new Error(`Layer "${from}" not found`);
    layer.name = to;
    return { renamed: true, from, to };
  }, { commandName: "Rename Layer" });
}

/**
 * Move a layer to absolute coordinates.
 */
export async function moveLayer(payload) {
  const { layerName, x, y } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const layer = findLayerByName(doc.layers, layerName);
    if (!layer) throw new Error(`Layer "${layerName}" not found`);

    const bounds = layer.bounds;
    const dx = x - bounds.left;
    const dy = y - bounds.top;
    await layer.translate(dx, dy);
    return { moved: true, layerName, x, y };
  }, { commandName: "Move Layer" });
}

/**
 * Transform a layer: position, scale, rotate, opacity.
 */
export async function transformLayer(payload) {
  const { layerName, x, y, scaleX = 100, scaleY = 100, rotation = 0, opacity = 100 } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const layer = findLayerByName(doc.layers, layerName);
    if (!layer) throw new Error(`Layer "${layerName}" not found`);

    layer.opacity = opacity;

    if (x !== undefined && y !== undefined) {
      const bounds = layer.bounds;
      await layer.translate(x - bounds.left, y - bounds.top);
    }

    // Select the layer to target it via targetEnum in batchPlay
    layer.select();

    // Scale and rotation via batchPlay
    if (scaleX !== 100 || scaleY !== 100 || rotation !== 0) {
      await batchPlay([
        {
          _obj: "transform",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
          width: { _unit: "percentUnit", _value: scaleX },
          height: { _unit: "percentUnit", _value: scaleY },
          angle: { _unit: "angleUnit", _value: rotation }
        }
      ], { synchronousExecution: false });
    }

    return { transformed: true, layerName };
  }, { commandName: "Transform Layer" });
}

/**
 * Reorder layer stacking position.
 */
export async function reorderLayer(payload) {
  const { layerName, position, targetLayer: targetLayerName } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const layer = findLayerByName(doc.layers, layerName);
    if (!layer) throw new Error(`Layer "${layerName}" not found`);

    const { ElementPlacement } = constants;

    if (position === "above" || position === "below") {
      if (!targetLayerName) throw new Error("targetLayer is required for 'above'/'below' positions");
      const refLayer = findLayerByName(doc.layers, targetLayerName);
      if (!refLayer) throw new Error(`Reference layer "${targetLayerName}" not found`);

      const placement = position === "above" ? ElementPlacement.PLACEBEFORE : ElementPlacement.PLACEAFTER;
      await layer.move(refLayer, placement);
    } else if (position === "front") {
      const topLayer = doc.layers[0];
      if (topLayer && topLayer !== layer) {
        await layer.move(topLayer, ElementPlacement.PLACEBEFORE);
      }
    } else if (position === "back") {
      const bottomLayer = doc.layers[doc.layers.length - 1];
      if (bottomLayer && bottomLayer !== layer) {
        await layer.move(bottomLayer, ElementPlacement.PLACEAFTER);
      }
    }

    return { reordered: true, layerName, position };
  }, { commandName: "Reorder Layer" });
}

/**
 * Duplicate a layer.
 */
export async function duplicateLayer(payload) {
  const { layerName, newName } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const layer = findLayerByName(doc.layers, layerName);
    if (!layer) throw new Error(`Layer "${layerName}" not found`);
    const dup = await layer.duplicate();
    dup.name = newName;
    return { duplicated: true, newName };
  }, { commandName: "Duplicate Layer" });
}

/**
 * Delete a layer.
 */
export async function deleteLayer(payload) {
  const { layerName } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const layer = findLayerByName(doc.layers, layerName);
    if (!layer) throw new Error(`Layer "${layerName}" not found`);
    await layer.delete();
    return { deleted: true, layerName };
  }, { commandName: "Delete Layer" });
}

/**
 * Lock/unlock a layer.
 */
export async function lockLayer(payload) {
  const { layerName, lock } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const layer = findLayerByName(doc.layers, layerName);
    if (!layer) throw new Error(`Layer "${layerName}" not found`);
    layer.locked = lock;
    return { locked: lock, layerName };
  }, { commandName: "Lock Layer" });
}

/**
 * Show/hide a layer.
 */
export async function setLayerVisibility(payload) {
  const { layerName, visible } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const layer = findLayerByName(doc.layers, layerName);
    if (!layer) throw new Error(`Layer "${layerName}" not found`);
    layer.visible = visible;
    return { visible, layerName };
  }, { commandName: "Set Layer Visibility" });
}

/**
 * Inspect full layer tree recursively.
 */
export function inspectLayerTree(layers, includeHidden = true) {
  return Array.from(layers)
    .filter(l => includeHidden || l.visible)
    .map(l => ({
      id: l.id,
      name: l.name,
      type: l.kind ?? "unknown",
      visible: l.visible,
      locked: l.locked ?? false,
      opacity: l.opacity,
      bounds: l.bounds
        ? { x: l.bounds.left, y: l.bounds.top, width: l.bounds.width, height: l.bounds.height }
        : undefined,
      children: l.layers ? inspectLayerTree(l.layers, includeHidden) : undefined,
    }));
}

/**
 * Find layers by name substring.
 */
export function findLayers(layers, query) {
  const results = [];
  for (const layer of layers) {
    if (layer.name.toLowerCase().includes(query.toLowerCase())) {
      results.push({ id: layer.id, name: layer.name, type: layer.kind });
    }
    if (layer.layers) {
      results.push(...findLayers(layer.layers, query));
    }
  }
  return results;
}
