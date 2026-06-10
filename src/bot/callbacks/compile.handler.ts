import type { Telegraf } from "telegraf";
import { compileKeyboard, deployKeyboard } from "../keyboards/inline.keyboards.js";
import type { SessionRepository } from "../../storage/session.repository.js";
import type { CompilerService } from "../../services/compiler.service.js";
import type { BotContext } from "../middlewares/session.middleware.js";
import type { StatusService } from "../../services/status.service.js";

interface Dependencies {
  sessionRepository: SessionRepository;
  compilerService: CompilerService;
  statusService: StatusService;
}

export function registerCompileCallback(bot: Telegraf<BotContext>, deps: Dependencies) {
  bot.action("compile_now", async (ctx) => {
    const chatId = ctx.chat?.id;
    deps.statusService.record("callback", "Compile button pressed", { chatId });
    if (!chatId) {
      return;
    }

    const session = await deps.sessionRepository.getSession(chatId);
    if (!session.code) {
      await ctx.answerCbQuery("No contract source available. Paste or upload a contract first.");
      return;
    }

    await ctx.answerCbQuery("Compiling contract...");
    deps.statusService.record("callback", "Compile action acknowledged", { chatId });

    try {
      const extraSources = (session.githubFiles ?? []).map((sourceFile) => ({
        filename: sourceFile.path,
        content: sourceFile.content,
      }));

      const compiled = await deps.compilerService.compileSource(
        session.code,
        session.fileName ?? `contract-${chatId}.fc`,
        extraSources,
      );

      const updatedSession: Record<string, unknown> = {
        compiled,
        contractAddress: compiled.address,
        state: "compiled",
      };

      if (compiled.correctedSource) {
        updatedSession.code = compiled.correctedSource;
      }

      await deps.sessionRepository.updateSession(chatId, updatedSession);
      deps.statusService.record("callback", "Compilation succeeded", { chatId, address: compiled.address, autoCorrected: compiled.wasAutoCorrected });

      const correctionNote = compiled.wasAutoCorrected
        ? "\n✅ The contract was automatically corrected and recompiled."
        : "";

      await ctx.editMessageText(
        `✅ Contract compiled successfully. Address: ${compiled.address}${correctionNote}`,
        { reply_markup: compileKeyboard()?.reply_markup },
      );

      await ctx.reply(
        "Your contract is now ready to deploy. Tap Deploy Now or use /deploy.",
        deployKeyboard(compiled.address),
      );
    } catch (error) {
      deps.statusService.record("callback", "Compilation failed", { chatId, error: (error as Error).message });
      await ctx.reply(`Compilation failed: ${(error as Error).message}`);
    }
  });
}
