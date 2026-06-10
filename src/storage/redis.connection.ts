import Redis from "ioredis";
import RedisMock from "ioredis-mock";
import { env } from "../config/environment.js";
import { logger } from "../utils/logger.js";

export function createRedisConnection(): Redis {
  if (env.REDIS_URL.startsWith("mock://")) {
    logger.info("Using in-memory Redis mock");
    return new RedisMock();
  }

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });

  redis.on("connect", () => logger.info("Connected to Redis"));
  redis.on("error", (error) => logger.error("Redis connection error", { error }));
  redis.on("close", () => logger.info("Redis connection closed"));

  return redis;
}
