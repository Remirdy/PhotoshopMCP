/**
 * UXP Plugin — documentApi.js
 * Photoshop document operations using DOM APIs + batchPlay where needed.
 */
import { executeAsModal, batchPlay } from "photoshop/action";
import { app, constants } from "photoshop";
import { logger } from "../utils/logger.js";
import { hexToRgb } from "./colorUtils.js";

const PRESETS = {
  iphone_15_pro_max_game: { width: 1290, height: 2796 },
  instagram_post_4x5:     { width: 1080, height: 1350 },
  instagram_story:        { width: 1080, height: 1920 },
  app_store_screenshot:   { width: 1290, height: 2796 },
  unity_ui_atlas:         { width: 2048, height: 2048 },
};

/**
 * Create a new Photoshop document.
 */
export async function createDocument(payload) {
  const { name, width, height, resolution = 72, colorMode = "RGB", backgroundColor = "#FFFFFF", transparent = false, preset } = payload;

  let docWidth = width;
  let docHeight = height;
  if (preset && preset !== "custom" && PRESETS[preset]) {
    docWidth = PRESETS[preset].width;
    docHeight = PRESETS[preset].height;
  }

  return executeAsModal(async () => {
    let doc;
    try {
      doc = await app.documents.add({
        width: docWidth,
        height: docHeight,
        resolution,
        name,
        mode: colorMode === "RGB" ? 2 : (colorMode === "CMYK" ? 3 : 1),
        fill: transparent ? 1 /* transparent */ : 2 /* backgroundColor */,
      });
    } catch (err) {
      logger.warn(`documents.add failed, falling back to batchPlay: ${err.message}`);
      await batchPlay([
        {
          _obj: "make",
          _target: [{ _ref: "document" }],
          using: {
            _obj: "document",
            name,
            width: { _unit: "pixelsUnit", _value: docWidth },
            height: { _unit: "pixelsUnit", _value: docHeight },
            resolution: { _unit: "densityUnit", _value: resolution },
            mode: { _enum: "colorMode", _value: colorMode === "CMYK" ? "CMYKColorMode" : "RGBColorMode" },
            fill: { _enum: "fill", _value: transparent ? "transparent" : "white" },
          },
        },
      ], { synchronousExecution: false });
      doc = app.activeDocument;
    }

    // Set background color if not transparent
    if (!transparent && backgroundColor !== "#FFFFFF") {
      await fillBackgroundColor(doc, backgroundColor);
    }

    return {
      documentId: doc.id,
      name: doc.title,
      width: doc.width,
      height: doc.height,
      resolution: doc.resolution,
    };
  }, { commandName: "Create Document" });
}

/**
 * Fill background layer with a solid color using batchPlay.
 */
async function fillBackgroundColor(doc, hexColor) {
  const rgb = hexToRgb(hexColor);
  await batchPlay([
    {
      _obj: "make",
      _target: [{ _ref: "contentLayer" }],
      using: {
        _obj: "contentLayer",
        type: {
          _obj: "solidColorLayer",
          color: { _obj: "RGBColor", red: rgb.r, green: rgb.g, blue: rgb.b },
        },
        name: "Background",
      },
    },
  ], { synchronousExecution: false });

  // Move background layer to the bottom of the stack
  const newBgLayer = doc.layers[0];
  if (newBgLayer && doc.layers.length > 1) {
    const bottomLayer = doc.layers[doc.layers.length - 1];
    await newBgLayer.move(bottomLayer, constants.ElementPlacement.PLACEAFTER);
  }
}

/**
 * Open an existing document.
 */
export async function openDocument(payload) {
  const { path: filePath } = payload;
  return executeAsModal(async () => {
    const doc = await app.open(filePath);
    return { documentId: doc.id, name: doc.title };
  }, { commandName: "Open Document" });
}

/**
 * Close active document.
 */
export async function closeDocument(payload) {
  const { save = false } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document");
    if (save) {
      await doc.save();
    }
    await doc.close(save ? 1 /* save */ : 2 /* don't save */);
    return { closed: true };
  }, { commandName: "Close Document" });
}

/**
 * Save active document.
 */
export async function saveDocument(payload) {
  const { path: outputPath, format = "psd" } = payload;
  return executeAsModal(async () => {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document");

    switch (format) {
      case "psd":
      case "psb":
        await doc.saveAs.psd(outputPath, {}, true);
        break;
      case "png":
        await doc.saveAs.png(outputPath, { compression: 6 }, true);
        break;
      case "jpg":
        await doc.saveAs.jpg(outputPath, { quality: 95 }, true);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return { saved: true, path: outputPath, format };
  }, { commandName: "Save Document" });
}

/**
 * Inspect the active document.
 */
export async function inspectDocument() {
  const doc = app.activeDocument;
  if (!doc) return { error: "No active document" };

  return {
    name: doc.title,
    width: doc.width,
    height: doc.height,
    resolution: doc.resolution,
    colorMode: ["", "Grayscale", "RGB", "CMYK"][doc.mode] ?? "Unknown",
    layerCount: doc.layers.length,
    groupCount: doc.layers.filter(l => l.kind === "group").length,
  };
}
