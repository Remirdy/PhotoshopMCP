/**
 * scripts/zip-plugin.ts
 * Packages the photoshop-uxp-plugin into a .ccx (ZIP) file for distribution.
 */
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLUGIN_DIR = path.join(ROOT, "photoshop-uxp-plugin");
const OUTPUT = path.join(ROOT, "remirdy-photoshop-mcp.ccx");

console.log("📦 Packaging UXP plugin...");

const output = fs.createWriteStream(OUTPUT);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`✅ Plugin packaged: ${OUTPUT} (${archive.pointer()} bytes)`);
  console.log("   Load in Photoshop: UXP Developer Tool → Load → select the .ccx file");
});

archive.on("error", (err) => { throw err; });
archive.pipe(output);
archive.directory(PLUGIN_DIR, false);
archive.finalize();
