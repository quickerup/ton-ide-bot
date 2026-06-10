export interface StatusEvent {
  timestamp: string;
  level: "info" | "debug" | "warn" | "error";
  source: string;
  message: string;
  meta?: Record<string, unknown>;
}

export class StatusService {
  private events: StatusEvent[] = [];
  private readonly maxEvents = 200;

  record(source: string, message: string, meta: Record<string, unknown> = {}, level: StatusEvent["level"] = "info") {
    const event: StatusEvent = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      meta,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  getEvents(limit = 100) {
    return this.events.slice(-limit);
  }
}
