import type { Telegraf } from "telegraf";
import { logger } from "../../utils/logger.js";
import type { SessionRepository } from "../../storage/session.repository.js";
import type { TonConnectService } from "../../services/ton-connect.service.js";
import type { GitHubService } from "../../services/github.service.js";
import { compileKeyboard } from "../keyboards/inline.keyboards.js";
import type { BotContext } from "../middlewares/session.middleware.js";

interface Dependencies {
  sessionRepository: SessionRepository;
  tonConnectService: TonConnectService;
  githubService: GitHubService;
  statusService: import("../../services/status.service.js").StatusService;
}

export function registerCommandHandlers(bot: Telegraf<BotContext>, deps: Dependencies) {
  bot.start(async (ctx) => {
    deps.statusService.record("command", "Start command invoked", { chatId: ctx.chat?.id ?? null });
    await ctx.reply(
      "Welcome to TON IDE Bot. Send your FunC contract source as text or upload a .fc file, then tap Compile Now.",
    );
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      "Use /wallet to get a TON Connect link, /import <github-url> to fetch TON contract files from GitHub, /compile to compile your current session contract, or /deploy to prepare a deployment payload.",
    );
  });

  bot.command("import", async (ctx) => {
    const chatId = ctx.chat?.id;
    deps.statusService.record("command", "Import command requested", { chatId, text: ctx.message?.text });
    if (!chatId) {
      return;
    }

    const text = ctx.message?.text?.trim();
    const parts = text?.split(/\s+/) ?? [];
    const url = parts.slice(1).join(" ").trim();

    if (!url) {
      await ctx.reply("Usage: /import <github-url>\nExample: /import https://github.com/user/repo/tree/main/contracts");
      return;
    }

    await ctx.reply("Importing TON files from GitHub, please wait...");
    deps.statusService.record("command", "Import flow started", { chatId, githubUrl: url });

    try {
      const files = await deps.githubService.extractTonFiles(url);
      if (files.length === 0) {
        await ctx.reply("No TON contract files were found in that GitHub repository.");
        return;
      }

      const primary = files[0];
      await deps.sessionRepository.updateSession(chatId, {
        code: primary.content,
        fileName: primary.path,
        githubFiles: files.map((file) => ({ path: file.path, extension: file.extension, content: file.content })),
        state: "source_received",
      });

      await ctx.reply(
        `Imported ${files.length} TON file(s) from GitHub. Using ${primary.path} as the active source.`,
        compileKeyboard(),
      );
    } catch (error) {
      deps.statusService.record("command", "Import command failed", { chatId, error: (error as Error).message });
      await ctx.reply(`Unable to import from GitHub: ${(error as Error).message}`);
    }
  });

  bot.command("wallet", async (ctx) => {
    const chatId = ctx.chat?.id;
    deps.statusService.record("command", "Wallet command invoked", { chatId });
    const link = deps.tonConnectService.createDeepLink({ type: "connect" });
    await ctx.reply(`Connect your wallet with TON Connect:\n${link}`);
  });

  bot.command("compile", async (ctx) => {
    const chatId = ctx.chat?.id;
    deps.statusService.record("command", "Compile command invoked", { chatId });
    if (!chatId) {
      return;
    }

    const session = await deps.sessionRepository.getSession(chatId);
    if (!session.code) {
      await ctx.reply("No contract source is available yet. Paste your code or upload a contract file first.");
      return;
    }

    logger.info("Manual compile command invoked", { chatId });
    deps.statusService.record("command", "Compile command confirmed ready", { chatId, fileName: session.fileName });
    await ctx.reply("A contract is present in your session. Use the Compile Now button to start the build.");
  });

  bot.command("deploy", async (ctx) => {
    const chatId = ctx.chat?.id;
    deps.statusService.record("command", "Deploy command invoked", { chatId });
    if (!chatId) {
      return;
    }

    const session = await deps.sessionRepository.getSession(chatId);
    if (!session.compiled) {
      await ctx.reply("No compiled contract available. Run compile before deploying.");
      return;
    }

    if (session.deploymentPayload) {
      await ctx.reply("A deployment payload has already been prepared. Tap Deploy Now again if you want to re-create it.");
      return;
    }

    await ctx.reply("Deployment payload is ready. Tap Deploy Now using the inline UI.");
  });
}
