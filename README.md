# CapyMate

**AI Agent Crypto Harness — Plugin any LLM into DeFi trading with safety guardrails.**

Built for the ETHGlobal OpenAgent Hackathon.

CapyMate is a drop-in crypto execution layer for AI agents. Your agent (Claude, GPT-4, DeepSeek, etc.) provides the reasoning; CapyMate handles validation, on-chain execution via Uniswap, decentralized memory via 0G, and transaction relay via KeeperHub.

**Zero configuration for host agents.** CapyMate exposes a clean REST API. The host agent calls `POST /api/sense` to get market data, runs its own LLM to decide allocation, then calls `POST /api/decide` to execute — with 6 hardcoded safety rules enforcing every trade.

CapyMate also runs **autonomously** with its own LLM for fully automated sentiment-driven rebalancing.

---

## Agent Plugin Mode (Primary)

CapyMate runs as a harness that any AI agent can use as its crypto execution and memory layer.

**Flow:**

```
┌─────────────────┐     POST /api/sense      ┌─────────────┐
│   Host Agent    │  ←  portfolio + news     │  CapyMate   │
│  (Claude, GPT)  │                        │   Harness   │
└─────────────────┘                        └─────────────┘
         │                                        │
         │   Host agent runs its own LLM          │
         │   to analyze sentiment & decide        │
         │   target allocation                    │
         │                                        │
         ▼                                        ▼
┌─────────────────┐     POST /api/decide     ┌─────────────┐
│   Host Agent    │  →  LLMDecision JSON     │  CapyMate   │
│  (Claude, GPT)  │                        │   Harness   │
└─────────────────┘                        └─────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │  1. VALIDATE    │
                                          │  2. EXECUTE     │
                                          │  3. LOG to 0G   │
                                          └─────────────────┘
```

**Why this matters:**
- **Zero API keys for the host agent** — it already has an LLM; CapyMate handles the crypto-specific work
- **Safety by default** — 6 hardcoded rules prevent bad trades (whitelist, threshold, max trade, slippage, cooldown, daily limit)
- **Persistent memory** — agent state survives restarts via 0G Storage
- **Gasless execution option** — KeeperHub relay with automatic direct-RPC fallback

---

## Installation

### Prerequisites

- Node.js ≥ 20
- npm
- A Base Sepolia wallet with testnet ETH

### 1. Install

```bash
git clone <repo-url>
cd capymate
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
PRIVATE_KEY=0x...                    # Base Sepolia wallet private key
RPC_URL=https://sepolia.base.org     # Or your preferred RPC

# Optional — for autonomous LLM mode
LLM_API_KEY=sk-...                   # OpenAI, Groq, or compatible
LLM_MODEL=gpt-4o-mini                # Or your preferred model
LLM_BASE_URL=https://api.openai.com/v1  # Optional, for DeepSeek/Groq

# Optional — service integrations (graceful degradation if missing)
KEEPER_HUB_API_KEY=...               # Gasless relay via KeeperHub
UNISWAP_API_KEY=...                  # Rate-limited without key
CRYPTOPANIC_API_KEY=...              # Returns empty news if no key
ZERO_G_API_KEY=...                   # Falls back to local JSON

# Behavior
DRY_RUN=false                        # Set to true to simulate trades
POLLING_INTERVAL_MS=300000           # 5 minutes between cycles
PORT=3000                            # REST API port
```

### 3. Run

```bash
# Development with auto-reload
npm run dev

# Production
npm run build
npm start
```

The API server starts on `http://localhost:3000`.

### 4. Connect Your Agent

**Step 1 — Get market data:**
```bash
curl -X POST http://localhost:3000/api/sense
# → { "portfolio": { "balances": [...], "total_value_usd": 1234.56 }, "news": [...] }
```

**Step 2 — Your agent analyzes sentiment and decides allocation.**

**Step 3 — Execute the trade:**
```bash
curl -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -d '{
    "sentiment": "bullish",
    "confidence": 0.85,
    "reasoning": "ETH ETF approval signals strong upside",
    "target_allocation": { "WETH": 0.8, "USDC": 0.2 },
    "key_signals": ["SEC approves Ethereum ETF"]
  }'
# → VALIDATE → EXECUTE → LOG results
```

---

## Autonomous Mode

CapyMate can also run fully autonomously with its own LLM. It fetches news, analyzes sentiment, validates, and executes trades on a polling interval.

Enable by setting `LLM_API_KEY` and leaving the API server running. The agent will auto-poll every `POLLING_INTERVAL_MS` (default: 5 minutes).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+, TypeScript 6 |
| Blockchain | Base Sepolia (testnet) |
| Wallet / RPC | ethers.js v6 |
| Storage | 0G Storage HTTP API (indexer + Flow Contract) |
| DEX | Uniswap V3 Trading API |
| Execution | KeeperHub REST API + direct RPC fallback |
| AI | OpenAI-compatible LLM (GPT-4, Claude, Groq, DeepSeek, etc.) |
| News | CryptoPanic API |
| API Server | Express + CORS |
| Dashboard | React 18 + Vite + Tailwind CSS + Recharts |

---

## Project Structure

```
├── src/
│   ├── types/index.ts           # All TypeScript interfaces
│   ├── config/constants.ts      # Safety limits, addresses, env config
│   ├── services/
│   │   ├── balanceService.ts    # On-chain WETH/USDC/ETH balance reads
│   │   ├── 0gService.ts         # 0G Storage KV read/write
│   │   ├── newsService.ts       # CryptoPanic API
│   │   ├── llmService.ts        # OpenAI-compatible LLM + Zod validation
│   │   ├── uniswapService.ts    # Quote fetching + swap calldata
│   │   └── keeperService.ts     # Transaction submission
│   ├── logic/
│   │   ├── validator.ts         # 6 safety rules
│   │   ├── portfolio.ts         # Allocation calculations
│   │   └── engine.ts            # Main 6-step orchestration loop
│   ├── api/
│   │   ├── server.ts            # Express app factory
│   │   └── routes.ts            # REST endpoints
│   └── index.ts                 # Entry point
├── dashboard/                   # React + Vite frontend
│   └── src/
│       ├── App.tsx
│       ├── index.css
│       └── components/
│           ├── StatusCard.tsx
│           ├── AllocationChart.tsx
│           └── TradeHistory.tsx
├── developer_test/              # Tests, demos, mocks
│   ├── tests/
│   └── scripts/
├── blockchain_test/             # Hardhat + Solidity (isolated deps)
│   ├── contracts/
│   │   └── MockPortfolioTracker.sol
│   ├── scripts/
│   └── test/
├── DEV/                         # Public documentation
│   ├── CONTEXT.md               # Architecture guide
│   └── DEV.md                   # Testing guide
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/status` | Agent status: `isRunning`, `cycleCount`, `dailyTradeCount` |
| GET | `/api/state` | Full agent state: `last_decision`, `portfolio_history`, `cycle_count`, `current_allocation` |
| POST | `/api/trigger` | Manually trigger one full SENSE→REASON→VALIDATE→EXECUTE→LOG cycle |
| POST | `/api/sense` | Run SENSE step only — returns portfolio + news (for host agents) |
| POST | `/api/decide` | Accept an LLM decision and run VALIDATE→EXECUTE→LOG (for host agents) |

---

## Safety Constraints

The validator enforces 6 hard rules before any trade executes:

| Rule | Value | Description |
|------|-------|-------------|
| Allowed Tokens | WETH, USDC | Rejects any non-whitelisted token |
| Min Rebalance Threshold | 2% | Ignores tiny allocation shifts |
| Max Single Trade | 10% | Caps any single trade at 10% of portfolio |
| Max Slippage | 0.5% | Enforced via Uniswap slippage tolerance |
| Cooldown | 15 min | Prevents rapid successive trades |
| Max Daily Trades | 6 | Circuit breaker for daily activity |

All thresholds are hardcoded in `src/config/constants.ts` and are **not** exposed via API — they are intentional guardrails.

---

## Testing

### Type Check

```bash
npm run typecheck
# Expected: 0 errors
```

### Run the Demo

```bash
npm run demo
```

The demo uses inline mock implementations to verify:
- All 6 services instantiate correctly
- The engine runs a full cycle
- Bullish/bearish sentiment routing works
- Validation rules are applied
- Memory persists across cycles

### Manual API Testing

```bash
# Start server with DRY_RUN for safe testing
DRY_RUN=true npx tsx src/index.ts

# In another terminal:
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/sense
curl -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -d '{"sentiment":"bullish","confidence":0.85,"reasoning":"ETH ETF","target_allocation":{"WETH":0.8,"USDC":0.2},"key_signals":["ETF"]}'
```

### Dashboard Build

```bash
cd dashboard
npm install
npm run build
# Expected: "dist/" folder created with no errors
```

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAIN_ID` | `84532` | Base Sepolia |
| `RPC_URL` | `https://sepolia.base.org` | JSON-RPC endpoint |
| `PRIVATE_KEY` | — | Wallet private key (testnet only!) |
| `LLM_API_KEY` | — | OpenAI-compatible API key |
| `LLM_MODEL` | `gpt-4o-mini` | Model identifier |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | API base URL (for DeepSeek/Groq) |
| `CRYPTOPANIC_API_KEY` | — | CryptoPanic API token |
| `KEEPER_HUB_API_KEY` | — | KeeperHub relay API key |
| `UNISWAP_API_KEY` | — | Uniswap Trading API key |
| `ZERO_G_ENDPOINT` | `https://indexer-storage-testnet-turbo.0g.ai` | 0G indexer URL |
| `ZERO_G_API_KEY` | — | 0G Storage API key |
| `POLLING_INTERVAL_MS` | `300000` | Auto-poll interval (5 min) |
| `PORT` | `3000` | Express API port |
| `DRY_RUN` | `false` | If `true`, simulates trades without broadcasting |