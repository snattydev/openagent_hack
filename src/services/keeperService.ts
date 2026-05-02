import { Wallet, JsonRpcProvider, TransactionRequest } from 'ethers';
import { NETWORK_CONFIG } from '../config/constants.js';

export interface KeeperServiceOptions {
  rpcUrl?: string;
  privateKey?: string;
  keeperHubApiKey?: string;
  chainId?: number;
  mock?: boolean;
  dryRun?: boolean;
}

export class KeeperService {
  private readonly rpcUrl: string;
  private readonly privateKey: string;
  private readonly keeperHubApiKey: string;
  private readonly chainId: number;
  private readonly mock: boolean;
  private readonly dryRun: boolean;

  constructor(options: KeeperServiceOptions = {}) {
    this.rpcUrl = options.rpcUrl ?? NETWORK_CONFIG.RPC_URL;
    this.privateKey = options.privateKey ?? '';
    this.keeperHubApiKey = options.keeperHubApiKey ?? '';
    this.chainId = options.chainId ?? NETWORK_CONFIG.CHAIN_ID;
    this.mock = options.mock ?? false;
    this.dryRun = options.dryRun ?? false;
  }

  /**
   * Submit a transaction.  Depending on configuration this may:
   * 1. Perform a dry-run (log only, no broadcast).
   * 2. Execute in mock mode (return a fake hash).
   * 3. Submit via KeeperHub REST API (planned).
   * 4. Fallback to direct RPC broadcast via ethers.js v6.
   */
  async submitTransaction(calldata: {
    to: string;
    data: string;
    value: string;
  }): Promise<string> {
    const { to, data, value } = calldata;

    if (this.dryRun) {
      console.log(
        `[DRY RUN] Would submit tx: to=${to}, data=${data}, value=${value}`,
      );
      return this.generateMockHash();
    }

    if (this.mock) {
      console.log('[MOCK] Transaction submitted');
      return this.generateMockHash();
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
        'Cannot submit transaction: privateKey is required in real mode. ' +
          'Set privateKey in options or enable mock/dryRun mode.',
      );
    }

    if (!this.rpcUrl) {
      throw new Error(
        'Cannot submit transaction: rpcUrl is required in real mode. ' +
          'Set rpcUrl in options or enable mock/dryRun mode.',
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

  private generateMockHash(): string {
    const hex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    return `0x${hex}`;
  }
}
