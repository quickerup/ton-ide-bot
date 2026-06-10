import { logger } from "./utils/logger.js";
import { createBot } from "./bot/bot.js";
import { createRedisConnection } from "./storage/redis.connection.js";
import { env } from "./config/environment.js";
import { StatusService } from "./services/status.service.js";
import { startStatusServer } from "./server/status.server.js";

async function main() {
  logger.info("Starting TON IDE bot...");

  const statusService = new StatusService();
  const statusServer = await startStatusServer(statusService, env.STATUS_PORT);
  statusService.record("startup", "Status server started", { port: env.STATUS_PORT });
  const redis = createRedisConnection();
  const bot = await createBot(redis, statusService);

  if (env.TELEGRAM_WEBHOOK_URL) {
    const port = Number(env.PORT);
    logger.info(`Launching bot with webhook on port ${port}`);
    await bot.launch({
      webhook: {
        domain: env.TELEGRAM_WEBHOOK_URL,
        port,
        hookPath: `/webhook/${env.TELEGRAM_BOT_TOKEN}`,
      },
    });
  } else {
    logger.info("Launching bot in polling mode");
    await bot.launch();
  }

  process.once("SIGINT", () => shutdown(bot, redis, statusServer));
  process.once("SIGTERM", () => shutdown(bot, redis, statusServer));
}

async function shutdown(bot: { stop: () => void }, redis: { disconnect: () => void }, statusServer?: { close: () => void }) {
  logger.info("Stopping TON IDE bot...");
  bot.stop();
  redis.disconnect();
  if (statusServer) {
    statusServer.close();
  }
  process.exit(0);
}

main().catch((error) => {
  logger.error("Fatal startup error", { error });
  process.exit(1);
});
