/**
 * UXP Plugin — imageApi.js
 * Document sizing, cropping, transformations, and color modes.
 */
import { batchPlay } from "photoshop/action";

/**
 * Resizes the image canvas.
 */
export async function imageResize({ width, height, resolution = 72 }) {
  await batchPlay([
    {
      _obj: "imageSize",
      width: { _unit: "pixelsUnit", _value: width },
      height: { _unit: "pixelsUnit", _value: height },
      resolution: { _unit: "densityUnit", _value: resolution },
      scaleStyles: true,
      constrainProportions: true,
      interfaceIconFrameDimmed: 1
    }
  ], { synchronousExecution: false });
  return { resized: true, width, height, resolution };
}

/**
 * Crops the document canvas.
 */
export async function cropCanvas({ bounds }) {
  await batchPlay([
    {
      _obj: "crop",
      to: {
        _obj: "rectangle",
        top: { _unit: "pixelsUnit", _value: bounds.top },
        left: { _unit: "pixelsUnit", _value: bounds.left },
        bottom: { _unit: "pixelsUnit", _value: bounds.bottom },
        right: { _unit: "pixelsUnit", _value: bounds.right }
      }
    }
  ], { synchronousExecution: false });
  return { cropped: true, bounds };
}

/**
 * Rotates the document canvas.
 */
export async function rotateCanvas({ angle = 90 }) {
  await batchPlay([
    {
      _obj: "rotate",
      angle: { _unit: "angleUnit", _value: angle }
    }
  ], { synchronousExecution: false });
  return { rotated: true, angle };
}

/**
 * Converts document color mode.
 */
export async function convertColorMode({ mode }) {
  // mode: "RGB", "CMYK", "Grayscale"
  let toModeClass = "RGBColorMode";
  if (mode === "CMYK") toModeClass = "CMYKColorMode";
  else if (mode === "Grayscale") toModeClass = "grayscaleMode";

  await batchPlay([
    {
      _obj: "convertMode",
      to: { _class: toModeClass }
    }
  ], { synchronousExecution: false });
  return { converted: true, mode };
}
