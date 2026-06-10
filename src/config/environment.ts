import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional().or(z.literal("")).default(""),
  REDIS_URL: z.string().min(1),
  TON_RPC_ENDPOINT: z.string().url(),
  TON_CONNECT_HOST: z.string().url(),
  GITHUB_TOKEN: z.string().optional().default(""),
  PORT: z.string().regex(/^[0-9]+$/).default("3000"),
  STATUS_PORT: z.string().regex(/^[0-9]+$/).default("3001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.format());
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PORT: Number(parsed.data.PORT),
  STATUS_PORT: Number(parsed.data.STATUS_PORT),
};

export const isProduction = env.NODE_ENV === "production";
