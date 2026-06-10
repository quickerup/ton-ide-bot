import { Telegraf } from "telegraf";
import type Redis from "ioredis";
import { logger } from "../utils/logger.js";
import { env } from "../config/environment.js";
import { SessionRepository } from "../storage/session.repository.js";
import { sessionMiddleware, type BotContext } from "./middlewares/session.middleware.js";
import { loggingMiddleware } from "./middlewares/logging.middleware.js";
import { registerCommandHandlers } from "./handlers/command.handler.js";
import { registerFileHandlers } from "./handlers/file.handler.js";
import { registerCompileCallback } from "./callbacks/compile.handler.js";
import { registerDeployCallback } from "./callbacks/deploy.handler.js";
import { registerInteractionCallback } from "./callbacks/interaction.handler.js";
import { CompilerService } from "../services/compiler.service.js";
import { DeployerService } from "../services/deployer.service.js";
import { TonConnectService } from "../services/ton-connect.service.js";
import { TonClientService } from "../services/ton-client.service.js";
import { GitHubService } from "../services/github.service.js";
import { StatusService } from "../services/status.service.js";

export async function createBot(redis: Redis, statusService: StatusService) {
  const bot = new Telegraf<BotContext>(env.TELEGRAM_BOT_TOKEN);
  const sessionRepository = new SessionRepository(redis);
  const compilerService = new CompilerService();
  const deployerService = new DeployerService();
  const tonConnectService = new TonConnectService(env.TON_CONNECT_HOST);
  const tonClientService = new TonClientService();
  const githubService = new GitHubService(env.GITHUB_TOKEN);

  bot.use(sessionMiddleware(sessionRepository));
  bot.use(loggingMiddleware(statusService));

  registerCommandHandlers(bot, {
    sessionRepository,
    tonConnectService,
    githubService,
    statusService,
  });

  registerFileHandlers(bot, {
    sessionRepository,
    compilerService,
    githubService,
    statusService,
  });

  registerCompileCallback(bot, {
    sessionRepository,
    compilerService,
    statusService,
  });

  registerDeployCallback(bot, {
    sessionRepository,
    deployerService,
    tonConnectService,
    statusService,
  });

  registerInteractionCallback(bot, {
    tonClientService,
    statusService,
  });

  bot.catch((error) => {
    logger.error("Telegram bot error", { error });
  });

  return bot;
}
