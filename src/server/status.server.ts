import http from "http";
import fs from "fs/promises";
import type { StatusService } from "../services/status.service.js";
import { logger } from "../utils/logger.js";

export async function startStatusServer(statusService: StatusService, port: number) {
  const html = await fs.readFile(new URL("../../public/status.html", import.meta.url), "utf8");

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    if (url.pathname === "/api/status") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ events: statusService.getEvents(200) }));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  });

  return new Promise<http.Server>((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      logger.info(`Status server listening at http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}
