# CapyMate

> **Autonomous Web3 AI Agent — Crypto Portfolio Manager with Transparent Reasoning**
>
> Built for the ETHGlobal OpenAgent Hackathon

## The Problem

Crypto traders make emotional decisions. They panic-sell dips, FOMO-buy tops, and abandon their strategy at the worst moments. **CapyMate removes the human from the execution loop.**

It reads market news, runs sentiment analysis through an LLM, validates every trade against hard safety rules, executes on-chain via Uniswap, stores its reasoning transparently on 0G, and routes transactions privately through KeeperHub — all autonomously, 24/7.

## What It Does

CapyMate is an autonomous AI agent that rebalances a WETH/USDC portfolio based on real-time market sentiment. Every 5 minutes it runs a full decision cycle:

```
SENSE  → fetch news + on-chain balances
REASON → LLM analyzes sentiment → target allocation
VALIDATE → 5 safety rules check the proposal
EXECUTE → Uniswap quote → on-chain swap
LOG → save state + reasoning to 0G Storage
```

**The agent's reasoning is transparent.** Every decision, every signal, every rationale is persisted to 0G — anyone can verify *why* a trade happened without exposing the signal prematurely.

**Transactions are protected.** KeeperHub routes swaps through private infrastructure, shielding the agent from MEV, front-running, and gas spikes.

## Live Demo

```bash
# Run the agent with inline mocks
npm install
npm run demo

# Or start the full pipeline
DRY_RUN=true npm run dev
```

The demo runs bullish and bearish scenarios end-to-end in ~10 seconds.

## How It Works

### 6-Step Autonomous Cycle

| Step | What Happens |
|------|-------------|
| **1. SENSE** | Fetches CryptoPanic headlines + reads WETH/USDC/ETH balances on-chain |
| **2. REASON** | Sends top 5 headlines + prices to LLM → gets sentiment + target allocation |
| **3. VALIDATE** | 5 safety rules enforce every trade before execution |
| **4. EXECUTE** | Gets Uniswap quote → generates swap calldata → submits transaction |
| **5. LOG** | Saves full state (decisions, history, reasoning) to 0G Storage |
| **6. REPEAT** | Waits `POLLING_INTERVAL_MS` (default 5 min) and runs again |

### Safety Rules (Hardcoded, Non-Negotiable)

| Rule | Value | Why |
|------|-------|-----|
| Token Whitelist | WETH, USDC only | Prevents rug-pull tokens |
| Min Rebalance | 2% | Ignores noise, avoids over-trading |
| Max Trade | 10% of portfolio | Caps exposure per decision |
| Slippage | 0.5% | Enforced by Uniswap router at execution |
| Cooldown | 15 minutes | Prevents panic-driven rapid trades |
| Daily Limit | 6 trades/day | Circuit breaker for unusual activity |

All thresholds are in `src/config/constants.ts` — **not exposed via API**. They are intentional guardrails, not configuration options.

### Two Modes

**Autonomous Mode** — Set `LLM_API_KEY` and the agent runs itself. Full hands-off portfolio management.

**Agent Plugin Mode** — Your AI (Claude, GPT-4, DeepSeek) calls `POST /api/sense` for market data, runs its own LLM to decide allocation, then calls `POST /api/decide` to execute through CapyMate's safety layer. Zero crypto-specific work for the host agent.

## Why This Stack

| Partner | What We Use | Why It Matters |
|---------|------------|----------------|
| **0G Storage** | Decentralized KV store for agent memory | Transparent, verifiable reasoning. Anyone can audit *why* the agent traded. Agent state survives restarts and can resume from any node. |
| **KeeperHub** | Private transaction relay + direct RPC fallback | MEV protection, front-running resistance, gas spike immunity. Private routing keeps signals out of the public mempool. |
| **Uniswap** | Trading API for quotes + swap calldata | Deep liquidity, battle-tested routing, server-side execution with no wallet UI needed. |
| **OpenAgent** | LLM-powered autonomous decision cycle | Natural language reasoning → structured allocation decisions → on-chain execution. |

## Quick Start

```bash
# 1. Install
git clone <repo-url>
cd capymate
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your Base Sepolia wallet + optional API keys

# 3. Run demo (no API keys needed)
npm run demo

# 4. Start the agent
npm run dev        # with auto-reload
# or
npm run build && npm start
```

The API server runs on `http://localhost:3000`. The React dashboard is in `/dashboard`.

## API Endpoints

```bash
# Get market data (for host agents)
curl -X POST http://localhost:3000/api/sense

# Execute a decision (for host agents)
curl -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -d '{
    "sentiment": "bullish",
    "confidence": 0.85,
    "reasoning": "ETH ETF approval",
    "target_allocation": { "WETH": 0.8, "USDC": 0.2 },
    "key_signals": ["SEC approves Ethereum ETF"]
  }'

# Trigger full autonomous cycle
curl -X POST http://localhost:3000/api/trigger

# View agent state
curl http://localhost:3000/api/state
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  SENSE → REMEMBER → REASON → VALIDATE       │
│  → EXECUTE → LOG → (repeat)                 │
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │ CryptoPanic │  │   On-Chain  │          │
│  │   News API  │  │   Balances  │          │
│  └──────┬──────┘  └──────┬──────┘          │
│         │                │                  │
│         ▼                ▼                  │
│  ┌─────────────────────────────────┐       │
│  │  LLM Sentiment Analysis         │       │
│  │  (OpenAI / Groq / DeepSeek)     │       │
│  └─────────────────┬───────────────┘       │
│                    │                        │
│         ┌──────────┴──────────┐            │
│         ▼                     ▼            │
│  ┌──────────────┐    ┌──────────────┐     │
│  │ 5 Safety     │    │ 0G Storage   │     │
│  │ Rules        │    │ (Memory)     │     │
│  └──────┬───────┘    └──────────────┘     │
│         │                                  │
│         ▼                                  │
│  ┌─────────────────────────────────┐      │
│  │  Uniswap V3  →  KeeperHub       │      │
│  │  Quote       →  Private Relay   │      │
│  │  + Swap      →  + Fallback RPC  │      │
│  └─────────────────────────────────┘      │
└─────────────────────────────────────────────┘
```

## Project Structure

```
src/
  logic/
    engine.ts         ← 6-step orchestration loop
    validator.ts      ← 5 safety rules
    portfolio.ts      ← Allocation math
  services/
    balanceService.ts ← On-chain reads (ethers.js)
    newsService.ts    ← CryptoPanic API
    llmService.ts     ← OpenAI-compatible + Zod validation
    uniswapService.ts ← Trading API (quote + calldata)
    keeperService.ts  ← Private relay + direct RPC fallback
    0gService.ts      ← Decentralized agent memory
dashboard/            ← React + Vite + Tailwind + Recharts
blockchain_test/      ← Hardhat + MockPortfolioTracker.sol
developer_test/       ← Smoke tests + demo scripts
```

## Testing

```bash
npm run typecheck    # 0 TypeScript errors
npm run demo         # Full integration demo (bullish + bearish)
```

## Prize Tracks

| Track | Integration | Evidence |
|-------|------------|----------|
| **0G Storage** | Agent state + reasoning saved to 0G indexer | `src/services/0gService.ts` |
| **KeeperHub** | Private tx relay with direct RPC fallback | `src/services/keeperService.ts` |
| **Uniswap** | Quotes + swap calldata via Trading API | `src/services/uniswapService.ts` |
| **OpenAgent** | Autonomous LLM-driven rebalancing cycle | `src/logic/engine.ts` |

## License

ISC
