import type { Telegraf } from "telegraf";
import { saveTempFile } from "../../utils/file-system.js";
import type { SessionRepository } from "../../storage/session.repository.js";
import type { CompilerService } from "../../services/compiler.service.js";
import type { GitHubService } from "../../services/github.service.js";
import type { BotContext } from "../middlewares/session.middleware.js";
import { compileKeyboard } from "../keyboards/inline.keyboards.js";
import type { StatusService } from "../../services/status.service.js";

interface Dependencies {
  sessionRepository: SessionRepository;
  compilerService: CompilerService;
  githubService: GitHubService;
  statusService: StatusService;
}

const isSourcePayload = (text: string | undefined) => {
  return (
    typeof text === "string" &&
    text.length > 24 &&
    /\b(contract|function|pragma|tact|extern|module)\b/i.test(text)
  );
};

const getSourceExtension = (text: string): ".fc" | ".tact" => {
  if (/\btact\b/i.test(text)) {
    return ".tact";
  }
  return ".fc";
};

const extractGithubUrl = (text: string | undefined): string | null => {
  if (!text) {
    return null;
  }

  const match = text.match(/https?:\/\/(?:raw\.)?github\.com\/[\w\-./]+/i);
  return match ? match[0] : null;
};

const isSupportedFile = (fileName: string | undefined) => {
  return fileName?.toLowerCase().endsWith(".fc") ||
    fileName?.toLowerCase().endsWith(".func") ||
    fileName?.toLowerCase().endsWith(".tact");
};

export function registerFileHandlers(bot: Telegraf<BotContext>, deps: Dependencies) {
  bot.on("text", async (ctx) => {
    const text = ctx.message?.text;
    const githubUrl = extractGithubUrl(text);
    const chatId = ctx.chat?.id;
    deps.statusService.record("handler", "Text update received", {
      chatId,
      githubUrl,
      textLength: text?.length ?? 0,
    });

    if (!chatId) {
      return;
    }

    if (githubUrl) {
      deps.statusService.record("handler", "GitHub URL detected in text", { chatId, githubUrl });
      try {
        const files = await deps.githubService.extractTonFiles(githubUrl);
        if (files.length === 0) {
          await ctx.reply("No TON contract files were found in that GitHub repository.");
          return;
        }

        const fileNames = files.map((file) => file.path).join("\n");
        const primary = files[0];
        await deps.sessionRepository.updateSession(chatId, {
          code: primary.content,
          fileName: primary.path,
          githubFiles: files.map((file) => ({ path: file.path, extension: file.extension, content: file.content })),
          state: "source_received",
        });

        await ctx.reply(
          `Imported ${files.length} TON contract file(s) from GitHub:\n${fileNames}\n\nUsing ${primary.path} as the active contract source.`,
          compileKeyboard(),
        );
        return;
      } catch (error) {
        deps.statusService.record("handler", "GitHub import failed", { chatId, error: (error as Error).message });
        await ctx.reply(`Unable to import from GitHub: ${(error as Error).message}`);
        return;
      }
    }

    if (!isSourcePayload(text)) {
      return;
    }

    const extension = getSourceExtension(text ?? "");
    const fileName = `session-${chatId}${extension}`;
    deps.statusService.record("handler", "Source text captured", { chatId, fileName, extension });
    await saveTempFile(fileName, text ?? "");
    await deps.sessionRepository.updateSession(chatId, {
      code: text,
      fileName,
      state: "source_received",
    });

    await ctx.reply(`Contract source captured as ${fileName}. Use the buttons below to compile or deploy.`, compileKeyboard());
  });

  bot.on("document", async (ctx) => {
    const document = ctx.message?.document;
    if (!document) {
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) {
      return;
    }

    const fileName = document.file_name;
    deps.statusService.record("handler", "Document upload received", { chatId, fileName });
    if (!isSupportedFile(fileName)) {
      await ctx.reply("Please upload a .fc, .func, or .tact contract file for compilation.");
      return;
    }

    const link = await ctx.telegram.getFileLink(document.file_id);
    const response = await fetch(link.href);
    const source = await response.text();
    await deps.sessionRepository.updateSession(chatId, {
      code: source,
      fileName,
      state: "source_received",
    });

    deps.statusService.record("handler", "Document upload processed", { chatId, fileName });
    await ctx.reply(`Uploaded ${fileName}. Ready to compile.`, compileKeyboard());
  });
}
