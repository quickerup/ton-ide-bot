export interface DeploymentPayload {
  initData: string;
  estimatedGas: number;
  deploymentBoc: string;
  contractBoc: string;
}

export class DeployerService {
  async prepareDeploymentPayload(contractBoc: string): Promise<DeploymentPayload> {
    const deploymentBoc = Buffer.from(contractBoc, "base64").toString("base64");
    return {
      initData: Buffer.from(JSON.stringify({ createdAt: Date.now() })).toString("base64"),
      estimatedGas: 0.35,
      deploymentBoc,
      contractBoc,
    };
  }
}
