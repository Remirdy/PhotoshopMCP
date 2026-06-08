/**
 * UXP Plugin — characterApi.js
 * Character turnaround, rigging prep, and color variation pipeline.
 */
import * as layerApi from "./layerApi.js";

/**
 * Organizes character artwork segments into rig-ready hierarchy.
 */
export async function createRigReadyCharacter({ characterName, parts }) {
  const folders = parts || ["head", "torso", "arm_left", "arm_right", "leg_left", "leg_right"];
  const groups = folders.map(part => ({
    name: `Rig_${characterName}_${part}`
  }));
  await layerApi.createLayerTree({ groups });
  return { created: true, characterName, parts: folders };
}
