# CapyMate — Testing Guide

**For:** Developers testing the project before submission  
**Requires:** PRIVATE_KEY and RPC_URL for production tests; DRY_RUN=true for safe simulation

---

## Quick Verification (30 seconds)

```bash
# 1. TypeScript compilation
npm run typecheck
# Expected: 0 errors

# 2. Run demo
npm run demo
# Expected: bullish scenario → bearish scenario → memory persistence
```

Both must pass before doing anything else.

---

## Backend Tests

Run tests with required environment variables:

```bash
# Core engine test
PRIVATE_KEY=0x... RPC_URL=https://sepolia.base.org npx tsx developer_test/tests/test-engine.ts

# Safety rules test
npx tsx developer_test/tests/test-validator.ts

# Zod validation test
npx tsx developer_test/tests/test-llm-zod.ts

# Other service tests (require respective API keys)
CRYPTOPANIC_API_KEY=... npx tsx developer_test/tests/test-news.ts
ZERO_G_API_KEY=... npx tsx developer_test/tests/test-0g.ts
npx tsx developer_test/tests/test-api.ts
npx tsx developer_test/tests/test-keeper-dryrun.ts
npx tsx developer_test/tests/test-uniswap.ts
```

**Expected:** All show "PASS" for every check.

---

## Agent Plugin Mode Test

```bash
# 1. Start the server in background (DRY_RUN for safety)
DRY_RUN=true npx tsx src/index.ts &
SERVER_PID=$!
sleep 2

# 2. Test SENSE endpoint
curl -s http://localhost:3000/api/sense
# Expected: { "portfolio": {...}, "news": [...] }

# 3. Test DECIDE endpoint
curl -s -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -d '{"sentiment":"bullish","confidence":0.85,"reasoning":"ETH ETF","target_allocation":{"WETH":0.8,"USDC":0.2},"key_signals":["ETF"]}'
# Expected: 3 results — VALIDATE success, EXECUTE success, LOG success

# 4. Verify state persisted
curl -s http://localhost:3000/api/state | jq '.cycle_count'
# Expected: >= 1

# 5. Stop server
kill $SERVER_PID
```

---

## Hardhat Blockchain Tests

```bash
cd blockchain_test
npm install

# Compile contracts
npx hardhat compile

# Run contract tests (Hardhat v3 — uses mocha directly)
npx tsx node_modules/.bin/mocha test/*.ts

# Start local node (terminal 1)
npx hardhat node

# Deploy contracts (terminal 2)
npx hardhat run scripts/deploy.ts --network localhost
```

**Expected:** Contract compiles, 1 test passing, deploys to `0x5FbDB...`.

**Note:** Hardhat v3 uses `hardhat.network.getOrCreate()` in tests instead of `hardhat.network.provider`. Tests run against an in-memory EDR network — no external node required for `npm run test:contracts`.

---

## Dashboard Tests

```bash
cd dashboard
npm install

# Build check
npm run build

# E2E tests (requires backend running on port 3000)
npx playwright test
```

**Expected:** Build succeeds, 5/5 Playwright tests pass.

---

## Full Verification Checklist

Before submission, confirm all of these:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run demo` → bullish + bearish scenarios complete
- [ ] `test-engine.ts` → passes
- [ ] `test-validator.ts` → passes
- [ ] Agent plugin mode → SENSE returns data, DECIDE runs cycle
- [ ] Hardhat compile → success
- [ ] Hardhat test → `npx tsx node_modules/.bin/mocha test/*.ts` → 1 passing
- [ ] Dashboard build → success

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails | Check Node.js ≥ 20 (`node --version`) |
| TypeScript errors | Run `npm run typecheck`, fix reported issues |
| Demo shows old cycle counts | `rm data/agent-state.json` to reset |
| Hardhat errors | Must be in `blockchain_test/` directory |
| Dashboard API disconnected | Ensure backend running on `localhost:3000` |
| Missing PRIVATE_KEY | Set in `.env` file |

---

## Safe Testing with DRY_RUN

Set `DRY_RUN=true` in your `.env` to simulate trades without broadcasting transactions. This is the recommended way to test the full pipeline safely:

```bash
DRY_RUN=true npx tsx src/index.ts
```

The agent will:
- Read real balances from the blockchain
- Fetch real news from CryptoPanic
- Call the real LLM for sentiment analysis
- Validate decisions with real safety rules
- **Log but NOT broadcast** transactions

---

## What Requires Real API Keys

These integrations require API keys to function:
- **LLM** — `LLM_API_KEY` for autonomous sentiment analysis
- **CryptoPanic** — `CRYPTOPANIC_API_KEY` for news (returns empty without)
- **KeeperHub** — `KEEPER_HUB_API_KEY` for gasless relay (uses direct RPC without)
- **0G Storage** — `ZERO_G_API_KEY` for decentralized memory (falls back to local JSON without)
- **Uniswap** — `UNISWAP_API_KEY` for Trading API (rate-limited without)

The demo script (`npm run demo`) uses inline mock classes and does not require any API keys.
