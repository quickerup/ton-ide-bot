import fs from "fs/promises";
import path from "path";
import { logger } from "./logger.js";

const TEMP_DIR = path.resolve(process.cwd(), "temp");

export async function buildTempPath(filename: string): Promise<string> {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  return path.join(TEMP_DIR, `${Date.now()}-${filename}`);
}

export async function saveTempFile(filename: string, content: string): Promise<string> {
  const filePath = await buildTempPath(filename);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

export async function removeTempFile(filePath: string): Promise<void> {
  try {
    await fs.rm(filePath, { force: true });
  } catch (error) {
    logger.warn("Failed to remove temp file", { filePath, error });
  }
}

export async function cleanupTempDirectory(): Promise<void> {
  try {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  } catch (error) {
    logger.warn("Failed to cleanup temp directory", { error });
  }
}
