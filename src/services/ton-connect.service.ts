export interface TonConnectAction {
  type: string;
  payload?: unknown;
}

export class TonConnectService {
  constructor(private readonly host: string) {}

  createDeepLink(actionData: TonConnectAction): string {
    const payload = Buffer.from(JSON.stringify({ host: this.host, ...actionData }), "utf8").toString("base64url");
    return `tc://connect?data=${payload}`;
  }
}
