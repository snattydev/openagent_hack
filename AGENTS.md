# CapyMate — Agent Context

*This file is loaded automatically by agent sessions. It contains critical context
for AI assistants working on the CapyMate codebase.*

---

## Project Identity

**CapyMate** is an autonomous AI agent that rebalances a WETH/USDC crypto portfolio
based on real-time market sentiment analysis. Built for the ETHGlobal OpenAgent Hackathon.

- **Runtime:** Node.js 20+, TypeScript 6
- **Chain:** Base Sepolia (testnet) → Mainnet
- **Storage:** 0G Storage HTTP API (decentralized KV store)
- **DEX:** Uniswap V3 Trading API
- **Execution:** KeeperHub REST API + direct RPC fallback
- **AI:** OpenAI-compatible LLM (GPT-4, Claude via proxy, Groq, etc.)
- **API:** Express + CORS
- **Dashboard:** React 18 + Vite + Tailwind CSS + Recharts
- **Local Blockchain:** Hardhat v3 + TypeScript (isolated in `blockchain_test/`)

---

## Architecture for Agents

### The 6-Step Cycle (engine.ts)

Every agent cycle follows this exact order. **Never reorder these steps.**

1. **SENSE** — Fetch news + balances → push to `portfolio_history` (with timestamp)
2. **REMEMBER** — Load saved state from 0G → **merge** with in-memory state (dedup by timestamp)
3. **REASON** — LLM analyzes sentiment → updates `last_decision` and `reasoning`
4. **VALIDATE** — 6 safety rules run against proposed trade
5. **EXECUTE** — Uniswap quote + calldata → KeeperHub submission
6. **LOG** — Prune `portfolio_history` to 20 entries max → save to 0G

### Critical: State Merge Behavior

The REMEMBER step does **NOT** simply overwrite `this.state`. It merges:

```typescript
// engine.ts ~line 122
const saved = await this.zeroGService.loadState(AGENT_ID);
if (saved !== null) {
  this.state.cycle_count = Math.max(this.state.cycle_count, saved.cycle_count);
  this.state.last_decision = saved.last_decision ?? this.state.last_decision;

  const inMemoryTimestamps = new Set(this.state.portfolio_history.map((p) => p.timestamp));
  const newHistory = (saved.portfolio_history ?? []).filter(
    (p) => !inMemoryTimestamps.has(p.timestamp),
  );
  this.state.portfolio_history = [...newHistory, ...this.state.portfolio_history];
}
```

**Why this matters:** SENSE pushes a new portfolio snapshot *before* REMEMBER loads the saved state. If REMEMBER overwrote `this.state`, that snapshot would be lost. The merge prevents data loss across cycles.

**Agent rule:** If modifying engine.ts REMEMBER or SENSE logic, always preserve the merge behavior.

### Gas Optimization for 0G Storage

0G Storage charges per byte. Before every LOG write, `portfolio_history` is pruned:

```typescript
// engine.ts ~line 306
if (this.state.portfolio_history.length > STORAGE_CONFIG.MAX_PERSISTED_HISTORY_ENTRIES) {
  this.state.portfolio_history = this.state.portfolio_history.slice(
    -STORAGE_CONFIG.MAX_PERSISTED_HISTORY_ENTRIES,
  );
}
```

Current cap: **20 entries** (`src/config/constants.ts` → `STORAGE_CONFIG.MAX_PERSISTED_HISTORY_ENTRIES`).

**Agent rule:** Do not increase this cap without considering gas cost implications. If the user asks for more history, suggest off-chain indexing or a separate archival solution.

---

## DRY_RUN Mode

Set `DRY_RUN=true` to simulate trades without broadcasting:

```bash
DRY_RUN=true npx tsx src/index.ts
```

In DRY_RUN mode:
- All real APIs are called (balances, news, LLM, quotes)
- Transactions are logged but NOT broadcast
- Safe for testing the full pipeline

**Agent rule:** Use DRY_RUN for safe testing. Never test with real trades unless explicitly requested.

---

## Safety Constraints (Non-Negotiable)

The validator enforces 6 hard rules in `src/logic/validator.ts`:

| # | Rule | Value |
|---|------|-------|
| 1 | Whitelist | Only WETH + USDC |
| 2 | Min Threshold | ≥2% allocation change |
| 3 | Max Trade | ≤10% of portfolio |
| 4 | Max Slippage | ≤0.5% |
| 5 | Cooldown | ≥15 minutes between trades |
| 6 | Daily Limit | ≤6 trades/day |

These are **hardcoded** in `SAFETY_CONFIG` and **not** exposed via API.

**Agent rule:** Never expose safety thresholds via API, dashboard, or env vars without explicit user approval. These are intentional guardrails.

---

## Local Blockchain (Hardhat)

Hardhat and all contract-related code are isolated in `blockchain_test/` to avoid peer dependency conflicts (ethers v6 in main project vs ethers v5 that some Hardhat plugins require).

```bash
cd blockchain_test
npm install
npx hardhat node        # Start local node (chainId: 31337)
npx hardhat compile     # Compile contracts
npm run test:contracts  # Run contract tests
npx hardhat run scripts/deploy.ts --network localhost  # Deploy to localhost
```

### TypeScript Configuration

`blockchain_test/tsconfig.json` — Hardhat (`module: Node16`, `moduleResolution: node16`)

**Agent rule:** When adding Hardhat scripts or tests, work inside `blockchain_test/`. The main `tsconfig.json` excludes all Hardhat files.

### Contract: MockPortfolioTracker

`blockchain_test/contracts/MockPortfolioTracker.sol` is a minimal on-chain state proxy:

```solidity
struct State {
  uint256 cycleCount;
  bytes32 lastDecisionHash;
  uint256 timestamp;
}
```

It demonstrates the gas-efficient pattern for agent memory: store a compact hash
on-chain, keep the full history on 0G.

**Agent rule:** If adding new contracts, follow this pattern — minimize on-chain storage, maximize off-chain (0G) data.

---

## Key Patterns for Agents

### Adding a New Service

1. Create `src/services/myService.ts`
2. Export a class with a constructor accepting configuration options
3. Implement real API calls with graceful fallbacks
4. Add type to `EngineDeps` in `src/logic/engine.ts`
5. Wire into `Engine` constructor
6. Add to `src/types/index.ts` if new interfaces needed

### Adding a New Validation Rule

1. Add rule to `SAFETY_CONFIG` in `src/config/constants.ts`
2. Implement check in `src/logic/validator.ts` as a pure function
3. Wire into `validateRebalance()` in order of importance
4. Add test to `developer_test/tests/test-validator.ts`

### Modifying the State Schema

1. Update `AgentState` or related interfaces in `src/types/index.ts`
2. If adding a field, handle missing values in `0gService.ts` loadState (backward compat)
3. If the field affects payload size, consider pruning in engine.ts LOG step
4. Update `DEV.md` State Schema section
5. Run `npm run demo` to verify state persistence still works

---

## Common Pitfalls

### "My state changes aren't persisting"

Check:
- Is `cycle_count` incrementing? LOG step must complete for save to trigger
- Did REMEMBER overwrite your changes? Ensure merge logic is preserved

### "TypeScript errors in Hardhat files"

- Ensure you are in `blockchain_test/` directory, not root
- `blockchain_test/tsconfig.json` is used for Hardhat files
- Hardhat v3 uses `ethers` from `ethers` package (direct import)
- Contract tests need `@types/mocha` and `@types/chai`

### "The demo script shows old cycle counts"

`demo.ts` reuses the same `data/agent-state.json` across runs. Delete it to reset:
```bash
rm data/agent-state.json
```

### "Portfolio history is missing entries"

This was a bug (fixed). If it recurs:
- Check REMEMBER step merges state correctly
- Check SENSE adds `timestamp` to portfolio snapshots
- Check LOG step doesn't prune too aggressively

---

## File Map

```
src/
  types/index.ts              All interfaces
  config/constants.ts         SAFETY_CONFIG, STORAGE_CONFIG, addresses
  logic/
    engine.ts                 6-step cycle, state merge, pruning
    validator.ts              6 safety rules
    portfolio.ts              Allocation math
  services/
    0gService.ts              0G Storage (local JSON fallback)
    llmService.ts             LLM call + Zod validation
    balanceService.ts         On-chain balance reads
    newsService.ts            CryptoPanic API
    uniswapService.ts         Quote + calldata
    keeperService.ts          Tx submission
  api/
    server.ts                 Express app
    routes.ts                 REST endpoints
  index.ts                    Entry point

scripts/
  demo.ts                     Integration demo (bullish + bearish)

blockchain_test/
  contracts/
    MockPortfolioTracker.sol    On-chain state proxy
  scripts/
    deploy.ts                   Hardhat deploy script
  test/
    MockPortfolioTracker.ts     Contract tests

developer_test/
  tests/
    test-*.ts                 Service smoke tests
    test-agent-hardhat.ts     Agent + blockchain integration
  scripts/
    demo.ts                   Integration demo (inline mocks)

data/
  agent-state.json            Local state fallback (gitignored)

dashboard/
  src/                        React frontend
```

---

## Quick Commands Reference

```bash
# Development
npm run typecheck              # TypeScript check (main project only)
npm run demo                   # Full integration demo (inline mocks)
DRY_RUN=true npx tsx src/index.ts   # Run agent in simulation mode

# Hardhat
cd blockchain_test
npm install
npx hardhat node               # Start local blockchain
npx hardhat compile            # Compile Solidity
npm run test:contracts         # Run contract tests
npx hardhat run scripts/deploy.ts --network localhost  # Deploy to localhost

# API testing (while agent is running)
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/trigger
curl http://localhost:3000/api/state

# Reset local state
rm data/agent-state.json
```

---

## Agent Decision Log

*Track significant architectural decisions here for future agent context.*

### 2025-04-29 — State Merge Fix + Gas Optimization + Hardhat Scaffold

**Changes:**
1. Fixed `engine.ts` REMEMBER step to merge saved state instead of overwriting, preventing `portfolio_history` loss across cycles
2. Added `timestamp` to `PortfolioState` interface for deduplication
3. Added `STORAGE_CONFIG.MAX_PERSISTED_HISTORY_ENTRIES = 20` to cap 0G payload size
4. Installed Hardhat v2 with TypeScript support, split tsconfig for module resolution
5. Created `MockPortfolioTracker.sol` as minimal on-chain state proxy
6. Added npm scripts: `node`, `compile`, `test:contracts`, `deploy:local`

**Rationale:**
- State merge: SENSE pushes portfolio *before* REMEMBER loads saved state. Overwrite = data loss.
- History cap: 0G charges per byte. Unbounded history = unbounded gas cost.
- Hardhat: Needed for local blockchain emulation before testnet deployment.
- MockPortfolioTracker: Demonstrates gas-efficient pattern (compact hash on-chain, full data on 0G).

**Verification:**
- `npm run typecheck` ✅
- `developer_test/tests/test-engine.ts` ✅ (13/13 pass)
- `npm run demo` ✅ (multi-cycle state persists correctly)
- `npm run compile` ✅
- `npm run test:contracts` ✅ (1 passing)

### 2026-05-02 — Hardhat Isolation to blockchain_test/

**Changes:**
1. Moved all Hardhat files (`hardhat.config.ts`, `contracts/`, `scripts/deploy.ts`, `test/contracts/`, `tsconfig.hardhat.json`) to `blockchain_test/`
2. Created separate `package.json` in `blockchain_test/` with isolated Hardhat v3 dependencies
3. Removed Hardhat-related devDependencies from root `package.json`
4. Fixed contract test for Hardhat v3 API (ethers v6, `hardhat.artifacts.readArtifact`)
5. Main project now installs cleanly without `--legacy-peer-deps`

**Rationale:**
- `@typechain/hardhat@6` requires ethers v5 as peer dependency, but main project uses ethers v6
- Isolating Hardhat eliminates npm peer dependency conflicts
- Root project stays lean; blockchain_test manages its own dependency tree

**Verification:**
- `npm install` in root ✅ (0 peer dep conflicts)
- `npm install` in blockchain_test ✅
- `npm run typecheck` ✅ (0 errors)
- `npx hardhat compile` in blockchain_test ✅
- `npm run test:contracts` in blockchain_test ✅ (1 passing)
- All backend smoke tests ✅ (58 assertions)
- Integration demo ✅

### 2026-05-03 — Mock Mode Removal from Production

**Changes:**
1. Removed `mock` parameter and mock implementations from all production services
2. Removed `USE_MOCK_SERVICES` from config and `.env`
3. Updated demo script to use inline mock classes
4. Production services now always use real implementations
5. Graceful fallbacks remain for missing optional API keys

**Rationale:**
- Production code should not contain mock logic
- Mock implementations belong in test/demo code only
- Cleaner separation between production and testing concerns

**Verification:**
- `npm run typecheck` ✅ (0 errors)
- `npm run demo` ✅ (works with inline mocks)
- All docs updated ✅
