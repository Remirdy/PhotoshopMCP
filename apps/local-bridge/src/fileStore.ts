/**
 * local-bridge — fileStore.ts
 * Manages temporary design JSON and asset files for the bridge workspace.
 */
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { logger } from "./logger.js";

export class FileStore {
  private tmpDir: string;
  private assetsDir: string;

  constructor(workspace: string) {
    this.tmpDir = path.join(workspace, ".remirdy", "tmp");
    this.assetsDir = path.join(workspace, ".remirdy", "assets");
    fs.mkdirSync(this.tmpDir, { recursive: true });
    fs.mkdirSync(this.assetsDir, { recursive: true });
  }

  /**
   * Write an object as JSON to a temp file. Returns the absolute path.
   */
  writeDesignJson(data: unknown, name?: string): string {
    const filename = `${name ?? `design_${nanoid(8)}`}.json`;
    const filePath = path.join(this.tmpDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.debug("Design JSON written", { filePath });
    return filePath;
  }

  /**
   * Read a JSON file from tmp directory.
   */
  readDesignJson(filePath: string): unknown {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  }

  /**
   * Ensure an output folder exists and return its resolved path.
   */
  ensureOutputFolder(folderPath: string): string {
    const resolved = path.resolve(folderPath);
    fs.mkdirSync(resolved, { recursive: true });
    return resolved;
  }

  /**
   * Write a text file (e.g., README).
   */
  writeText(filePath: string, content: string): void {
    const resolved = path.resolve(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, "utf-8");
    logger.debug("Text file written", { filePath: resolved });
  }

  /**
   * Check if a file exists.
   */
  exists(filePath: string): boolean {
    try {
      fs.accessSync(path.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  }

  get tmpPath(): string { return this.tmpDir; }
  get assetsPath(): string { return this.assetsDir; }
}
