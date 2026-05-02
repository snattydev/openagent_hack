# CapyMate Integration Plan

**Date:** 2026-05-02  
**Status:** Planning Phase  
**Goal:** Real integrations with 0G, Uniswap, KeeperHub + user agent access model

---

## 1. Partner Integration Plans

### 1.1 0G Storage Integration

**Current State:** Mock only (`0gService.ts` has TODO stubs)

**Implementation Plan:**

```typescript
// src/services/0gService.ts - Real implementation

import { Batcher, KvClient } from '@0gfoundation/0g-ts-sdk';

async loadState(agentId: string): Promise<AgentState | null> {
  if (this.mock) return this.loadFromMock(agentId);
  
  try {
    const batcher = new Batcher(this.indexerUrl);
    const kv = new KvClient(batcher, this.flowContract);
    const raw = await kv.get(agentId);
    return raw ? JSON.parse(raw) as AgentState : null;
  } catch (err) {
    console.error('[ZeroGService] Failed to load state:', err);
    return null; // Fallback: start fresh
  }
}

async saveState(agentId: string, state: AgentState): Promise<void> {
  if (this.mock) return this.saveToMock(agentId, state);
  
  try {
    const batcher = new Batcher(this.indexerUrl);
    const kv = new KvClient(batcher, this.flowContract);
    await kv.set(agentId, JSON.stringify(state));
  } catch (err) {
    console.error('[ZeroGService] Failed to save state:', err);
    // Don't throw - let cycle continue even if save fails
  }
}
```

**Steps:**
1. Install `@0gfoundation/0g-ts-sdk` (check if published)
2. Add `ZERO_G_API_KEY` to `.env.example` and `getConfig()`
3. Implement real `loadState`/`saveState` with SDK
4. Keep mock fallback for development
5. Test on 0G testnet

**Questions for 0G Team:**
- Is `@0gfoundation/0g-ts-sdk` stable and published to npm?
- Do we need an API key for testnet?
- What's the rate limit for KV operations?
- How much does storage cost per byte? (affects our 20-entry pruning strategy)

---

### 1.2 Uniswap Trading API Integration

**Current State:** Mock quotes and calldata

**Implementation Plan:**

```typescript
// src/services/uniswapService.ts - Real implementation

async getQuote(fromToken: string, toToken: string, amount: string): Promise<TradeOrder | null> {
  if (this.mock) return this.getMockQuote(fromToken, toToken, amount);
  
  const fromAddress = TOKEN_ADDRESS_MAP[fromToken];
  const toAddress = TOKEN_ADDRESS_MAP[toToken];
  
  const response = await fetch(`${SERVICE_ENDPOINTS.UNISWAP_TRADE_API}/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
    },
    body: JSON.stringify({
      type: 'exactIn',
      chainId: this.chainId,
      amount,
      tokenIn: fromAddress,
      tokenOut: toAddress,
    }),
  });
  
  if (!response.ok) throw new Error(`Quote failed: ${response.status}`);
  
  const data = await response.json();
  return {
    from_token: fromAddress,
    to_token: toAddress,
    amount,
    expected_output: data.outputAmount,
    slippage: data.slippage ?? SAFETY_CONFIG.MAX_SLIPPAGE,
    route_data: data,
  };
}

async getSwapCalldata(tradeOrder: TradeOrder) {
  if (this.mock) return { to: CONTRACT_ADDRESSES.SWAP_ROUTER_02, data: '0xc04...', value: '0' };
  
  const response = await fetch(`${SERVICE_ENDPOINTS.UNISWAP_TRADE_API}/swap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
    },
    body: JSON.stringify({
      quote: tradeOrder.route_data,
      // Permit2 approval data if needed
    }),
  });
  
  const data = await response.json();
  return {
    to: data.to,
    data: data.data,
    value: data.value ?? '0',
  };
}
```

**Steps:**
1. Get API key from [Uniswap Developer Portal](https://developers.uniswap.org/)
2. Implement `POST /quote` and `POST /swap` endpoints
3. Handle Permit2 approval flow (check allowance → sign Permit2 → submit)
4. Add slippage validation against `SAFETY_CONFIG.MAX_SLIPPAGE`
5. Test with WETH/USDC on Base Sepolia

**Key Considerations:**
- UniswapX routing provides gasless fills and MEV protection
- Permit2 approvals are required for token transfers
- API rate limits apply (free tier: ~100 req/min)

---

### 1.3 KeeperHub Integration

**Current State:** Direct RPC fallback works; KeeperHub REST API is TODO

**Implementation Plan:**

```typescript
// src/services/keeperService.ts - KeeperHub integration

async submitViaKeeperHub(calldata: { to: string; data: string; value: string }): Promise<string> {
  // 1. Submit to KeeperHub
  const response = await fetch('https://api.keeperhub.io/api/v1/transactions', {
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
  
  const { jobId } = await response.json();
  
  // 2. Poll until mined
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await fetch(`https://api.keeperhub.io/api/v1/transactions/${jobId}`);
    const status = await statusRes.json();
    
    if (status.state === 'mined') return status.txHash;
    if (status.state === 'failed') throw new Error(`KeeperHub tx failed: ${status.error}`);
    attempts++;
  }
  
  throw new Error('KeeperHub tx timeout');
}
```

**Steps:**
1. Get API key from KeeperHub
2. Implement REST API POST + polling pattern
3. Fallback to direct RPC if KeeperHub fails
4. Add timeout handling (60 attempts × 5s = 5 min max)

---

### 1.4 Price Oracle Integration

**Current State:** Hardcoded $2000 WETH / $1 USDC

**Implementation Plan:**

Option A: CoinGecko (free, no key required for basic tier)
```typescript
private async fetchPrices(): Promise<{ weth: number; usdc: number }> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin&vs_currencies=usd'
  );
  const data = await response.json();
  return {
    weth: data.ethereum.usd,
    usdc: data['usd-coin'].usd,
  };
}
```

Option B: Uniswap quote endpoint (uses same API key)
```typescript
// Get a tiny quote to derive price
const quote = await this.getQuote('WETH', 'USDC', '1000000000000000000'); // 1 WETH
const wethPrice = Number(quote.expected_output) / 1_000_000; // USDC has 6 decimals
```

**Recommendation:** Option A (CoinGecko) for simplicity. Option B if we already have Uniswap API key.

---

## 2. Agent Access Model

### 2.1 User Interaction Flow

**Scenario:** User tells their AI agent: "Manage my crypto portfolio with CapyMate"

```
User → Agent: "Install CapyMate and manage my portfolio"

Agent → User: "I'll set up CapyMate. I need some configuration:"
  1. "Which LLM provider? (OpenAI/DeepSeek/Groq/Mock)"
     User: "DeepSeek"
  2. "Enter your DeepSeek API key:"
     User: "sk-..."
  3. "Enter your wallet private key for trading (or skip for simulation):"
     User: "0x..."
  4. "Using default 0G contract. Override? (press Enter to keep default)"
     User: [Enter]
  5. "Max daily trades? [6]"
     User: [Enter]

Agent → File System: Writes capymate.config.json

Agent → Terminal: npm start

Agent → User: "✅ CapyMate is running autonomously. Check status at http://localhost:3000/api/state"

[5 minutes later...]

Agent (autonomous): 
  - Fetched news: "ETH ETF approved"
  - LLM Decision: bullish, 80% WETH
  - Validation: PASS
  - Executed trade: 0xabc...
  - Saved state to 0G

[User checks next day]

User → Agent: "Show me my portfolio performance"
Agent → API: curl http://localhost:3000/api/state
Agent → User: "Your portfolio is currently 75% WETH / 25% USDC. The agent made 3 trades today based on bullish sentiment."
```

### 2.2 Configuration Schema

```json
{
  "llm": {
    "provider": "deepseek",
    "apiKey": "sk-...",
    "model": "deepseek-chat",
    "baseUrl": "https://api.deepseek.com/v1"
  },
  "wallet": {
    "privateKey": "0x...",
    "chainId": 84532,
    "rpcUrl": "https://sepolia.base.org"
  },
  "storage": {
    "contractAddress": "0x22E03a6A89B950F1c82ec5e74F8ECa321a105296",
    "indexerUrl": "https://indexer-storage-testnet-turbo.0g.ai",
    "apiKey": ""
  },
  "news": {
    "apiKey": "",
    "mockFallback": true
  },
  "safety": {
    "maxDailyTrades": 6,
    "cooldownMinutes": 15,
    "maxTradePercent": 0.10,
    "minRebalanceThreshold": 0.02
  },
  "mode": "auto"
}
```

### 2.3 Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `auto` | Full autonomous cycle | Production deployment |
| `simulation` | Analyze + validate, log trades but don't submit | Testing strategy |
| `mock` | All services use mock data | Development, demos |

### 2.4 User Controls

Users can interact with the running agent via:

```bash
# Check status
curl http://localhost:3000/api/health
curl http://localhost:3000/api/state

# Force a cycle now
curl -X POST http://localhost:3000/api/trigger

# Modify config (edit capymate.config.json, restart)
```

---

## 3. Implementation Priority

### Week 1: Core Integrations

| Day | Task | Partner |
|-----|------|---------|
| 1-2 | 0G SDK integration | 0G |
| 3-4 | Uniswap Trading API | Uniswap Foundation |
| 5 | KeeperHub REST API | KeeperHub |
| 6-7 | Price oracle + end-to-end testing | - |

### Week 2: Harness & Polish

| Day | Task |
|-----|------|
| 8-9 | Build `setup.js` interactive CLI |
| 10 | Write `AGENT_PROMPT.md` |
| 11-12 | Create `capymate-harness` repo |
| 13-14 | Test harness with multiple agents (OpenCode, Claude, Cursor) |

---

## 4. Open Questions

### For Partners

**0G:**
1. Is `@0gfoundation/0g-ts-sdk` published to npm? Latest version?
2. Testnet vs mainnet API differences?
3. KV storage pricing model?
4. Do we need separate indexer URL for testnet?

**Uniswap:**
1. Trading API free tier limits?
2. Base Sepolia supported endpoints?
3. Permit2 flow documentation?

**KeeperHub:**
1. REST API base URL?
2. Authentication method (API key header format)?
3. Supported chains (Base Sepolia confirmed?)?
4. Polling endpoint for transaction status?

### For Architecture

1. **Should we support multiple wallet strategies?**
   - Option A: User provides private key (current)
   - Option B: Agent generates wallet, user funds it
   - Option C: Smart contract wallet (ERC-4337)

2. **How do we handle API key rotation?**
   - Currently: read once at startup
   - Alternative: hot-reload config without restart

3. **Should the agent be containerized?**
   - Docker image for easy deployment
   - docker-compose with dashboard

---

## 5. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 0G SDK unavailable | Medium | High | Keep mock fallback; use local JSON file |
| Uniswap API rate limits | Medium | Medium | Cache quotes for 30s; implement backoff |
| KeeperHub downtime | Low | Medium | Fallback to direct RPC always available |
| LLM API costs | High | Medium | Clear documentation; mock mode for testing |
| User provides wrong chain | Medium | High | Validate chainId in setup; default to Sepolia |
| Private key exposure | Medium | Critical | Never log keys; gitignore config file; warn users |

---

## 6. Success Criteria

**For Hackathon Judges:**
- [ ] Agent runs autonomously for 24h without errors
- [ ] Real trades executed on Base Sepolia (visible on BaseScan)
- [ ] State persists across restarts (0G Storage proof)
- [ ] Dashboard shows live portfolio allocation
- [ ] Safety rules prevent invalid trades (demonstrate rejection)
- [ ] Clear reasoning trail for every decision

**For Users:**
- [ ] One-command installation (`npm install && npm start`)
- [ ] Interactive setup asks for all config
- [ ] Agent runs without human interaction after setup
- [ ] Easy monitoring via dashboard + API
- [ ] Safe defaults (small trades, long cooldowns)

---

*This plan is a living document. Update as integrations progress and blockers are resolved.*
