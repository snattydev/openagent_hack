# CapyMate

An autonomous AI agent that rebalances a WETH/USDC crypto portfolio based on real-time market sentiment analysis. Built for the ETHGlobal OpenAgent Hackathon.

## What It Does

The agent runs a 6-step autonomous loop:

1. **SENSE** — Fetches latest crypto news + wallet balances
2. **REMEMBER** — Loads previous decisions from decentralized storage (0G)
3. **REASON** — Sends context to an LLM for sentiment analysis
4. **VALIDATE** — Applies 6 safety rules before any trade
5. **EXECUTE** — Submits rebalance transactions via KeeperHub or direct RPC
6. **LOG** — Persists state to 0G Storage for cross-session memory

The agent is fully mockable — it runs end-to-end without any API keys for safe local testing and hackathon demos.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+, TypeScript 6 |
| Blockchain | Base Sepolia (testnet) |
| Wallet / RPC | ethers.js v6 |
| Storage | 0G Storage SDK (KV store) |
| DEX | Uniswap V3 Trading API |
| Execution | KeeperHub SDK (with direct RPC fallback) |
| AI | OpenAI-compatible LLM (GPT-4, Claude via proxy, Groq, etc.) |
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
│   │   ├── newsService.ts       # CryptoPanic API + mock news
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
├── scripts/
│   └── demo.ts                  # Hackathon demo (bullish + bearish)
├── developer_test/              # Tests, mocks, demo scripts
│   ├── test-validator.ts
│   ├── test-engine.ts
│   ├── test-llm-mock.ts
│   └── ...
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
└── context.md
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

For **mock mode** (no API keys needed), ensure these are set:

```env
DRY_RUN=true
USE_MOCK_SERVICES=true
```

For **real mode** (requires API keys), fill in the remaining variables:

```env
PRIVATE_KEY=0x...                    # Testnet wallet only
LLM_API_KEY=sk-...                   # OpenAI, Groq, or compatible
LLM_MODEL=gpt-4o-mini                # Or your preferred model
CRYPTOPANIC_API_KEY=...              # Optional (falls back to mock)
KEEPER_HUB_API_KEY=...               # Optional (uses direct RPC fallback)
ZERO_G_API_KEY=...                   # Optional (falls back to local JSON)
```

### 3. Run the Demo

The fastest way to see the agent in action — no API keys required:

```bash
npm run demo
# or: USE_MOCK_SERVICES=true npx tsx developer_test/scripts/demo.ts
```

Expected output (~15 seconds):
- **Scenario A — Bullish**: ETH ETF approved → LLM decides bullish → rebalances to 58% WETH / 42% USDC → validation passes → mock transaction executed
- **Scenario B — Bearish**: Exchange hacked → LLM decides bearish → rebalances to 42% WETH / 58% USDC → validation passes → mock transaction executed
- **Memory Demo**: Shows persisted state with cycle count and last decision

---

## Running the Full System

### Start the Agent + API Server

```bash
# Development (auto-reload on file changes)
npm run dev

# Production build
npm run build
npm start
```

The server starts on `http://localhost:3000` (or the `PORT` in your `.env`).

In **mock mode**, the agent does not auto-poll — you trigger cycles manually via the API.

In **real mode**, the agent auto-polls every `POLLING_INTERVAL_MS` (default: 5 minutes).

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/status` | Agent status: `isRunning`, `cycleCount`, `dailyTradeCount` |
| GET | `/api/state` | Full agent state: `last_decision`, `portfolio_history`, `cycle_count` |
| POST | `/api/trigger` | Manually trigger one agent cycle |

Example:
```bash
curl http://localhost:3000/api/status
# {"isRunning":false,"lastCycle":0,"cycleCount":0,"dailyTradeCount":0}

curl -X POST http://localhost:3000/api/trigger
# Runs one full SENSE→REMEMBER→REASON→VALIDATE→EXECUTE→LOG cycle
```

### Start the Dashboard

```bash
cd dashboard
npm install
npm run dev
```

The dashboard opens at `http://localhost:5173`.

It polls the API at `http://localhost:3000` every 5 seconds and displays:
- **Agent Status** — Running state, cycle count, daily trades
- **Portfolio Allocation** — Pie chart (current) + area chart (history)
- **Trade History** — Table with before→after allocation changes

> The dashboard is desktop-only and uses a dark theme.

---

## Testing

### Type Check

```bash
npm run typecheck
# Expected: 0 errors
```

### Run the Demo Script

```bash
npm run demo
```

This is the primary integration test. It verifies:
- All 6 services instantiate correctly
- The engine runs a full cycle
- Bullish/bearish sentiment routing works
- Validation rules are applied
- Mock transactions execute
- Memory persists across cycles

### Manual API Testing

Start the server in one terminal:
```bash
USE_MOCK_SERVICES=true DRY_RUN=true npx tsx src/index.ts
```

Test in another terminal:
```bash
# Health check
curl http://localhost:3000/api/health

# Trigger a cycle
curl -X POST http://localhost:3000/api/trigger

# Check updated state
curl http://localhost:3000/api/state
```

### Dashboard Build Verification

```bash
cd dashboard
npm run build
# Expected: "dist/" folder created with no errors
```

---

## Safety Constraints

The validator enforces 6 hard rules before any trade executes:

| Rule | Value | Description |
|------|-------|-------------|
| Allowed Tokens | WETH, USDC | Rejects any non-whitelisted token |
| Min Rebalance Threshold | 2% | Ignores tiny allocation shifts |
| Max Single Trade | 10% | Caps any single trade at 10% of portfolio |
| Max Slippage | 0.5% | Rejects quotes with excessive slippage |
| Cooldown | 15 min | Prevents rapid successive trades |
| Max Daily Trades | 6 | Circuit breaker for daily activity |

All thresholds are hardcoded in `src/config/constants.ts`.

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAIN_ID` | `84532` | Base Sepolia |
| `RPC_URL` | `https://sepolia.base.org` | JSON-RPC endpoint |
| `PRIVATE_KEY` | — | Wallet private key (testnet only!) |
| `LLM_API_KEY` | — | OpenAI-compatible API key |
| `LLM_MODEL` | `gpt-4o-mini` | Model identifier |
| `CRYPTOPANIC_API_KEY` | — | CryptoPanic API token |
| `KEEPER_HUB_API_KEY` | — | KeeperHub relay API key |
| `ZERO_G_ENDPOINT` | `https://indexer-storage-testnet-turbo.0g.ai` | 0G indexer URL |
| `ZERO_G_API_KEY` | — | 0G Storage API key |
| `POLLING_INTERVAL_MS` | `300000` | Auto-poll interval (5 min) |
| `PORT` | `3000` | Express API port |
| `DRY_RUN` | `true` | If `true`, logs trades but does not broadcast |
| `USE_MOCK_SERVICES` | `true` | If `true`, uses mock data for all services |

---

## Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| WETH | `0x4200000000000000000000000000000000000006` |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Uniswap V3 SwapRouter02 | `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4` |
| 0G Flow Contract | `0x22E03a6A89B950F1c82ec5e74F8ECa321a105296` |

---

## Troubleshooting

### `npm install` fails
- Ensure Node.js ≥ 20: `node --version`
- Clear cache: `npm cache clean --force && npm install`

### TypeScript errors
- Run `npm run typecheck` to see specific errors
- Ensure `tsconfig.json` has not been modified

### Demo script hangs
- Check that `.env` exists and `USE_MOCK_SERVICES=true` is set
- Delete `data/agent-state.json` to reset mock storage: `rm data/agent-state.json`

### Dashboard shows "API Disconnected"
- Ensure the backend is running on `http://localhost:3000`
- Check CORS is not blocked (the backend allows all origins in dev)

### Real mode: transactions fail
- Verify `PRIVATE_KEY` is set and has testnet ETH for gas
- Check `DRY_RUN=false` if you want actual broadcasts
- Ensure `CHAIN_ID=84532` for Base Sepolia

---

## Hackathon Demo Checklist

For judges — run this in one command:

```bash
npm install
npm run demo
```

What the demo shows:
1. **Autonomous sentiment analysis** — LLM reads news headlines and decides bullish/bearish
2. **Safety validation** — All 6 rules checked before trade execution
3. **On-chain execution** — Mock swap submitted via KeeperHub path
4. **Memory persistence** — Agent state saved to `data/agent-state.json` (0G in real mode)
5. **Clear reasoning trail** — Every decision logged with confidence, signals, and reasoning

Optional — start the dashboard for visual proof:
```bash
# Terminal 1
USE_MOCK_SERVICES=true npx tsx src/index.ts

# Terminal 2
cd dashboard && npm install && npm run dev
# Open http://localhost:5173

# Terminal 3 — trigger a cycle
curl -X POST http://localhost:3000/api/trigger
```

---

## License

ISC
