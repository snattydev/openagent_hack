import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { resolve } from 'path';
import type { AgentState } from '../types/index.js';

export interface ZeroGServiceOptions {
  indexerUrl?: string;
  apiKey?: string;
  flowContract?: string;
  mock?: boolean;
}

export class ZeroGService {
  private readonly indexerUrl: string;
  private readonly apiKey: string;
  private readonly flowContract: string;
  private readonly mock: boolean;
  private readonly mockFilePath: string;

  constructor(options: ZeroGServiceOptions = {}) {
    this.indexerUrl =
      options.indexerUrl ?? 'https://indexer-storage-testnet-turbo.0g.ai';
    this.apiKey = options.apiKey ?? '';
    this.flowContract =
      options.flowContract ?? '0x22E03a6A89B950F1c82ec5e74F8ECa321a105296';
    this.mock = options.mock ?? false;
    this.mockFilePath = resolve(process.cwd(), 'data', 'agent-state.json');
  }

  async loadState(agentId: string): Promise<AgentState | null> {
    if (this.mock) {
      return this.loadFromMock(agentId);
    }

    try {
      const url = new URL(`/kv/${encodeURIComponent(agentId)}`, this.indexerUrl);
      url.searchParams.set('contract', this.flowContract);

      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url.toString(), { headers });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.warn(
          `[ZeroGService] loadState failed: ${response.status} ${response.statusText}. Falling back to mock.`,
        );
        return this.loadFromMock(agentId);
      }

      const raw = await response.text();
      if (!raw) return null;

      return JSON.parse(raw) as AgentState;
    } catch (err) {
      console.warn(
        '[ZeroGService] loadState error (0G may be unavailable):',
        err instanceof Error ? err.message : String(err),
      );
      return this.loadFromMock(agentId);
    }
  }

  async saveState(agentId: string, state: AgentState): Promise<void> {
    if (this.mock) {
      await this.saveToMock(agentId, state);
      return;
    }

    try {
      const url = new URL('/kv', this.indexerUrl);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contract: this.flowContract,
          key: agentId,
          value: JSON.stringify(state),
        }),
      });

      if (!response.ok) {
        console.warn(
          `[ZeroGService] saveState failed: ${response.status} ${response.statusText}. Falling back to mock.`,
        );
        await this.saveToMock(agentId, state);
        return;
      }

      console.log(`[ZeroGService] State saved to 0G for agent ${agentId}`);
    } catch (err) {
      console.warn(
        '[ZeroGService] saveState error (0G may be unavailable):',
        err instanceof Error ? err.message : String(err),
      );
      await this.saveToMock(agentId, state);
    }
  }

  private async loadFromMock(agentId: string): Promise<AgentState | null> {
    try {
      const raw = await readFile(this.mockFilePath, 'utf-8');
      const data = JSON.parse(raw) as Record<string, AgentState>;
      return data[agentId] ?? null;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return null;
      }
      console.error('[ZeroGService] Failed to read mock state file:', err);
      return null;
    }
  }

  private async saveToMock(agentId: string, state: AgentState): Promise<void> {
    try {
      const dataDir = resolve(process.cwd(), 'data');
      try {
        await access(dataDir);
      } catch {
        await mkdir(dataDir, { recursive: true });
      }

      let data: Record<string, AgentState> = {};
      try {
        const raw = await readFile(this.mockFilePath, 'utf-8');
        data = JSON.parse(raw) as Record<string, AgentState>;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') {
          console.error('[ZeroGService] Failed to parse existing mock state, starting fresh:', err);
        }
        data = {};
      }

      data[agentId] = state;

      await writeFile(
        this.mockFilePath,
        JSON.stringify(data, null, 2) + '\n',
        'utf-8',
      );
    } catch (err) {
      console.error('[ZeroGService] Failed to write mock state file:', err);
    }
  }
}
