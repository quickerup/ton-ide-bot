import type Redis from "ioredis";

export interface SessionData {
  code?: string;
  fileName?: string;
  githubFiles?: Array<{ path: string; extension: string; content: string }>;
  compiled?: {
    boc: string;
    fift: string;
    abi: Record<string, unknown>;
  };
  contractAddress?: string;
  deploymentPayload?: {
    initData: string;
    estimatedGas: number;
    deploymentBoc: string;
  };
  walletAddress?: string;
  state?: string;
}

const buildKey = (chatId: number) => `session:${chatId}`;

export class SessionRepository {
  constructor(private readonly redis: Redis) {}

  async getSession(chatId: number): Promise<SessionData> {
    const raw = await this.redis.get(buildKey(chatId));
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as SessionData;
    } catch {
      return {};
    }
  }

  async saveSession(chatId: number, data: SessionData): Promise<void> {
    await this.redis.set(buildKey(chatId), JSON.stringify(data));
  }

  async clearSession(chatId: number): Promise<void> {
    await this.redis.del(buildKey(chatId));
  }

  async updateSession(chatId: number, partial: Partial<SessionData>): Promise<void> {
    const existing = await this.getSession(chatId);
    await this.saveSession(chatId, { ...existing, ...partial });
  }
}
