import type { Telegraf } from "telegraf";
import type { SessionRepository } from "../../storage/session.repository.js";
import type { DeployerService } from "../../services/deployer.service.js";
import type { TonConnectService } from "../../services/ton-connect.service.js";
import type { BotContext } from "../middlewares/session.middleware.js";
import type { StatusService } from "../../services/status.service.js";

interface Dependencies {
  sessionRepository: SessionRepository;
  deployerService: DeployerService;
  tonConnectService: TonConnectService;
  statusService: StatusService;
}

export function registerDeployCallback(bot: Telegraf<BotContext>, deps: Dependencies) {
  bot.action("deploy_now", async (ctx) => {
    const chatId = ctx.chat?.id;
    deps.statusService.record("callback", "Deploy button pressed", { chatId });
    if (!chatId) {
      return;
    }

    const session = await deps.sessionRepository.getSession(chatId);
    if (!session.compiled) {
      await ctx.answerCbQuery("Compile the contract first before deploying.");
      return;
    }

    await ctx.answerCbQuery("Preparing deployment payload...");
    deps.statusService.record("callback", "Deploy action acknowledged", { chatId });
    const payload = await deps.deployerService.prepareDeploymentPayload(session.compiled.boc);
    const deepLink = deps.tonConnectService.createDeepLink({
      type: "deploy",
      payload,
    });

    await deps.sessionRepository.updateSession(chatId, {
      deploymentPayload: payload,
      state: "deployment_ready",
    });
    deps.statusService.record("callback", "Deployment payload generated", {
      chatId,
      estimatedGas: payload.estimatedGas,
    });

    await ctx.reply("Deployment payload generated. Open it in your wallet to continue.");
    await ctx.reply(deepLink);
  });
}
