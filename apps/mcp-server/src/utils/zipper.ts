/**
 * mcp-server — zipper.ts
 * ZIP archive creation using archiver.
 */
import archiver from "archiver";
import fs from "fs";
import path from "path";

export async function createZip(sourceFolder: string, outputZipPath: string): Promise<void> {
  const resolved = path.resolve(sourceFolder);
  const outputResolved = path.resolve(outputZipPath);

  fs.mkdirSync(path.dirname(outputResolved), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputResolved);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(resolved, path.basename(resolved));
    archive.finalize();
  });
}
