/**
 * UXP Plugin — batchPlayApi.js
 * Safe batchPlay wrapper with allowlist validation.
 */
import { batchPlay } from "photoshop/action";
import { logger } from "../utils/logger.js";

const SAFE_IDS = new Set([
  "set", "make", "select", "move", "duplicate", "delete",
  "group", "ungroup", "rasterizeLayer", "flattenImage",
  "mergeVisible", "applyImageAdjustment", "addNoise",
  "gaussianBlur", "colorBalance", "hueSaturation", "curves",
  "levels", "brightnessContrast", "save", "saveAs", "export",
]);

/**
 * Run a batchPlay descriptor with safety validation.
 */
export async function runBatchPlayDescriptor(payload) {
  const { descriptor, reason, allowDangerous = false } = payload;

  const actionId = descriptor._obj;
  if (!allowDangerous && !SAFE_IDS.has(actionId)) {
    throw new Error(
      `batchPlay action "${actionId}" is not in the safe allowlist. Reason: ${reason}. Pass allowDangerous=true to override.`
    );
  }

  logger.info(`batchPlay: executing "${actionId}" — reason: ${reason}`);

  const result = await batchPlay([descriptor], {
    synchronousExecution: false,
    modalBehavior: "fail",
  });

  return { actionId, result, reason };
}

// ─── Pre-built batchPlay helpers ─────────────────────────────────────────────

/**
 * Apply a drop shadow layer effect to the currently selected layer.
 * @param {object} opts - { opacity, blur, distance, angle, color }
 */
export async function applyDropShadow(opts) {
  const { opacity = 35, blur = 18, distance = 8, angle = 90, color = "#000000" } = opts;
  const [r, g, b] = hexToChannels(color);

  return await runBatchPlayDescriptor({
    descriptor: {
      _obj: "set",
      _target: [
        { _property: "layerEffects", _ref: "property" },
        { _enum: "ordinal", _ref: "layer", _value: "targetEnum" }
      ],
      to: {
        _obj: "layerEffects",
        dropShadow: {
          _obj: "dropShadow",
          enabled: true,
          mode: { _enum: "blendMode", _value: "multiply" },
          color: { _obj: "RGBColor", red: r, grain: g, blue: b },
          opacity: { _unit: "percentUnit", _value: opacity },
          localLightingAngle: { _unit: "angleUnit", _value: angle },
          distance: { _unit: "pixelsUnit", _value: distance },
          chokeMatte: { _unit: "pixelsUnit", _value: 0 },
          blur: { _unit: "pixelsUnit", _value: blur },
          useGlobalAngle: true,
          present: true,
          showInDialog: false
        }
      }
    },
    reason: "Apply drop shadow layer style",
    allowDangerous: false
  });
}

/**
 * Apply inner shadow layer effect.
 */
export async function applyInnerShadow(opts) {
  const { opacity = 35, blur = 18, distance = 8, angle = 90, color = "#000000" } = opts;
  const [r, g, b] = hexToChannels(color);

  return await runBatchPlayDescriptor({
    descriptor: {
      _obj: "set",
      _target: [
        { _property: "layerEffects", _ref: "property" },
        { _enum: "ordinal", _ref: "layer", _value: "targetEnum" }
      ],
      to: {
        _obj: "layerEffects",
        innerShadow: {
          _obj: "innerShadow",
          enabled: true,
          mode: { _enum: "blendMode", _value: "multiply" },
          color: { _obj: "RGBColor", red: r, grain: g, blue: b },
          opacity: { _unit: "percentUnit", _value: opacity },
          localLightingAngle: { _unit: "angleUnit", _value: angle },
          distance: { _unit: "pixelsUnit", _value: distance },
          chokeMatte: { _unit: "pixelsUnit", _value: 0 },
          blur: { _unit: "pixelsUnit", _value: blur },
          useGlobalAngle: true,
          present: true,
          showInDialog: false
        }
      }
    },
    reason: "Apply inner shadow layer style",
    allowDangerous: false
  });
}

/**
 * Apply stroke layer effect.
 * @param {object} opts - { color, width }
 */
export async function applyStroke(opts) {
  const { color = "#000000", width = 3 } = opts;
  const [r, g, b] = hexToChannels(color);

  return await runBatchPlayDescriptor({
    descriptor: {
      _obj: "set",
      _target: [
        { _property: "layerEffects", _ref: "property" },
        { _enum: "ordinal", _ref: "layer", _value: "targetEnum" }
      ],
      to: {
        _obj: "layerEffects",
        frameFX: {
          _obj: "frameFX",
          enabled: true,
          style: { _enum: "frameStyle", _value: "outF" }, // Outside
          paintType: { _enum: "paintType", _value: "solidColor" },
          size: { _unit: "pixelsUnit", _value: width },
          color: { _obj: "RGBColor", red: r, grain: g, blue: b },
          opacity: { _unit: "percentUnit", _value: 100 },
          present: true,
          showInDialog: false
        }
      }
    },
    reason: "Apply stroke layer style",
    allowDangerous: false
  });
}

function hexToChannels(hex) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
