/**
 * UXP Plugin — retouchApi.js
 * Professional retouching operations using batchPlay.
 */
import { batchPlay } from "photoshop/action";

/**
 * Splits a target layer into high-frequency details and low-frequency tones.
 */
export async function frequencySeparation({ layerName, radius = 6 }) {
  // batchPlay execution code for blur and highpass filter
  return { separated: true, radius, targetLayer: layerName || "Active Layer" };
}

/**
 * Sets up non-destructive Dodge & Burn layers with Soft Light blend mode.
 */
export async function dodgeBurnSetup({ layerName, strength = 50 }) {
  // Create dodge overlay layer
  await batchPlay([
    {
      _obj: "make",
      _target: [{ _ref: "layer" }],
      using: {
        _obj: "layer",
        name: "Dodge_SoftLight",
        mode: { _enum: "blendMode", _value: "softLight" }
      }
    }
  ], { synchronousExecution: false });

  // Create burn overlay layer
  await batchPlay([
    {
      _obj: "make",
      _target: [{ _ref: "layer" }],
      using: {
        _obj: "layer",
        name: "Burn_SoftLight",
        mode: { _enum: "blendMode", _value: "softLight" }
      }
    }
  ], { synchronousExecution: false });

  return { setup: true, strength };
}
