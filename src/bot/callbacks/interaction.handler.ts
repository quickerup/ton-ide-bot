import type { Telegraf } from "telegraf";
import type { TonClientService } from "../../services/ton-client.service.js";
import type { BotContext } from "../middlewares/session.middleware.js";
import type { StatusService } from "../../services/status.service.js";

interface Dependencies {
  tonClientService: TonClientService;
  statusService: StatusService;
}

export function registerInteractionCallback(bot: Telegraf<BotContext>, deps: Dependencies) {
  bot.action(/interact_.+/, async (ctx) => {
    const callbackQuery = ctx.callbackQuery as { data?: string } | undefined;
    const data = callbackQuery?.data;
    if (!data) {
      return;
    }

    const contractAddress = data.replace(/^interact_/, "");
    deps.statusService.record("callback", "Interaction button pressed", { chatId: ctx.chat?.id ?? null, contractAddress });
    await ctx.answerCbQuery("Loading contract state...");

    try {
      const accountState = await deps.tonClientService.getAccountState(contractAddress);
      await ctx.reply(`Contract ${contractAddress} state:\n${JSON.stringify(accountState, null, 2)}`);
    } catch (error) {
      await ctx.reply(`Unable to fetch contract info: ${(error as Error).message}`);
    }
  });
}
