/**
 * UXP Plugin — adjustmentApi.js
 * Non-destructive adjustment layer operations.
 */
import { batchPlay } from "photoshop/action";

/**
 * Creates a Curves adjustment layer.
 */
export async function createCurvesAdjustment({ name = "Curves Adjustment" } = {}) {
  await batchPlay([
    {
      _obj: "make",
      _target: [{ _ref: "adjustmentLayer" }],
      using: {
        _obj: "adjustmentLayer",
        type: { _obj: "curves" },
        name
      }
    }
  ], { synchronousExecution: false });
  return { created: true, type: "curves", name };
}

/**
 * Creates a Hue/Saturation adjustment layer.
 */
export async function createHueSaturationAdjustment({ name = "Hue/Saturation", hue = 0, saturation = 0, lightness = 0 } = {}) {
  await batchPlay([
    {
      _obj: "make",
      _target: [{ _ref: "adjustmentLayer" }],
      using: {
        _obj: "adjustmentLayer",
        type: {
          _obj: "hueSaturation",
          adjustment: {
            _obj: "hueSatAdjustmentV2",
            hue,
            saturation,
            lightness
          }
        },
        name
      }
    }
  ], { synchronousExecution: false });
  return { created: true, type: "hueSaturation", name };
}
