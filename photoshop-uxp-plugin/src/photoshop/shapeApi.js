/**
 * UXP Plugin — shapeApi.js
 * Shape layer creation using batchPlay (Photoshop DOM lacks rich shape API).
 */
import { executeAsModal, batchPlay } from "photoshop/action";
import { app, constants } from "photoshop";
import { resolveLayerPath } from "./layerApi.js";
import { hexToRgb } from "./colorUtils.js";
import { logger } from "../utils/logger.js";
import { applyDropShadow, applyStroke } from "./batchPlayApi.js";

/**
 * Create a rectangle (optionally rounded) shape layer via batchPlay.
 */
export async function createRectangleShape(payload) {
  const { name, x, y, width, height, radius = 0, fill, stroke, shadow, parentGroup } = payload;

  return executeAsModal(async () => {
    const doc = app.activeDocument;

    // Select parent group if needed
    const parentLayer = parentGroup ? resolveLayerPath(doc, parentGroup) : null;

    // batchPlay: create solid color fill layer with shape geometry
    const rgb = fill ? hexToRgb(fill) : { r: 50, g: 27, b: 88 };

    const result = await batchPlay([
      {
        _obj: "make",
        _target: [{ _ref: "contentLayer" }],
        using: {
          _obj: "contentLayer",
          type: {
            _obj: "solidColorLayer",
            color: { _obj: "RGBColor", red: rgb.r, green: rgb.g, blue: rgb.b },
          },
          shape: {
            _obj: "rectangle",
            top: { _unit: "pixelsUnit", _value: y },
            left: { _unit: "pixelsUnit", _value: x },
            bottom: { _unit: "pixelsUnit", _value: y + height },
            right: { _unit: "pixelsUnit", _value: x + width },
            topLeftCorner: { _unit: "pixelsUnit", _value: radius },
            topRightCorner: { _unit: "pixelsUnit", _value: radius },
            bottomLeftCorner: { _unit: "pixelsUnit", _value: radius },
            bottomRightCorner: { _unit: "pixelsUnit", _value: radius },
          },
          name,
        },
      },
    ], { synchronousExecution: false });

    const layerId = result[0]?._id;

    // Apply stroke if specified
    if (stroke) {
      await applyStroke({ color: stroke.color, width: stroke.width });
    }

    // Apply drop shadow if specified
    if (shadow && shadow.enabled !== false) {
      await applyDropShadow(shadow);
    }

    // Move to correct parent group
    if (parentLayer) {
      const createdLayer = doc.layers[0];
      if (createdLayer) {
        await createdLayer.move(parentLayer, constants.ElementPlacement.PLACEINSIDE);
      }
    }

    logger.info(`createRectangleShape: created "${name}" (layerId=${layerId})`);
    return { layerId, name, x, y, width, height, fill };
  }, { commandName: `Create Rectangle: ${name}` });
}

/**
 * Create a circle shape layer.
 */
export async function createCircleShape(payload) {
  const { name, x, y, diameter, fill, stroke, parentGroup } = payload;

  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const parentLayer = parentGroup ? resolveLayerPath(doc, parentGroup) : null;
    const rgb = fill ? hexToRgb(fill) : { r: 247, g: 184, b: 51 };

    const result = await batchPlay([
      {
        _obj: "make",
        _target: [{ _ref: "contentLayer" }],
        using: {
          _obj: "contentLayer",
          type: {
            _obj: "solidColorLayer",
            color: { _obj: "RGBColor", red: rgb.r, green: rgb.g, blue: rgb.b },
          },
          shape: {
            _obj: "ellipse",
            top: { _unit: "pixelsUnit", _value: y },
            left: { _unit: "pixelsUnit", _value: x },
            bottom: { _unit: "pixelsUnit", _value: y + diameter },
            right: { _unit: "pixelsUnit", _value: x + diameter },
          },
          name,
        },
      },
    ], { synchronousExecution: false });

    const layerId = result[0]?._id;

    // Apply stroke if specified
    if (stroke) {
      await applyStroke({ color: stroke.color, width: stroke.width });
    }

    // Move to correct parent group
    if (parentLayer) {
      const createdLayer = doc.layers[0];
      if (createdLayer) {
        await createdLayer.move(parentLayer, constants.ElementPlacement.PLACEINSIDE);
      }
    }

    return { layerId, name, x, y, diameter };
  }, { commandName: `Create Circle: ${name}` });
}

/**
 * Create a text layer.
 */
export async function createTextLayer(payload) {
  const { name, text, x, y, fontSize = 32, color = "#FFFFFF", fontFamily = "Arial", align = "left", parentGroup } = payload;

  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const parentLayer = parentGroup ? resolveLayerPath(doc, parentGroup) : null;
    const rgb = hexToRgb(color);

    const target = parentLayer ?? doc;
    const layer = await target.createTextLayer({
      name,
      contents: text,
      fontSize,
      fontName: fontFamily,
      color: { red: rgb.r, green: rgb.g, blue: rgb.b },
    });

    // Position the text layer
    const bounds = layer.bounds;
    await layer.translate(x - (bounds.left ?? 0), y - (bounds.top ?? 0));

    // Set alignment via DOM
    try {
      if (layer.textItem && layer.textItem.paragraphStyle) {
        const justifyMap = {
          left: "LEFT",
          center: "CENTER",
          right: "RIGHT"
        };
        layer.textItem.paragraphStyle.justification = justifyMap[align] || "LEFT";
      }
    } catch (e) {
      logger.warn("Could not set justification directly: " + e.message);
    }

    return { layerId: layer.id, name: layer.name, text, x, y, fontSize };
  }, { commandName: `Create Text: ${name}` });
}

/**
 * Update an existing text layer.
 */
export async function updateTextLayer(payload) {
  const { layerName, text, fontSize, color, fontFamily } = payload;
  const { findLayerByName } = await import("./layerApi.js");

  return executeAsModal(async () => {
    const doc = app.activeDocument;
    const layer = findLayerByName(doc.layers, layerName);
    if (!layer) throw new Error(`Text layer "${layerName}" not found`);

    const textItem = layer.textItem;
    if (!textItem) throw new Error(`Layer "${layerName}" is not a text layer`);

    if (text !== undefined) textItem.contents = text;
    if (fontSize !== undefined) textItem.size = fontSize;
    if (color) {
      const rgb = hexToRgb(color);
      textItem.color = { red: rgb.r, green: rgb.g, blue: rgb.b };
    }
    if (fontFamily !== undefined) textItem.font = fontFamily;

    return { updated: true, layerName };
  }, { commandName: `Update Text: ${layerName}` });
}
