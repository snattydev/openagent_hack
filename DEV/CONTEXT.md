# CapyMate: Autonomous Sentiment-Based Portfolio Rebalancer

**Last Updated:** 2026-05-03  
**Status:** Production-ready. All core integrations implemented with graceful fallbacks.

---

## 🎯 What We Built

CapyMate is an AI agent that autonomously rebalances a crypto portfolio (WETH/USDC) based on real-time market sentiment analysis. Built for the ETHGlobal OpenAgent Hackathon.

**Key Differentiators:**
- **Decentralized memory** via 0G Storage — agent state persists across restarts
- **Agent Plugin Mode** — any AI agent (Claude, GPT-4, DeepSeek) can use CapyMate as a crypto execution layer without provisioning API keys
- **On-chain execution** via Uniswap V3 + KeeperHub with automatic fallback to direct RPC
- **6 hardcoded safety rules** — whitelist, threshold, max trade, cooldown, daily limit, slippage

---

## 📚 Documentation

| File | Audience | Purpose |
|------|----------|---------|
| `README.md` | Everyone | Quick start, API docs, demo checklist |
| `DEV/CONTEXT.md` | Developers | Architecture guide |
| `AGENTS.md` | AI Agents | Context for assistants working on the codebase |

---

## 🏗️ Technical Stack

| Layer | Technology | Status |
|-------|------------|--------|
| Runtime | Node.js 20+ / TypeScript 6 | ✅ Working |
| Chain | Base Sepolia (testnet) | ✅ Configured |
| Wallet / RPC | ethers.js v6 | ✅ Working |
| Storage | 0G Storage HTTP API | ✅ Implemented (falls back to local JSON) |
| DEX | Uniswap V3 Trading API | ✅ Implemented (POST /quote + /swap) |
| Execution | KeeperHub REST API + direct RPC fallback | ✅ Implemented (auto-fallback on failure) |
| Prices | CoinGecko free API | ✅ Implemented (no key needed) |
| AI | OpenAI-compatible LLM | ✅ Working (with API key) |
| News | CryptoPanic API | ✅ Working (with API key) |
| API Server | Express + CORS | ✅ Working |
| Dashboard | React 18 + Vite + Tailwind + Recharts | ✅ Working |
| Local Blockchain | Hardhat v3 (isolated) | ✅ Working |

---

## 📁 Project Structure

```
capymate/
├── src/                          # Production code only
│   ├── config/
│   │   └── constants.ts          # Safety rules, addresses, getConfig()
│   ├── services/
│   │   ├── 0gService.ts          # 0G Storage (local JSON fallback)
│   │   ├── uniswapService.ts     # Uniswap Trading API
│   │   ├── keeperService.ts      # Tx submission (dryRun → real)
│   │   ├── llmService.ts         # Sentiment analysis
│   │   ├── newsService.ts        # CryptoPanic API
│   │   └── balanceService.ts     # On-chain balance reads
│   ├── logic/
│   │   ├── engine.ts             # 6-step orchestration cycle
│   │   ├── validator.ts          # 6 safety rules
│   │   └── portfolio.ts          # Allocation math
│   ├── api/
│   │   ├── server.ts             # Express app
│   │   └── routes.ts             # REST endpoints
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── index.ts                  # Entry point
├── developer_test/               # Tests, demos, mocks
│   ├── tests/
│   │   ├── test-*.ts             # Service smoke tests
│   │   └── test-agent-hardhat.ts # Agent + blockchain integration
│   └── scripts/
│       └── demo.ts               # Hackathon demo (inline mocks)
├── blockchain_test/              # Hardhat + Solidity (isolated deps)
│   ├── contracts/
│   │   └── MockPortfolioTracker.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   │   └── MockPortfolioTracker.ts
│   ├── hardhat.config.ts
│   ├── tsconfig.json
│   └── package.json
├── dashboard/                    # React frontend
├── DEV/                          # Public documentation
│   └── CONTEXT.md                # ← You are here
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔄 Agent Loop Flow

```
Every POLLING_INTERVAL_MS (default: 5 min):

1. SENSE ──────────────────────────────────────────────────►
   • Fetch crypto news (CryptoPanic API)
   • Get wallet balances (on-chain via ethers.js)
   • Push portfolio snapshot to portfolio_history (with timestamp)

2. REMEMBER ───────────────────────────────────────────────►
   • Load saved state from 0G Storage
   • MERGE with in-memory state (dedup by timestamp)
   • Does NOT overwrite. Merges to prevent data loss.

3. REASON ─────────────────────────────────────────────────►
   • Send context to LLM (news + prices + state)
   • Receive sentiment, confidence, target_allocation
   • Zod validation: strict schema enforces typed LLM output

4. VALIDATE ───────────────────────────────────────────────►
   • Rule 1: Token whitelist [WETH, USDC]
   • Rule 2: Rebalance delta >= MIN_THRESHOLD (2%)
   • Rule 3: Max single trade <= MAX_SINGLE_TRADE (10%)
   • Rule 4: Max slippage <= MAX_SLIPPAGE (0.5%)
   • Rule 5: Cooldown >= COOLDOWN_MINUTES (15 min)
   • Rule 6: Daily trades <= MAX_DAILY_TRADES (6)

5. EXECUTE ────────────────────────────────────────────────►
   • Get swap quote from Uniswap API
   • Generate swap calldata
   • Submit via KeeperHub or direct RPC
   • Update dailyTradeCount, lastTradeTime

6. LOG ────────────────────────────────────────────────────►
   • Prune portfolio_history to MAX_PERSISTED_HISTORY_ENTRIES (20)
   • Save state to 0G Storage
   • Record: timestamp, decision, reasoning
```

---

## 🔌 Integration Status

### ✅ Implemented Integrations

| Integration | How It Works | Fallback When No Key |
|-------------|--------------|---------------------|
| **0G Storage** | HTTP API direct calls (avoids SDK peer dep conflicts) | Local JSON file (`data/agent-state.json`) |
| **Uniswap Trading API** | POST /quote + POST /swap | Returns null (engine skips trade safely) |
| **KeeperHub** | REST API POST + polling until mined | Direct RPC via ethers.js v6 |
| **CoinGecko Price Oracle** | GET /simple/price (free tier) | Hardcoded prices ($2000 WETH / $1 USDC) |
| **LLM (OpenAI-compatible)** | Fetch + Zod validation | Falls back to last decision or neutral |
| **News (CryptoPanic)** | REST API | Returns empty array if no key |

### ✅ Agent Plugin Mode

| Feature | Description |
|---------|-------------|
| **POST /api/sense** | Returns portfolio + news for host agent analysis |
| **POST /api/decide** | Accepts LLMDecision from host agent, runs VALIDATE->EXECUTE->LOG |
| **Zero API keys** | Plugin mode works with host agent's existing LLM |

### 🚀 Future Enhancements

| # | Enhancement | Description |
|---|-------------|-------------|
| 1 | **Mainnet deployment** | Switch from Base Sepolia to Base Mainnet |
| 2 | **ENS identity** | Register `capymate.eth` for agent identity and discoverability |
| 3 | **iNFT tokenization** | Wrap agent state + wallet into 0G iNFT for ownership transfer |
| 4 | **Multi-token support** | Currently WETH/USDC — designed to easily add more pairs |
| 5 | **Monitoring & alerting** | Add alerting for failed cycles, low balances, API downtime |
| 6 | **Custom strategy parameters** | Allow users to configure risk tolerance and allocation ranges |

---

## 🛡️ Safety Constraints

```typescript
const SAFETY_CONFIG = {
  ALLOWED_TOKENS: ['WETH', 'USDC'],
  MIN_REBALANCE_THRESHOLD: 0.02,    // 2%
  MAX_SINGLE_TRADE_PERCENT: 0.10,   // 10%
  MAX_SLIPPAGE: 0.005,              // 0.5%
  COOLDOWN_MINUTES: 15,
  MAX_DAILY_TRADES: 6,
  SENTIMENT_CACHE_MINUTES: 10,
};
```

Rules are hardcoded, not API-exposed. These are intentional guardrails.

---

## 🔧 Key Architecture Decisions

### 1. State Merge in REMEMBER

SENSE pushes a portfolio snapshot *before* REMEMBER loads saved state. REMEMBER merges (doesn't overwrite) to prevent data loss:

```typescript
const saved = await this.zeroGService.loadState(AGENT_ID);
if (saved !== null) {
  this.state.cycle_count = Math.max(this.state.cycle_count, saved.cycle_count);
  this.state.last_decision = saved.last_decision ?? this.state.last_decision;
  
  const inMemoryTimestamps = new Set(this.state.portfolio_history.map(p => p.timestamp));
  const newHistory = (saved.portfolio_history ?? []).filter(p => !inMemoryTimestamps.has(p.timestamp));
  this.state.portfolio_history = [...newHistory, ...this.state.portfolio_history];
}
```

### 2. Zod Validation

LLM outputs are validated with a strict Zod schema (`llmDecisionSchema`) that enforces:
- `sentiment`: `'bullish' | 'bearish' | 'neutral'`
- `confidence`: number in [0, 1]
- `target_allocation.WETH` and `.USDC`: numbers (should sum to ~1.0)
- `reasoning`: string
- `key_signals`: string[]

If validation fails, the engine falls back to the last known decision or default allocation. Host agents using plugin mode should validate their own output before calling `/api/decide`.

### 3. Config Loading

Single source of truth: `getConfig()` in `src/config/constants.ts`. Reads from `.env` with sensible defaults. No scattered `process.env` reads.

### 4. Error Isolation

Each cycle step is independently try-caught. A failure in SENSE doesn't prevent REMEMBER from running. The engine always returns 6 CycleResult objects.

---

## 🧪 Testing Guide

### Run Tests

```bash
# Integration demo (uses inline mocks)
npm run demo

# Type check
npm run typecheck  # tsc --noEmit
```

### Hardhat Blockchain Tests

```bash
cd blockchain_test
npm install
npx hardhat compile
npx tsx node_modules/.bin/mocha test/*.ts
npx hardhat run scripts/deploy.ts --network localhost
```

### Dashboard E2E

```bash
cd dashboard
npm install
npx playwright test
```

---

## 📝 Environment Variables

```env
# Network
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org

# Wallet (TESTNET ONLY)
PRIVATE_KEY=0x...

# LLM (required for autonomous mode)
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1

# News (optional)
CRYPTOPANIC_API_KEY=...

# 0G Storage (optional — falls back to local JSON)
ZERO_G_ENDPOINT=https://indexer-storage-testnet-turbo.0g.ai
ZERO_G_API_KEY=...

# KeeperHub (optional — direct RPC fallback works without)
KEEPER_HUB_API_KEY=...

# Config
POLLING_INTERVAL_MS=300000
DRY_RUN=false
```

---

## 🎓 Extension Points

### Add a New Validation Rule

1. Add rule value to `SAFETY_CONFIG` in `src/config/constants.ts`
2. Implement check in `src/logic/validator.ts` as a pure function
3. Wire into `validateRebalance()` in order of importance
4. Add test to `developer_test/tests/test-validator.ts`

### Add a New Token Pair

1. Add token address to `NETWORK_CONFIG` in `src/config/constants.ts`
2. Add to `SAFETY_CONFIG.ALLOWED_TOKENS`
3. Update balance reads in `balanceService.ts`
4. Update allocation math in `portfolio.ts`

---

## 🏆 Prize Track Fit

| Sponsor | Prize | Why We Fit |
|---------|-------|------------|
| **0G** | $15,000 | Decentralized memory via 0G Storage + autonomous agent framework |
| **KeeperHub** | $4,500 | Execution layer with gasless relay + direct RPC fallback |
| **Uniswap** | $5,000 | Trading API integration with safety validation |

---

*This document is a living guide. Update it when making architectural changes or adding integrations.*
