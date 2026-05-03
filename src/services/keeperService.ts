import { Wallet, JsonRpcProvider, TransactionRequest } from 'ethers';
import { NETWORK_CONFIG } from '../config/constants.js';

export interface KeeperServiceOptions {
  rpcUrl?: string;
  privateKey?: string;
  keeperHubApiKey?: string;
  chainId?: number;
  dryRun?: boolean;
}

export class KeeperService {
  private readonly rpcUrl: string;
  private readonly privateKey: string;
  private readonly keeperHubApiKey: string;
  private readonly chainId: number;
  private readonly dryRun: boolean;

  constructor(options: KeeperServiceOptions = {}) {
    this.rpcUrl = options.rpcUrl ?? NETWORK_CONFIG.RPC_URL;
    this.privateKey = options.privateKey ?? '';
    this.keeperHubApiKey = options.keeperHubApiKey ?? '';
    this.chainId = options.chainId ?? NETWORK_CONFIG.CHAIN_ID;
    this.dryRun = options.dryRun ?? false;
  }

  async submitTransaction(calldata: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
  }): Promise<string> {
    const { to, data, value, gasLimit } = calldata;

    if (this.dryRun) {
      console.log(
        `[DRY RUN] Would submit tx: to=${to}, data=${data}, value=${value}`,
      );
      return this.generatePlaceholderHash();
    }

    if (this.keeperHubApiKey) {
      try {
        return await this.submitViaKeeperHub(calldata);
      } catch (err) {
        console.warn('[KeeperService] KeeperHub failed, falling back to direct RPC:', err);
      }
    }

    if (!this.privateKey) {
      throw new Error(
        'Cannot submit transaction: privateKey is required. ' +
          'Set PRIVATE_KEY in your .env file, or enable DRY_RUN mode.',
      );
    }

    if (!this.rpcUrl) {
      throw new Error(
        'Cannot submit transaction: rpcUrl is required. ' +
          'Set RPC_URL in your .env file, or enable DRY_RUN mode.',
      );
    }

    try {
      const provider = new JsonRpcProvider(this.rpcUrl);
      const wallet = new Wallet(this.privateKey, provider);

      const tx: TransactionRequest = {
        to,
        data,
        value,
        chainId: this.chainId,
      };

      if (gasLimit) {
        tx.gasLimit = BigInt(gasLimit);
      }

      const feeData = await provider.getFeeData();
      if (feeData.maxFeePerGas != null) {
        tx.maxFeePerGas = feeData.maxFeePerGas;
      }
      if (feeData.maxPriorityFeePerGas != null) {
        tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      }
      if (feeData.gasPrice != null && tx.maxFeePerGas == null) {
        tx.gasPrice = feeData.gasPrice;
      }

      const response = await wallet.sendTransaction(tx);
      const receipt = await response.wait();

      if (receipt == null) {
        throw new Error('Transaction receipt was null – submission may have failed.');
      }

      return receipt.hash;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[KeeperService] Transaction submission failed: ${message}`);
      throw new Error(`Transaction submission failed: ${message}`);
    }
  }

  private async submitViaKeeperHub(calldata: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
  }): Promise<string> {
    const response = await fetch('https://api.keeperhub.io/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.keeperHubApiKey,
      },
      body: JSON.stringify({
        chainId: this.chainId,
        ...calldata,
      }),
    });

    if (!response.ok) {
      throw new Error(`KeeperHub submit failed: ${response.status}`);
    }

    const { jobId } = (await response.json()) as { jobId: string };

    let attempts = 0;
    while (attempts < 60) {
      await new Promise((r) => setTimeout(r, 5000));

      const statusRes = await fetch(`https://api.keeperhub.io/v1/transactions/${jobId}`, {
        headers: { 'X-API-Key': this.keeperHubApiKey },
      });

      if (!statusRes.ok) continue;

      const status = (await statusRes.json()) as { state: string; txHash?: string; error?: string };

      if (status.state === 'mined' && status.txHash) {
        console.log(`[KeeperService] Transaction mined: ${status.txHash}`);
        return status.txHash;
      }
      if (status.state === 'failed') {
        throw new Error(`KeeperHub tx failed: ${status.error ?? 'unknown'}`);
      }
      attempts++;
    }

    throw new Error('KeeperHub tx timeout after 5 minutes');
  }

  private generatePlaceholderHash(): string {
    const hex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    return `0x${hex}`;
  }
}
