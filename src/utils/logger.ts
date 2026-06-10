import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const metadata = Object.keys(meta).length ? JSON.stringify(meta) : "";
      return `${timestamp} [${level}] ${message} ${metadata}`.trim();
    }),
  ),
  transports: [new transports.Console()],
});

export { logger };
