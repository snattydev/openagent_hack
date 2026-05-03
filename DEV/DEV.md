# CapyMate — Developer Documentation

*Internal architecture reference. Not for public distribution.*

---

## Architecture Overview

### Mode A: Autonomous Agent (Full Loop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CAPYMATE AGENT STACK                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       DASHBOARD (React + Vite)                        │   │
│  │   polls API every 5s → StatusCard · AllocationChart · TradeHistory    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │ HTTP                                   │
│  ┌─────────────────────────────────▼────────────────────────────────────┐   │
│  │                      API SERVER (Express :3000)                        │   │
│  │   GET  /api/health     ·     GET  /api/status                         │   │
│  │   GET  /api/state      ·     POST /api/trigger                        │   │
│  │   POST /api/sense      ·     POST /api/decide   ← NEW: Agent Plugin   │   │
│  └─────────────────────────────────┬────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────────────────────▼────────────────────────────────────┐   │
│  │                        ENGINE (orchestrator)                           │   │
│  │                                                                        │   │
│  │   ┌──────┐  ┌──────────┐  ┌────────┐  ┌──────────┐                   │   │
│  │   │SENSE │→│ REMEMBER │→│ REASON │→│ VALIDATE │                   │   │
│  │   └──┬───┘  └────┬─────┘  └───┬────┘  └────┬─────┘                   │   │
│  │      │           │            │            │                          │   │
│  │      ▼           ▼            ▼            ▼                          │   │
│  │   balance   0G Storage    LLM Call    6 Safety Rules                  │   │
│  │   + news    (load state)  (sentiment) (whitelist,threshold,           │   │
│  │                                          cooldown, etc.)              │   │
│  │                                                                        │   │
│  │   ┌──────────┐  ┌─────────┐                                           │   │
│  │   │ EXECUTE  │→│   LOG   │                                           │   │
│  │   └────┬─────┘  └────┬────┘                                           │   │
│  │        │             │                                                 │   │
│  │        ▼             ▼                                                 │   │
│  │   Uniswap       0G Storage    (isRunning mutex prevents concurrent     │   │
│  │   + KeeperHub   (save state)   cycles — fails fast if busy)            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      EXTERNAL SERVICES                                │   │
│  │                                                                        │   │
│  │  ┌──────────┐ ┌────────────┐ ┌──────────────┐ ┌───────────────┐      │   │
│  │  │CryptoPanic│ │0G Storage  │ │Uniswap V3    │ │KeeperHub      │      │   │
│  │  │  (news)   │ │  (memory)  │ │Trading API   │ │(tx relay)     │      │   │
│  │  └──────────┘ └────────────┘ └──────────────┘ └───────────────┘      │   │
│  │                                                                        │   │
│  │  ALL services have mock fallbacks — runs end-to-end with zero API keys │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         ON-CHAIN LAYER                                 │   │
│  │                                                                        │   │
│  │  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────────┐    │   │
│  │  │ 0G Storage     │  │ Uniswap V3 Router │  │ KeeperHub Relay     │    │   │
│  │  │ KV Write (perm)│  │ Swap Execution    │  │ Gasless Tx Submit   │    │   │
│  │  └───────────────┘  └──────────────────┘  └─────────────────────┘    │   │
│  │  ┌───────────────┐                                                   │   │
│  │  │ Hardhat Local  │  Local blockchain for testing & emulation         │   │
│  │  │ (localhost:8545)│  `npm run node` → `npm run deploy:local`         │   │
│  │  └───────────────┘                                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mode B: Agent Plugin (Host Agent Provides Reasoning)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENT PLUGIN MODE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐          ┌──────────────────────────────────────┐   │
│   │   HOST AGENT     │          │           CAPYMATE PLUGIN            │   │
│   │  (Any AI agent)  │          │         (This codebase)              │   │
│   │                  │          │                                      │   │
│   │  • Claude Code   │          │  ┌────────────────────────────────┐  │   │
│   │  • OpenCode      │──HTTP───→│  │ POST /api/sense               │  │   │
│   │  • Cursor        │          │  │ → returns portfolio + news    │  │   │
│   │  • GPT-4o        │          │  └────────────────────────────────┘  │   │
│   │                  │          │                                      │   │
│   │  Runs its own    │          │  ┌────────────────────────────────┐  │   │
│   │  LLM to decide   │←──HTTP───│  │ POST /api/decide              │  │   │
│   │  allocation      │          │  │ ← accepts LLMDecision JSON    │  │   │
│   │                  │          │  │ → runs VALIDATE→EXECUTE→LOG   │  │   │
│   └──────────────────┘          │  └────────────────────────────────┘  │   │
│                                 │                                      │   │
│                                 │  ✓ No LLM API key needed             │   │
│                                 │  ✓ No 0G API key needed (fallback)   │   │
│                                 │  ✓ No KeeperHub key (RPC fallback)   │   │
│                                 │  ✓ Host agent's LLM handles reasoning│   │
│                                 └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How the Agent Works

### 6-Step Autonomous Loop

The agent runs a deterministic 6-step cycle. Each step is independently wrapped
in try/catch — a failure in one step never crashes the agent; it logs and continues.

| Step | Action | Service Used | Data Flow |
|------|--------|-------------|-----------|
| **1. SENSE** | Fetch news headlines + wallet balances | `newsService` + `balanceService` | News items & portfolio snapshot captured (timestamp added) |
| **2. REMEMBER** | Load previous agent state from 0G | `0gService.loadState()` | Merges saved state with in-memory data (deduplicates `portfolio_history` by timestamp) |
| **3. REASON** | Send context to LLM for sentiment analysis | `llmService.analyzeSentiment()` | News + prices + state → `LLMDecision` JSON |
| **4. VALIDATE** | Run 6 safety rules against proposed trade | `validator.validateRebalance()` | Returns `ValidationResult { valid, reason }` |
| **5. EXECUTE** | Get Uniswap quote + calldata, submit via KeeperHub | `uniswapService` + `keeperService` | Produces transaction hash |
| **6. LOG** | Persist updated state to 0G Storage | `0gService.saveState()` | Prunes `portfolio_history` to 20 entries max (gas optimization), then writes `AgentState` |

### Two Operating Modes

**Mode A: Autonomous Agent** (full 6-step loop)

The agent runs everything itself — fetches news, calls LLM, validates, executes, persists.

```bash
# Mock mode (no API keys)
USE_MOCK_SERVICES=true DRY_RUN=true npx tsx src/index.ts

# Real mode (requires keys in .env)
USE_MOCK_SERVICES=false DRY_RUN=false npx tsx src/index.ts
```

In real mode, the agent auto-polls every `POLLING_INTERVAL_MS`. In mock mode, trigger manually:
```bash
curl -X POST http://localhost:3000/api/trigger
```

**Mode B: Agent Plugin** (host agent provides reasoning)

The host AI agent (Claude Code, OpenCode, etc.) handles the LLM reasoning. CapyMate handles validation, execution, and memory.

```bash
# Start CapyMate (no LLM key needed!)
USE_MOCK_SERVICES=true DRY_RUN=true npx tsx src/index.ts

# 1. Host agent gets market data
curl -X POST http://localhost:3000/api/sense
# → { "portfolio": {...}, "news": [...] }

# 2. Host agent runs its own LLM, decides allocation

# 3. Host agent injects decision
curl -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -d '{
    "sentiment": "bullish",
    "confidence": 0.85,
    "reasoning": "ETH ETF approval signals strong upside",
    "target_allocation": { "WETH": 0.8, "USDC": 0.2 },
    "key_signals": ["SEC approves Ethereum ETF"]
  }'
# → CapyMate runs VALIDATE → EXECUTE → LOG
```

**Why Plugin Mode Matters:**
- **Zero API keys** for the plugin user — their existing agent already has LLM access
- **Any LLM** — host agent can use Claude, GPT-4, DeepSeek, Groq, local models
- **Composable** — one CapyMate instance can serve multiple host agents
- **Hackathon-friendly** — judges can install and test without provisioning 4+ API keys

### Concurrency Guard

The `engine.ts` has an `isRunning` mutex. If `runCycle()` is called while a cycle
is already in progress, it logs "Cycle already running, skipping" and returns an
empty array — preventing concurrent trades and double-executions.

---

## System Prompts

### Primary LLM Prompt

**Location:** `src/services/llmService.ts` lines 167-177

This is the system prompt sent to the LLM on every REASON step:

```
You are a cryptocurrency sentiment analyst. Analyze the provided news headlines
and token prices, then return a JSON object with the following structure:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence": <number between 0 and 1>,
  "reasoning": "<string, max 200 characters>",
  "target_allocation": { "WETH": <number>, "USDC": <number> },
  "key_signals": ["<headline excerpt>", ...]
}
```

This prompt is constructed at the `callLLM()` method (line 167) and sent with:
- `model`: whatever is configured in `LLM_MODEL` env var (default: `gpt-4o-mini`)
- `temperature: 0.3` for deterministic responses
- `response_format: { type: 'json_object' }` to force JSON output
- User message containing the actual news headlines and token prices

### Zod Validation

The LLM response is validated against a Zod schema (`llmDecisionSchema`, line 13).
If the LLM returns malformed JSON or incorrect types, validation fails and the
agent falls back to:
1. `last_decision` from the previous cycle (if available)
2. `DEFAULT_ALLOCATION` (50% WETH / 50% USDC) as final safety net

### Mock Mode Prompt Emulation

When `USE_MOCK_SERVICES=true`, the LLM is never called. Instead, `mockAnalyze()`
(line 126) performs keyword matching on news titles:
- Contains `bullish`, `rally`, `approved`, `surge`, `pump` → bullish (80% WETH)
- Contains `bearish`, `crash`, `hack`, `drop`, `dump` → bearish (70% USDC)
- Otherwise → neutral (50/50)

---

## Data Flow

```
News Headlines (CryptoPanic)
        │
        ▼
┌───────────────────┐
│   llmService.ts    │  ← System Prompt injected here
│   analyzeSentiment │
└───────┬───────────┘
        │ LLMDecision { sentiment, confidence, target_allocation, key_signals }
        ▼
┌───────────────────┐
│   validator.ts     │  ← 6 Safety Rules applied
│   validateRebalance│
└───────┬───────────┘
        │ ValidationResult { valid, reason }
        ▼
┌───────────────────┐
│   engine.ts        │
│   EXECUTE step     │
│                    │
│ 1. calculateTradeAmounts() → which token to sell/buy, how much
│ 2. uniswapService.getQuote() → swap route + price
│ 3. uniswapService.getSwapCalldata() → encoded tx data
│ 4. keeperService.submitTransaction() → broadcast or mock
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   0gService.ts     │
│   saveState()      │  ← PERSISTS on-chain (or local JSON in mock mode)
└───────────────────┘
```

### State Schema (stored on 0G)

```typescript
interface AgentState {
  last_decision: LLMDecision | null;
  portfolio_history: PortfolioState[];  // append-only log, capped at 20 entries
  reasoning: string;
  timestamp: number;                    // epoch ms
  cycle_count: number;                  // total cycles completed
}
```

### State Merge Behavior (REMEMBER step)

When `0gService.loadState()` returns a saved state, the engine merges rather than overwrites:

1. `cycle_count`: takes the maximum of saved vs current (prevents regressions)
2. `last_decision`: prefers saved state (REASON updates it later)
3. `portfolio_history`: deduplicates by `timestamp`, concatenates saved + in-memory

This prevents data loss when SENSE pushes a new portfolio snapshot before REMEMBER loads the saved state.

---

## On-Chain Strategy

The agent is designed to live **on-chain** as an autonomous entity:

| Component | On-Chain Execution |
|-----------|-------------------|
| **Memory** | Agent state stored on **0G Storage** (decentralized KV store). Survives server restarts and can be queried independently of the agent process. History capped at 20 entries to bound gas cost. |
| **Trades** | Executed via **Uniswap V3** on Base (Sepolia testnet → Mainnet). SwapRouter02 contract handles atomic token swaps. |
| **Transactions** | Submitted through **KeeperHub** gasless relay (with direct `eth_sendRawTransaction` fallback via ethers.js). |
| **Identity** | Agent has its own wallet address. The private key is the agent's on-chain identity. |
| **Persistence** | Every cycle logs its state to 0G. The agent's entire decision history is verifiable on-chain. |

### Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| WETH | `0x4200000000000000000000000000000000000006` |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Uniswap V3 SwapRouter02 | `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4` |
| 0G Flow Contract | `0x22E03a6A89B950F1c82ec5e74F8ECa321a105296` |

---

## Safety Constraints

All 6 rules are in `src/logic/validator.ts`. They run sequentially and the **first rejection** stops validation:

| # | Rule | Value | Location |
|---|------|-------|----------|
| 1 | **Whitelist** | Only WETH + USDC allowed | `checkWhitelist()` |
| 2 | **Min Threshold** | ≥2% allocation change required | `checkMinThreshold()` |
| 3 | **Max Trade** | ≤10% of portfolio per trade | `checkMaxTrade()` |
| 4 | **Max Slippage** | ≤0.5% (enforced at Uniswap quote) | `checkSlippage()` |
| 5 | **Cooldown** | ≥15 minutes between trades | `checkCooldown()` |
| 6 | **Daily Limit** | ≤6 trades per day (circuit breaker) | `checkDailyLimit()` |

All thresholds are hardcoded in `src/config/constants.ts` → `SAFETY_CONFIG`.
They are **not** configurable via API or dashboard (intentional design for hackathon).

---

## Local Blockchain Development (Hardhat)

A Hardhat instance is configured for local blockchain emulation and contract testing.

### Setup

```bash
# Install dependencies (already in package.json)
npm install

# Start local node
npm run node

# In another terminal, deploy contracts
npm run deploy:local
```

### Networks

| Network | URL | Chain ID | Usage |
|---------|-----|----------|-------|
| `hardhat` | In-memory | 31337 | `npm run compile` / `npm run test:contracts` |
| `localhost` | http://127.0.0.1:8545 | 31337 | Local dev node |
| `baseSepolia` | `process.env.RPC_URL` | 84532 | Testnet deployment |

### Contracts

| Contract | File | Purpose |
|----------|------|---------|
| `MockPortfolioTracker` | `contracts/MockPortfolioTracker.sol` | Minimal on-chain state proxy storing `cycleCount`, `lastDecisionHash`, and `timestamp`. Demonstrates gas-efficient agent memory pattern. |

### Commands

```bash
npm run compile          # Compile Solidity contracts
npm run test:contracts   # Run contract tests (Mocha/Chai)
npm run deploy:local     # Deploy to local node
```

---

## Business Model

### Revenue Streams

CapyMate is monetized through two on-chain mechanisms:

#### 1. Smart Contract Fee on Uniswap Swaps

A thin fee Smart Contract sits between CapyMate's execution layer and Uniswap V3.
Every swap routed through the agent pays a small percentage:

```
User/Agent Trade
      │
      ▼
┌──────────────────────┐
│  FeeRouter Contract   │  ← Takes X% fee on every swap
│  (collects in WETH)   │
└──────────┬───────────┘
           │ (remaining amount)
           ▼
┌──────────────────────┐
│  Uniswap V3           │
│  SwapRouter02         │
└──────────────────────┘
```

- Fee collected in WETH (native to the pair)
- Percentage configurable by contract owner
- Revenue flows to the protocol treasury

**Implementation status:** The current `keeperService.ts` submits transactions
directly via KeeperHub or RPC. The fee router contract is the next integration
step — it would intercept the `calldata` between Uniswap quote and KeeperHub submission.

#### 2. iNFT Sale on 0G

The agent itself is tokenized as an **intelligent NFT (iNFT)** and sold on 0G:

- Each CapyMate instance is a unique agent with its own:
  - Wallet address
  - 0G Storage key (identity + memory)
  - Strategy parameters (allocation ranges, risk profile)
  - Performance history (verifiable via on-chain logs)
- Buyers purchase the iNFT through 0G's marketplace
- Ownership of the iNFT grants:
  - Exclusive control over the agent's private key
  - Right to configure strategy parameters
  - Access to the agent's dashboard and monitoring
  - Agent autonomy: the agent continues running independently on-chain
- The iNFT metadata (strategy, history, allocation rules) is stored on 0G Storage
  alongside the agent state

**Implementation status:** The agent infrastructure (identity, memory persistence,
autonomous execution) is built. iNFT minting on 0G would wrap the existing
`AgentState` + wallet into an ERC-721 compatible token with metadata stored
on 0G's decentralized file system.

### Combined Model

```
┌──────────────────────────────────────────────────────────────────┐
│                      CAPYMATE BUSINESS MODEL                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────┐          ┌─────────────────────────────┐ │
│  │  iNFT SALE (0G)      │          │  SWAP FEE (Smart Contract)   │ │
│  │                      │          │                              │ │
│  │  • One-time purchase │          │  • Recurring revenue          │ │
│  │  • Agent ownership   │          │  • Per-trade percentage       │ │
│  │  • Includes agent    │          │  • Collected in WETH          │ │
│  │    identity + memory │          │  • Grows with agent activity  │ │
│  │  • Metadata on 0G    │          │  • Passive income stream      │ │
│  └─────────────────────┘          └─────────────────────────────┘ │
│                                                                    │
│  Primary Revenue: iNFT sale (upfront) + Swap fees (recurring)     │
│  Target Audience: DeFi traders wanting autonomous AI agents        │
│  Competitive Edge: On-chain verifiability + decentralized memory  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/types/index.ts` | All TypeScript interfaces (LLMDecision, AgentState, PortfolioState, etc.) |
| `src/config/constants.ts` | SAFETY_CONFIG, STORAGE_CONFIG, contract addresses, network config, env loader |
| `src/logic/engine.ts` | 6-step orchestration loop with `isRunning` mutex and state merge logic |
| `src/logic/validator.ts` | 6 safety validation rules |
| `src/logic/portfolio.ts` | Allocation + trade amount calculations |
| `src/services/llmService.ts` | **System prompt here** (line 168), Zod validation, mock fallback |
| `src/services/balanceService.ts` | On-chain WETH/USDC/ETH balance reads |
| `src/services/0gService.ts` | 0G Storage KV read/write (mock falls back to `data/agent-state.json`) |
| `src/services/newsService.ts` | CryptoPanic API + mock news |
| `src/services/uniswapService.ts` | Quote fetching + swap calldata generation |
| `src/services/keeperService.ts` | Transaction submission (KeeperHub + direct RPC fallback) |
| `src/api/server.ts` + `routes.ts` | Express API for dashboard and external control |
| `src/index.ts` | Entry point — wires services, engine, and API server |
| `scripts/demo.ts` | Hackathon demo with bullish/bearish scenarios |
| `scripts/deploy.ts` | Hardhat deploy script for MockPortfolioTracker |
| `contracts/MockPortfolioTracker.sol` | Minimal on-chain state proxy for gas-efficient memory |
| `test/contracts/MockPortfolioTracker.ts` | Hardhat contract test |
| `dashboard/` | React + Vite + Tailwind + Recharts visualization |

---

## Comprehensive Testing Guide

### Quick Verification (30 seconds)

```bash
# 1. TypeScript compilation
npm run typecheck
# Expected: 0 errors

# 2. Run demo
npm run demo
# Expected: bullish + bearish scenarios, memory persistence
```

### Backend Smoke Tests

All tests run in mock mode — no API keys needed.

```bash
# Engine tests (13 assertions)
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-engine.ts

# Validator tests (8 assertions — all 6 safety rules)
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-validator.ts

# LLM mock tests (13 assertions — keyword detection, caching)
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-llm-mock.ts

# Zod validation tests (6 assertions — fallback behavior)
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-llm-zod.ts

# News service smoke test
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-news.ts

# 0G storage round-trip test
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-0g.ts

# API server smoke test
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-api.ts

# KeeperHub dry-run test
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-keeper-dryrun.ts

# KeeperHub mock test
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-keeper-mock.ts

# Uniswap quote + calldata test
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-uniswap.ts
```

### Agent Plugin Mode Tests

```bash
# 1. Start the server
USE_MOCK_SERVICES=true DRY_RUN=true npx tsx src/index.ts &
SERVER_PID=$!
sleep 2

# 2. Test SENSE endpoint
curl -s http://localhost:3000/api/sense | jq .
# Expected: { portfolio: { balances, total_value_usd, ... }, news: [...] }

# 3. Test DECIDE endpoint
curl -s -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -d '{
    "sentiment": "bullish",
    "confidence": 0.85,
    "reasoning": "ETH ETF approval",
    "target_allocation": { "WETH": 0.8, "USDC": 0.2 },
    "key_signals": ["SEC approves ETF"]
  }' | jq '.[] | { step: .step, success }'
# Expected: VALIDATE success, EXECUTE success, LOG success

# 4. Check state persisted
curl -s http://localhost:3000/api/state | jq '.cycle_count'
# Expected: >= 1

kill $SERVER_PID
```

### Hardhat Blockchain Tests

```bash
cd blockchain_test
npm install

# Compile contracts
npx hardhat compile

# Run contract tests
npx hardhat test

# Start local node (terminal 1)
npx hardhat node

# Deploy contracts (terminal 2)
npx hardhat run scripts/deploy.ts --network localhost
```

### Dashboard Tests

```bash
cd dashboard
npm install

# Build check
npm run build

# E2E tests (requires backend running)
npx playwright test
```

### Real Integration Tests (Requires API Keys)

```bash
# Test with real Uniswap API (requires UNISWAP_API_KEY)
UNISWAP_API_KEY=your-key USE_MOCK_SERVICES=false npx tsx developer_test/tests/test-uniswap.ts

# Test with real 0G (requires ZERO_G_API_KEY)
ZERO_G_API_KEY=your-key USE_MOCK_SERVICES=false npx tsx developer_test/tests/test-0g.ts

# Test with real LLM (requires LLM_API_KEY)
LLM_API_KEY=sk-... USE_MOCK_SERVICES=false npx tsx developer_test/tests/test-llm-mock.ts
```

### Load / Stress Test

```bash
# Rapid-fire trigger requests (concurrency guard should prevent overlaps)
for i in {1..5}; do
  curl -s -X POST http://localhost:3000/api/trigger &
done
wait
# Expected: Only 1 cycle runs, others return empty with "Cycle already running"
```

## Development Commands

```bash
# TypeScript type check
npm run typecheck

# Run in mock mode (no keys needed)
USE_MOCK_SERVICES=true DRY_RUN=true npx tsx src/index.ts

# Run hackathon demo
npm run demo

# Dashboard dev server
cd dashboard && npm run dev

# Dashboard build
cd dashboard && npm run build

# Hardhat local blockchain
cd blockchain_test
npx hardhat node              # Start local node
npx hardhat compile           # Compile Solidity contracts
npx hardhat test              # Run contract tests
npx hardhat run scripts/deploy.ts --network localhost  # Deploy

# Test API manually
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/trigger
curl http://localhost:3000/api/state

# Agent plugin mode
curl -X POST http://localhost:3000/api/sense
curl -X POST http://localhost:3000/api/decide -H "Content-Type: application/json" -d '{...}'
```
