import { executeAsModal, batchPlay } from "photoshop/action";
import { app, constants } from "photoshop";
import { resolveLayerPath } from "./layerApi.js";
import { logger } from "../utils/logger.js";

/**
 * Place an external file as a Smart Object layer.
 */
export async function placeAsset(payload) {
  const { path: assetPath, layerName, x = 0, y = 0, scale = 100, rotation = 0, parentGroup } = payload;

  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const parentLayer = parentGroup ? resolveLayerPath(doc, parentGroup) : null;

    // batchPlay: place embedded smart object
    await batchPlay([
      {
        _obj: "placeEvent",
        ID: 0,
        null: { _path: assetPath, _kind: "local" },
        linked: false,
        _isCommand: true,
      },
    ], { synchronousExecution: false });

    // The newly placed layer is the active layer at the top of the stack
    const placedLayer = doc.layers[0];
    if (placedLayer) {
      placedLayer.name = layerName;

      // Position the layer
      const bounds = placedLayer.bounds;
      await placedLayer.translate(x - (bounds.left ?? 0), y - (bounds.top ?? 0));

      // Scale and rotation
      if (scale !== 100 || rotation !== 0) {
        placedLayer.select();
        await batchPlay([
          {
            _obj: "transform",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
            freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
            width: { _unit: "percentUnit", _value: scale },
            height: { _unit: "percentUnit", _value: scale },
            angle: { _unit: "angleUnit", _value: rotation }
          }
        ], { synchronousExecution: false });
      }

      // Move into parent group if specified
      if (parentLayer) {
        await placedLayer.move(parentLayer, constants.ElementPlacement.PLACEINSIDE);
      }
    }

    return { placed: true, layerName, path: assetPath };
  }, { commandName: `Place Asset: ${layerName}` });
}

/**
 * Place multiple assets in a grid layout.
 */
export async function placeAssetGrid(payload) {
  const { assets, startX, startY, gapX = 160, gapY = 160, columns = 5, scale = 100, parentGroup } = payload;

  const placed = [];
  let col = 0;
  let row = 0;

  for (const asset of assets) {
    const x = startX + col * gapX;
    const y = startY + row * gapY;

    await placeAsset({
      path: asset.path,
      layerName: asset.layerName,
      x, y, scale,
      parentGroup,
    });

    placed.push({ layerName: asset.layerName, x, y });
    col++;
    if (col >= columns) { col = 0; row++; }
  }

  return { placed };
}
