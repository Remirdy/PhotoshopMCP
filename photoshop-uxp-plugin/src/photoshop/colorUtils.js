/**
 * UXP Plugin — colorUtils.js
 * Hex color parsing utilities.
 */

/**
 * Parse a hex color string to {r, g, b} (0–255).
 */
export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Convert {r,g,b} to hex string.
 */
export function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}
