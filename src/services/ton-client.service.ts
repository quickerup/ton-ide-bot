import axios from "axios";
import { env } from "../config/environment.js";

export class TonClientService {
  private async rpc<T>(method: string, params: Array<unknown> = []): Promise<T> {
    const response = await axios.post(env.TON_RPC_ENDPOINT, {
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    });

    if (response.data.error) {
      throw new Error(`TON RPC error: ${JSON.stringify(response.data.error)}`);
    }

    return response.data.result as T;
  }

  async getAccountState(address: string): Promise<unknown> {
    return this.rpc("getAccountState", [address]);
  }

  async runGetter(address: string, method: string, args: Array<unknown> = []): Promise<unknown> {
    return this.rpc("runGetMethod", [address, method, args]);
  }
}
