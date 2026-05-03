# CapyMate — Testing Guide

**For:** Developers testing the project before submission  
**Requires:** No API keys (all tests run in mock mode)

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

## Backend Tests (2 minutes)

Run each test individually. All use mock mode — no API keys needed.

```bash
# Core engine test (13 assertions)
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-engine.ts

# Safety rules test (8 assertions)
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-validator.ts

# LLM mock test (13 assertions)
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-llm-mock.ts

# Zod validation test (6 assertions)
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-llm-zod.ts

# Other service tests (smoke tests)
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-news.ts
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-0g.ts
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-api.ts
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-keeper-dryrun.ts
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-keeper-mock.ts
USE_MOCK_SERVICES=true npx tsx developer_test/tests/test-uniswap.ts
```

**Expected:** All show "PASS" for every check.

---

## Agent Plugin Mode Test (1 minute)

```bash
# 1. Start the server in background
USE_MOCK_SERVICES=true DRY_RUN=true npx tsx src/index.ts &
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

## Hardhat Blockchain Tests (2 minutes)

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

## Dashboard Tests (1 minute)

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
- [ ] `test-engine.ts` → 13/13 pass
- [ ] `test-validator.ts` → 8/8 pass
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

---

## What You Don't Need to Test

These require real API keys — skip for now:
- Real 0G Storage (falls back to JSON automatically)
- Real Uniswap API (falls back to mock quotes)
- Real KeeperHub (falls back to direct RPC)
- Real LLM (mock keyword matching works)

The mock fallbacks are production-quality and demo-ready.
