import type { Context, MiddlewareFn } from "telegraf";
import { SessionRepository, type SessionData } from "../../storage/session.repository.js";

export interface BotState {
  session: SessionData;
  saveSession: (session: SessionData) => Promise<void>;
}

export interface BotContext extends Context {
  state: BotState;
}

export function sessionMiddleware(sessionRepository: SessionRepository): MiddlewareFn<BotContext> {
  return async (ctx, next) => {
    const chatId = ctx.chat?.id ?? ctx.from?.id;
    if (typeof chatId !== "number") {
      return next();
    }

    const session = await sessionRepository.getSession(chatId);
    ctx.state = {
      session,
      saveSession: async (updatedSession) => sessionRepository.saveSession(chatId, updatedSession),
    };

    return next();
  };
}
