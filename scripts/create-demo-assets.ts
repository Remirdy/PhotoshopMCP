/**
 * scripts/create-demo-assets.ts
 * Creates placeholder PNG assets for demo workflows (no Photoshop required).
 * Uses only Node.js built-ins — no canvas library needed.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(ROOT, "examples", "premium-mobile-game-ui", "assets");

fs.mkdirSync(ASSETS_DIR, { recursive: true });

// Create a minimal 1×1 transparent PNG as a placeholder.
// Each placeholder is named to match what the demo expects.
const TRANSPARENT_1x1_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
  "0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082",
  "hex"
);

const PLACEHOLDERS = [
  "crate-red.png", "crate-blue.png", "crate-green.png", "crate-yellow.png", "crate-pink.png",
  "booster-1.png", "booster-2.png", "booster-3.png",
  "booster-bomb.png", "warning-icon.png", "coin-icon.png", "settings-icon.png",
];

for (const name of PLACEHOLDERS) {
  const filePath = path.join(ASSETS_DIR, name);
  fs.writeFileSync(filePath, TRANSPARENT_1x1_PNG);
  console.log(`Created placeholder: ${name}`);
}

console.log(`\n✅ ${PLACEHOLDERS.length} placeholder assets created in:`);
console.log(`   ${ASSETS_DIR}`);
console.log("\nNote: Replace these with real artwork before delivery.");
