import type { MiddlewareFn } from "telegraf";
import type { BotContext } from "./session.middleware.js";
import { StatusService } from "../../services/status.service.js";

export function loggingMiddleware(statusService: StatusService): MiddlewareFn<BotContext> {
  return async (ctx, next) => {
    const chatId = ctx.chat?.id ?? ctx.from?.id;
    const message = ctx.message as { text?: string; document?: { file_name?: string } } | undefined;
    const callback = ctx.callbackQuery as { data?: string } | undefined;

    statusService.record("middleware", "Incoming update", {
      updateType: ctx.updateType,
      chatId,
      userId: ctx.from?.id,
      username: ctx.from?.username,
      text: message?.text,
      callbackData: callback?.data,
      documentName: message?.document?.file_name,
    });

    await next();

    statusService.record("middleware", "Handler finished", {
      updateType: ctx.updateType,
      chatId,
      username: ctx.from?.username,
    });
  };
}
