import fs from "fs/promises";
import path from "path";
import { logger } from "./logger.js";

const LOG_FILE = path.resolve(process.cwd(), "logs", "compile-errors.log");

async function ensureLogDirectory(): Promise<void> {
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
}

export async function logCompileError(options: {
  fileName?: string;
  chatId?: number;
  source?: string;
  correctedSource?: string;
  error: string;
  stage?: string;
}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    fileName: options.fileName ?? "unknown",
    chatId: options.chatId ?? null,
    stage: options.stage ?? "compile",
    error: options.error,
    sourceSnippet: options.source ? options.source.slice(0, 1024) : undefined,
    correctedSourceSnippet: options.correctedSource ? options.correctedSource.slice(0, 1024) : undefined,
  };

  try {
    await ensureLogDirectory();
    await fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (logError) {
    logger.error("Unable to write compile error log", { error: logError });
  }
}
