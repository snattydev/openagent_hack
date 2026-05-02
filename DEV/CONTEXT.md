# CAPYMATE: Autonomous Sentiment-Based Portfolio Rebalancer

**Last Updated:** 2026-05-02 (post-audit)  
**Status:** MVP-ready scaffold. Core integrations pending (0G, Uniswap, KeeperHub).

---

## 🎯 PROJECT OVERVIEW

An AI agent that autonomously rebalances a crypto portfolio (WETH/USDC) based on real-time market sentiment analysis. Built for the ETHGlobal OpenAgent Hackathon.

**Key Differentiators:**
- Decentralized memory via 0G Storage (agent state persists across restarts)
- Autonomous sentiment analysis via LLM (Claude, GPT, DeepSeek)
- On-chain execution via Uniswap V3 + KeeperHub
- 6 hardcoded safety rules (whitelist, threshold, max trade, cooldown, daily limit, slippage)

---

## 🏗️ TECHNICAL STACK

| Layer | Technology | Status |
|-------|------------|--------|
| Runtime | Node.js 20+ / TypeScript 6 | ✅ Working |
| Chain | Base Sepolia (testnet) | ✅ Configured |
| Wallet / RPC | ethers.js v6 | ✅ Working |
| Storage | 0G Storage SDK | 🔴 Mock only (integration pending) |
| DEX | Uniswap V3 Trading API | 🔴 Mock only (integration pending) |
| Execution | KeeperHub SDK + direct RPC fallback | 🟡 Direct RPC works; KeeperHub pending |
| AI | OpenAI-compatible LLM | ✅ Working (with API key) |
| News | CryptoPanic API | ✅ Working (with API key) + mock fallback |
| API Server | Express + CORS | ✅ Working |
| Dashboard | React 18 + Vite + Tailwind + Recharts | ✅ Working |
| Local Blockchain | Hardhat v3 (isolated) | ✅ Working |

---

## 📁 PROJECT STRUCTURE

```
capymate/
├── src/                          # Production code only
│   ├── config/
│   │   └── constants.ts          # Safety rules, addresses, getConfig()
│   ├── services/
│   │   ├── 0gService.ts          # 0G Storage (mock → real)
│   │   ├── uniswapService.ts     # Uniswap Trading API (mock → real)
│   │   ├── keeperService.ts      # Tx submission (mock/dryRun → real)
│   │   ├── llmService.ts         # Sentiment analysis (mock → real)
│   │   ├── newsService.ts        # CryptoPanic (mock → real)
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
│       └── demo.ts               # Hackathon demo
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
├── dev/                          # Agent context & design docs
│   ├── CONTEXT.md                # ← You are here
│   ├── HARNESS_DESIGN.md         # Agent-installable harness plan
│   ├── AGENT_PROMPT.md           # Agent installation guide
│   └── RESULTS.md                # Test report
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔄 AGENT LOOP FLOW

```
Every POLLING_INTERVAL_MS (default: 5 min):

1. SENSE ──────────────────────────────────────────────────►
   • Fetch crypto news (CryptoPanic API or mock)
   • Get wallet balances (on-chain via ethers.js)
   • Push portfolio snapshot to portfolio_history (with timestamp)

2. REMEMBER ───────────────────────────────────────────────►
   • Load saved state from 0G Storage
   • MERGE with in-memory state (dedup by timestamp)
   ⚠️ Critical: Does NOT overwrite. Merges to prevent data loss.

3. REASON ─────────────────────────────────────────────────►
   • Send context to LLM (news + prices + state)
   • Receive sentiment, confidence, target_allocation
   • Zod validation: loose → normalize percentages → strict

4. VALIDATE ───────────────────────────────────────────────►
   • Rule 1: Token whitelist [WETH, USDC]
   • Rule 2: Rebalance delta ≥ MIN_THRESHOLD (2%)
   • Rule 3: Max single trade ≤ MAX_SINGLE_TRADE (10%)
   • Rule 4: Max slippage ≤ MAX_SLIPPAGE (0.5%)
   • Rule 5: Cooldown ≥ COOLDOWN_MINUTES (15 min)
   • Rule 6: Daily trades ≤ MAX_DAILY_TRADES (6)

5. EXECUTE ────────────────────────────────────────────────►
   • Get swap quote from Uniswap API
   • Generate swap calldata
   • Submit via KeeperHub or direct RPC
   • Update dailyTradeCount, lastTradeTime

6. LOG ────────────────────────────────────────────────────►
   • Prune portfolio_history to MAX_PERSISTED_HISTORY_ENTRIES (20)
   • Save state to 0G Storage
   • Record: timestamp, decision, tx_hash, reasoning
```

---

## 🔌 INTEGRATION STATUS

### ✅ Working (Real Mode)

| Integration | How It Works | Requirements |
|-------------|--------------|--------------|
| **Balance Reads** | ethers.js v6 `Contract.balanceOf()` | RPC_URL, wallet address |
| **LLM Analysis** | OpenAI-compatible API call | LLM_API_KEY, LLM_MODEL |
| **News Fetch** | CryptoPanic REST API | CRYPTOPANIC_API_KEY (optional) |
| **Direct RPC Tx** | ethers.js v6 `wallet.sendTransaction()` | PRIVATE_KEY, RPC_URL |
| **Dashboard** | React polls Express API | Backend running on port 3000 |

### 🔴 Pending (Mock Only)

| Integration | Blocker | Effort | Plan |
|-------------|---------|--------|------|
| **0G Storage** | SDK not installed; TODO stubs | Medium (1-2d) | Install `@0gfoundation/0g-ts-sdk`, implement `KvClient` pattern (see 0gService.ts TODOs) |
| **Uniswap Quotes** | API key not provisioned | Medium (1-2d) | Implement `POST /quote` + `POST /swap` flow (see uniswapService.ts TODOs) |
| **KeeperHub Relay** | API key not provisioned | Low (4-8h) | Implement REST API POST + polling (see keeperService.ts TODOs) |
| **Price Oracle** | No real price feed | Low (2-4h) | Use Uniswap quote endpoint or CoinGecko free API for WETH/USDC prices |

---

## 🛡️ SAFETY CONSTRAINTS

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

**Rules are hardcoded, not API-exposed.** These are intentional guardrails.

---

## 🔧 KEY ARCHITECTURE DECISIONS

### 1. State Merge in REMEMBER

SENSE pushes a portfolio snapshot *before* REMEMBER loads saved state. REMEMBER merges (doesn't overwrite) to prevent data loss:

```typescript
// engine.ts ~line 122
const saved = await this.zeroGService.loadState(AGENT_ID);
if (saved !== null) {
  this.state.cycle_count = Math.max(this.state.cycle_count, saved.cycle_count);
  this.state.last_decision = saved.last_decision ?? this.state.last_decision;
  
  const inMemoryTimestamps = new Set(this.state.portfolio_history.map(p => p.timestamp));
  const newHistory = (saved.portfolio_history ?? []).filter(p => !inMemoryTimestamps.has(p.timestamp));
  this.state.portfolio_history = [...newHistory, ...this.state.portfolio_history];
}
```

**Rule:** If modifying REMEMBER or SENSE logic, always preserve merge behavior.

### 2. Mock Mode Pattern

Every service accepts `{ mock?: boolean }` and provides mock fallback methods:

```typescript
class MyService {
  private mock: boolean;
  constructor(options: { mock?: boolean } = {}) {
    this.mock = options.mock ?? false;
  }
  async doSomething() {
    if (this.mock) return this.mockDoSomething();
    // real implementation
  }
}
```

**Benefit:** Entire stack runs without API keys. Demo-ready.

### 3. Zod Two-Pass Validation

LLM outputs are validated twice:
1. **Loose schema** — accepts percentages (80, 20) or decimals (0.8, 0.2)
2. **Normalization** — converts percentages to decimals if sum > 1.5
3. **Strict schema** — validates decimals are in [0, 1]

This handles DeepSeek, GPT, Claude output variations gracefully.

### 4. Config Loading

Single source of truth: `getConfig()` in `src/config/constants.ts`. Reads from `.env` with sensible defaults. No scattered `process.env` reads.

### 5. Error Isolation

Each cycle step is independently try-caught. A failure in SENSE doesn't prevent REMEMBER from running. The engine always returns 6 CycleResult objects.

---

## 🧪 TESTING GUIDE

### Run Tests

```bash
# All smoke tests (mock mode, no API keys)
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-engine.ts
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-validator.ts
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-llm-mock.ts

# Integration demo
npm run demo  # alias for: USE_MOCK_SERVICES=true npx tsx developer_test/scripts/demo.ts

# Type check
npm run typecheck  # tsc --noEmit
```

### Hardhat Blockchain Tests

```bash
cd blockchain_test
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network localhost
```

### Dashboard E2E

```bash
cd dashboard
npm install
npx playwright test
```

---

## 🚨 GOTCHAS & PITFALLS

1. **"State changes aren't persisting"**
   - Check: Is `USE_MOCK_SERVICES=true`? Mock mode writes to `data/agent-state.json`
   - Check: Did REMEMBER overwrite your changes? Ensure merge logic is preserved
   - Check: Is `cycle_count` incrementing? LOG step must complete for save to trigger

2. **"TypeScript errors in Hardhat files"**
   - Must be in `blockchain_test/` directory, not root
   - `blockchain_test/tsconfig.json` is used for Hardhat files
   - Hardhat v3 uses direct `ethers` import (not from 'hardhat')

3. **"Portfolio history is missing entries"**
   - Check SENSE adds `timestamp` to portfolio snapshots
   - Check REMEMBER merges state correctly (dedup by timestamp)
   - Check LOG step doesn't prune too aggressively (cap is 20 entries)

4. **"Wei precision loss"**
   - Fixed: Use `parseUnits(amount.toFixed(decimals), decimals)` instead of `Math.floor(float * 1e18)`
   - See `engine.ts` EXECUTE step for correct pattern

5. **"LLM returns percentages instead of decimals"**
   - Handled: `llmService.ts` normalizes percentages → decimals automatically
   - But still good to mention in system prompt: "values must be decimals between 0 and 1"

6. **"Demo shows old cycle counts"**
   - `demo.ts` reuses `data/agent-state.json`. Delete to reset: `rm data/agent-state.json`

7. **"npm install fails with peer dep errors"**
   - Fixed: Hardhat is isolated in `blockchain_test/`. Root project installs cleanly.
   - If you see `@typechain/hardhat` errors, you're installing in the wrong directory.

---

## 📝 ENVIRONMENT VARIABLES

```env
# Network
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org

# Wallet (TESTNET ONLY)
PRIVATE_KEY=0x...

# LLM (required for real sentiment analysis)
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1  # optional, for DeepSeek/Groq

# News (optional — mock fallback works without)
CRYPTOPANIC_API_KEY=...

# 0G Storage (optional — mock fallback works without)
ZERO_G_ENDPOINT=https://indexer-storage-testnet-turbo.0g.ai
ZERO_G_API_KEY=...

# KeeperHub (optional — direct RPC fallback works without)
KEEPER_HUB_API_KEY=...

# Config
POLLING_INTERVAL_MS=300000
DRY_RUN=true
USE_MOCK_SERVICES=true
```

---

## 🚀 INTEGRATION ROADMAP

### Phase 1: Core Real Integrations (Priority)

| # | Integration | Files | Effort | Blocker |
|---|-------------|-------|--------|---------|
| 1 | **0G Storage SDK** | `src/services/0gService.ts` | 1-2 days | SDK availability (`@0gfoundation/0g-ts-sdk`) |
| 2 | **Uniswap Trading API** | `src/services/uniswapService.ts` | 1-2 days | API key from Uniswap Developer Portal |
| 3 | **KeeperHub Relay** | `src/services/keeperService.ts` | 4-8 hours | API key from KeeperHub |
| 4 | **Price Oracle** | `src/services/balanceService.ts` | 2-4 hours | None (CoinGecko free tier works) |

### Phase 2: Harness & Distribution

| # | Task | Description |
|---|------|-------------|
| 5 | **Agent Installable Harness** | `capymate-harness` repo with `setup.js` interactive CLI |
| 6 | **AGENT_PROMPT.md** | One-file install guide for any AI agent |
| 7 | **npm package** | `npm install capymate-harness` or `npx create-capymate-agent` |

### Phase 3: Production Hardening

| # | Task | Description |
|---|------|-------------|
| 8 | **Mainnet deployment** | Switch from Base Sepolia to Base Mainnet |
| 9 | **ENS identity** | Register `capymate.eth` for agent identity |
| 10 | **Monitoring** | Add alerting for failed cycles, low balances, API downtime |

---

## 🎓 EXTENSION POINTS

### Add a New Service

1. Create `src/services/myService.ts`
2. Export a class with constructor accepting `{ mock?: boolean }`
3. Add mock fallback methods for all public methods
4. Add type to `EngineDeps` in `src/logic/engine.ts`
5. Wire into `Engine` constructor
6. Add to `src/types/index.ts` if new interfaces needed
7. Add test to `developer_test/tests/test-myService.ts`

### Add a New Validation Rule

1. Add rule value to `SAFETY_CONFIG` in `src/config/constants.ts`
2. Implement check in `src/logic/validator.ts` as a pure function
3. Wire into `validateRebalance()` in order of importance
4. Add test to `developer_test/tests/test-validator.ts`

### Modify the State Schema

1. Update `AgentState` or related interfaces in `src/types/index.ts`
2. Handle missing values in `0gService.ts` loadState (backward compat)
3. If field affects payload size, consider pruning in engine.ts LOG step
4. Update `DEV/CONTEXT.md` State Schema section
5. Run `npm run demo` to verify state persistence still works

---

## 📊 AUDIT SUMMARY

**Date:** 2026-05-02  
**Auditor:** DeepSeek V4 Pro (Oracle agent)  
**Scores:**
- Design Alignment: 8/10
- Code Quality: 8/10
- Architecture: 9/10
- MVP Readiness: 5.5/10 (polished scaffold, integrations pending)
- Review-Friendliness: 7.5/10

**Key Finding:** The project is a well-structured mock scaffold with excellent DX. The gap between "demo mode" and "real mode" is 3 core integrations (0G, Uniswap, KeeperHub). All safety rules, state management, and architecture are production-ready.

**Critical Issues Fixed:**
- ✅ Wei precision loss (parseUnits)
- ✅ LLM_BASE_URL config missing
- ✅ Validator receiving fake sentiment data
- ✅ NPE risk on `last_decision!`

**Files Changed:** See git log on `dev` branch.

---

*This document is a living guide. Update it when making architectural changes or adding integrations.*
