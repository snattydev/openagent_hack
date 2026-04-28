# SENTI-BALANCER: Autonomous Sentiment-Based Portfolio Rebalancer

## TL;DR

> **Quick Summary**: Build an autonomous AI agent that rebalances a WETH/USDC crypto portfolio based on real-time market sentiment, with a 6-step loop (SENSE → REMEMBER → REASON → VALIDATE → EXECUTE → LOG), decentralized memory on 0G Storage, and a React dashboard for visualization.
>
> **Deliverables**:
> - Complete TypeScript agent with 6-step cycle
> - 5 external services (0G Storage, Uniswap, KeeperHub, LLM, CryptoPanic) with mock fallbacks
> - Safety validator with 6 hard constraints
> - React + Vite + Tailwind + Recharts dashboard (localhost)
> - Express API server for dashboard data
> - Hackathon demo script with bullish/bearish scenarios
> - On-chain balance reader service
>
> **Estimated Effort**: Large (hackathon, ~4 days)
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Types → Constants → Services → Validator → Engine → API → Dashboard → Demo

---

## Context

### Original Request
Build an autonomous AI agent that rebalances a WETH/USDC crypto portfolio based on real-time market sentiment analysis. The agent lives on-chain, stores memory in 0G Storage, and executes trades through KeeperHub. Hackathon project with ~4 day timeline, needs demo-ready in 1 day + few hours.

### Interview Summary
**Key Discussions**:
- LLM approach: Provider-agnostic, OpenAI-compatible chat completions API (single adapter covers Anthropic/via proxy, Groq, Together, local models)
- Mock strategy: Simple USE_MOCK_SERVICES env toggle (not auto-detect)
- Dashboard: React + Vite + Tailwind + Recharts for localhost visualization
- Package manager: npm
- Test strategy: No formal tests (hackathon timeline)
- DRY_RUN: Defaults to true for safety
- Chain: Base Sepolia (testnet) with Base Mainnet addresses noted for future

**Research Findings**:
- 0G Storage: Use KV store (Batcher/KvClient) for agent memory — mutable, efficient reads by key
- CryptoPanic: GET /api/v1/posts/ with auth_token query param, Node.js client available
- Uniswap V3: Trading API (POST /quote → POST /swap) recommended for server-side, Base Sepolia addresses confirmed
- KeeperHub: Research incomplete — mock service covers gap, executor researches SDK during implementation

### Metis Review
**Identified Gaps** (addressed):
- Missing HTTP API layer for dashboard communication → Added Express API server
- Missing balance service for on-chain reads → Added balanceService.ts
- No concurrent cycle prevention → Added isRunning mutex flag in engine
- LLM malformed output not handled → Added Zod validation + fallback to last-known allocation
- USDC on Base Sepolia unverified → Added Day 1 research task
- KeeperHub SDK unverified → Added Day 1 research task with direct RPC fallback
- Dashboard scope creep risk → Locked to read-only, 2 charts, HTTP polling

---

## Work Objectives

### Core Objective
Build a working autonomous crypto portfolio rebalancer that analyzes sentiment, validates trades, executes on-chain, persists memory, and displays results through a dashboard — demo-ready for hackathon judges.

### Concrete Deliverables
- `/src/types/index.ts` — All TypeScript interfaces
- `/src/config/constants.ts` — Safety limits, contract addresses, intervals
- `/src/services/balanceService.ts` — On-chain WETH/USDC/ETH balance reads
- `/src/services/0gService.ts` — 0G Storage KV read/write for agent memory
- `/src/services/uniswapService.ts` — Quote fetching & calldata generation
- `/src/services/keeperService.ts` — Transaction submission (KeeperHub or direct RPC)
- `/src/services/llmService.ts` — OpenAI-compatible sentiment analysis
- `/src/services/newsService.ts` — CryptoPanic + mock fallback
- `/src/logic/validator.ts` — Safety harness with 6 rules
- `/src/logic/portfolio.ts` — Allocation calculations
- `/src/logic/engine.ts` — Main orchestration loop with mutex
- `/src/api/server.ts` — Express HTTP server
- `/src/api/routes.ts` — REST endpoints for dashboard
- `/src/index.ts` — Entry point (agent + API server)
- `/dashboard/` — React + Vite + Tailwind + Recharts frontend
- `/scripts/demo.ts` — Hackathon demo with bullish/bearish scenarios
- `.env.example` — Environment variable template
- `package.json` — Dependencies and scripts

### Definition of Done
- [ ] `USE_MOCK_SERVICES=true npx tsx scripts/demo.ts` completes full cycle in <30s
- [ ] Dashboard at localhost:5173 shows allocation chart + trade history + status
- [ ] API at localhost:3000/api/status returns agent state as JSON
- [ ] Validator rejects trades exceeding safety limits
- [ ] DRY_RUN=true logs intended actions without executing on-chain
- [ ] Second agent cycle loads previous state from 0G Storage (or mock)

### Must Have
- All 6 steps of the agent loop working end-to-end (SENSE → REMEMBER → REASON → VALIDATE → EXECUTE → LOG)
- Mock services that work without any API keys
- Safety validator with all 6 constraints from SAFETY_CONFIG
- Dashboard with allocation bar chart, trade history, and agent status
- Demo script with bullish and bearish scenarios
- `isRunning` mutex preventing concurrent cycles
- Zod validation on LLM output with fallback to last-known allocation
- Fail-fast error handling (try/catch per service, log, skip, continue)

### Must NOT Have (Guardrails)
- NO WebSocket or SSE for dashboard real-time updates (HTTP polling only)
- NO start/stop/restart dashboard controls (CLI/scripts only)
- NO dashboard-based configuration editing (env vars only)
- NO retry logic with exponential backoff (fail fast, log, continue)
- NO multiple LLM provider adapters (one OpenAI-compatible adapter)
- NO PnL tracking, historical analytics, or notification systems
- NO schema versioning or migration for 0G Storage (flat JSON, one key)
- NO responsive/mobile dashboard layout (desktop localhost only)
- NO validator thresholds configurable via dashboard (hardcoded in constants.ts)
- NO authentication or user management for dashboard

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None (hackathon)
- **Framework**: None
- **Agent-Executed QA**: ALWAYS (mandatory for all tasks regardless)

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **CLI/TUI**: Use interactive_bash (tmux) — Run command, send keystrokes, validate output
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (npx tsx) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation + scaffolding):
├── Task 1: Project scaffolding + package.json + tsconfig + .env.example [quick]
├── Task 2: Type definitions (types/index.ts) [quick]
├── Task 3: Config constants (config/constants.ts) [quick]
└── Task 4: Research blocking unknowns (USDC address, KeeperHub, Uniswap liquidity, 0G smoke) [deep]

Wave 2 (After Wave 1 — services, MAX PARALLEL):
├── Task 5: balanceService.ts — on-chain balance reads (depends: 2, 3) [unspecified-high]
├── Task 6: 0gService.ts — KV store read/write (depends: 2, 3) [unspecified-high]
├── Task 7: newsService.ts — CryptoPanic + mock (depends: 2, 3) [unspecified-high]
├── Task 8: llmService.ts — OpenAI-compatible LLM + Zod validation (depends: 2, 3) [deep]
├── Task 9: uniswapService.ts — quote + calldata (depends: 2, 3) [unspecified-high]
└── Task 10: keeperService.ts — tx submission + direct RPC fallback (depends: 2, 3) [unspecified-high]

Wave 3 (After Wave 2 — logic + API):
├── Task 11: validator.ts — 6 safety rules (depends: 2, 3) [deep]
├── Task 12: portfolio.ts — allocation calculations (depends: 2, 3) [quick]
├── Task 13: engine.ts — orchestration loop + mutex (depends: 5-10, 11, 12) [deep]
├── Task 14: API server + routes (depends: 2, 3) [unspecified-high]
└── Task 15: index.ts — entry point wiring (depends: 13, 14) [quick]

Wave 4 (After Wave 3 — dashboard + demo):
├── Task 16: Dashboard scaffolding (React + Vite + Tailwind + Recharts) (depends: 14) [visual-engineering]
├── Task 17: Dashboard — AllocationChart + AgentStatus (depends: 16) [visual-engineering]
├── Task 18: Dashboard — TradeHistory component (depends: 16) [visual-engineering]
└── Task 19: Demo script (scripts/demo.ts) with bullish/bearish scenarios (depends: 13) [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 1 → Task 2/3 → Task 8 → Task 13 → Task 15 → Task 16 → Task 17/18 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 2,3,4 | 1 |
| 2 | 1 | 5-10, 11-15 | 1 |
| 3 | 1 | 5-10, 11-15 | 1 |
| 4 | 1 | 9, 10 | 1 |
| 5 | 2, 3 | 13 | 2 |
| 6 | 2, 3 | 13 | 2 |
| 7 | 2, 3 | 13 | 2 |
| 8 | 2, 3 | 13 | 2 |
| 9 | 2, 3, 4 | 13 | 2 |
| 10 | 2, 3, 4 | 13 | 2 |
| 11 | 2, 3 | 13 | 2 |
| 12 | 2, 3 | 13 | 2 |
| 13 | 5-12 | 15, 19 | 3 |
| 14 | 2, 3 | 16 | 3 |
| 15 | 13, 14 | - | 3 |
| 16 | 14 | 17, 18 | 4 |
| 17 | 16 | - | 4 |
| 18 | 16 | - | 4 |
| 19 | 13 | - | 4 |

### Agent Dispatch Summary

- **Wave 1**: 4 — T1, T2, T3 → `quick`, T4 → `deep`
- **Wave 2**: 6 — T5, T6, T7, T9, T10 → `unspecified-high`, T8 → `deep`
- **Wave 3**: 5 — T11 → `deep`, T12, T15 → `quick`, T13 → `deep`, T14 → `unspecified-high`
- **Wave 4**: 4 — T16 → `visual-engineering`, T17 → `visual-engineering`, T18 → `visual-engineering`, T19 → `unspecified-high`
- **FINAL**: 4 — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Project Scaffolding + Config

  **What to do**:
  - Initialize npm project with `npm init` in `/senti-balancer`
  - Install core dependencies: `typescript`, `tsx`, `ethers@6`, `express`, `zod`, `dotenv`
  - Install dev dependencies: `@types/node`, `@types/express`, `typescript` (dev)
  - Create `tsconfig.json` with strict mode, ES2022 target, Node module resolution
  - Create `.env.example` with all required env vars (CHAIN_ID, RPC_URL, PRIVATE_KEY, ZERO_G_ENDPOINT, ZERO_G_API_KEY, KEEPER_HUB_API_KEY, LLM_API_KEY, LLM_MODEL, CRYPTOPANIC_API_KEY, POLLING_INTERVAL_MS, DRY_RUN, USE_MOCK_SERVICES)
  - Create `.gitignore` (node_modules, dist, .env, .sisyphus/evidence)
  - Add npm scripts: `"dev"`, `"build"`, `"start"`, `"demo"`

  **Must NOT do**:
  - Don't install frontend dependencies yet (that's Task 16)
  - Don't create any source files (those are subsequent tasks)
  - Don't commit yet (commit after Wave 1)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard project scaffolding, single configuration pass
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — no UI yet

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3 once it completes package.json)
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `context.md` lines 8-16 — Tech stack and project structure specification

  **API/Type References**:
  - `context.md` lines 111-131 — Environment variables specification

  **WHY Each Reference Matters**:
  - context.md defines exact dependencies, env vars, and project layout

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Project scaffolding is complete and TypeScript compiles
    Tool: Bash
    Preconditions: Fresh /senti-balancer directory
    Steps:
      1. `cd /senti-balancer && npx tsc --noEmit` — expect 0 errors (or only import errors from not-yet-created files, which is OK at this stage)
      2. `ls package.json tsconfig.json .env.example .gitignore` — expect all 4 files exist
      3. `grep -c "typescript" package.json` — expect count >= 1 (typescript installed)
      4. `npm ls ethers express zod dotenv` — expect all 5 packages found
    Expected Result: Zero TypeScript compilation errors (or only missing-module errors for src/ files not yet created)
    Failure Indicators: TypeScript compilation errors in tsconfig.json, missing core dependencies
    Evidence: .sisyphus/evidence/task-1-scaffolding.txt

  Scenario: .env.example has all required variables
    Tool: Bash
    Preconditions: .env.example created
    Steps:
      1. `grep -c "CHAIN_ID\|RPC_URL\|PRIVATE_KEY\|ZERO_G\|KEEPER_HUB\|LLM_API_KEY\|LLM_MODEL\|CRYPTOPANIC\|POLLING_INTERVAL\|DRY_RUN\|USE_MOCK_SERVICES" .env.example` — expect 11 matches
    Expected Result: All 11 env vars present in .env.example
    Failure Indicators: Missing required environment variable
    Evidence: .sisyphus/evidence/task-1-envcheck.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat: scaffold project with tsconfig, .env.example, and deps`
  - Files: `package.json, tsconfig.json, .env.example, .gitignore`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 2. Type Definitions (types/index.ts)

  **What to do**:
  - Create `/src/types/index.ts` with all TypeScript interfaces used across the project
  - Define `LLMDecision` interface (sentiment, confidence, reasoning, target_allocation with WETH/USDC, key_signals)
  - Define `AgentState` interface (last_decision, portfolio_history, reasoning, timestamp, cycle_count)
  - Define `TokenBalance` interface (token: string, amount: number, decimals: number)
  - Define `PortfolioState` interface (balances: TokenBalance[], total_value_usd: number, current_allocation, target_allocation)
  - Define `TradeOrder` interface (from_token, to_token, amount, expected_output, slippage, route_data)
  - Define `ValidationResult` interface (valid: boolean, reason?: string,adjusted_amount?: number)
  - Define `NewsItem` interface (title, source, published_at, sentiment_vote, currencies)
  - Define `ServiceConfig` interface (all env var types gathered from .env.example)
  - Define `CycleStep` enum (SENSE, REMEMBER, REASON, VALIDATE, EXECUTE, LOG)
  - Define `CycleResult` interface (step, timestamp, data, success, error?)

  **Must NOT do**:
  - Don't add runtime validation logic (that's Zod in llmService)
  - Don't import from other project files (types should be standalone)
  - Don't create utility functions (pure type definitions only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, pure type definitions, no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — no UI

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 3 — no code dependencies, only needs package.json)
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 5-15 (all services and logic depend on types)
  - **Blocked By**: Task 1 (needs package.json for tsconfig)

  **References**:

  **API/Type References**:
  - `context.md` lines 98-109 — LLMDecision schema specification
  - `context.md` lines 82-94 — SAFETY_CONFIG structure and values

  **External References**:
  - 0G Storage SDK research notes — AgentState should match KV storage schema

  **WHY Each Reference Matters**:
  - context.md LLMDecision schema defines the exact shape the LLM must return
  - SAFETY_CONFIG values inform ValidationResult constraints

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Type definitions compile without errors
    Tool: Bash
    Preconditions: Task 1 complete (tsconfig.json exists)
    Steps:
      1. `npx tsc --noEmit --skipLibCheck` — expect 0 errors from types/index.ts
      2. `grep -c "export interface" src/types/index.ts` — expect at least 8 interfaces
      3. `grep -c "export enum" src/types/index.ts` — expect at least 1 enum (CycleStep)
    Expected Result: Zero TypeScript errors, all specified interfaces and enums exported
    Failure Indicators: TypeScript compilation errors, missing interfaces
    Evidence: .sisyphus/evidence/task-2-types.txt

  Scenario: LLMDecision type matches context.md specification
    Tool: Bash
    Preconditions: types/index.ts created
    Steps:
      1. `grep "sentiment.*:" src/types/index.ts` — expect field exists
      2. `grep "confidence.*:" src/types/index.ts` — expect field exists
      3. `grep "reasoning.*:" src/types/index.ts` — expect field exists
      4. `grep "target_allocation" src/types/index.ts` — expect field exists
      5. `grep "key_signals" src/types/index.ts` — expect field exists
    Expected Result: All 5 fields from context.md LLMDecision present
    Failure Indicators: Missing required LLMDecision fields
    Evidence: .sisyphus/evidence/task-2-llmdecision.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(types): define all TypeScript interfaces and enums`
  - Files: `src/types/index.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 3. Config Constants (config/constants.ts)

  **What to do**:
  - Create `/src/config/constants.ts` with all configuration constants
  - Define `SAFETY_CONFIG` object matching context.md exactly (ALLOWED_TOKENS, MIN_REBALANCE_THRESHOLD: 0.02, MAX_SINGLE_TRADE_PERCENT: 0.10, MAX_SLIPPAGE: 0.005, COOLDOWN_MINUTES: 15, MAX_DAILY_TRADES: 6, SENTIMENT_CACHE_MINUTES: 10)
  - Define `NETWORK_CONFIG` (CHAIN_ID: 84532, RPC_URL from env, WETH_ADDRESS, USDC_ADDRESS — placeholder USDC with TODO comment until Task 4 research resolves it)
  - Define `CONTRACT_ADDRESSES` (0G_FLOW_CONTRACT for testnet, SwapRouter address for Base Sepolia)
  - Define `SERVICE_ENDPOINTS` (CryptoPanic base URL, 0G indexer URL)
  - Define `DEFAULT_ALLOCATION` (WETH: 0.5, USDC: 0.5 — neutral starting position)
  - Export `getConfig()` function that reads env vars via dotenv and returns typed ServiceConfig

  **Must NOT do**:
  - Don't hardcode private keys or API keys (read from env)
  - Don't make config dynamically adjustable via API (hardcoded as per guardrails)
  - Don't implement the USDC address yet (use placeholder until Task 4 research)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, constant definitions, minimal logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2)
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 5-15 (all services and logic depend on constants)
  - **Blocked By**: Task 1 (needs package.json)

  **References**:

  **API/Type References**:
  - `context.md` lines 82-94 — SAFETY_CONFIG exact values
  - `context.md` lines 111-131 — All env vars
  - 0G Storage research — Flow contract address `0x22E03a6A89B950F1c82ec5e74F8ECa321a105296` (testnet)
  - Uniswap V3 research — SwapRouter02 address `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4` (Base Sepolia)
  - Uniswap V3 research — WETH address `0x4200000000000000000000000000000000000006` (Base Sepolia)

  **WHY Each Reference Matters**:
  - SAFETY_CONFIG values must match context.md exactly — these are the safety constraints
  - Contract addresses must be correct for Base Sepolia testnet

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Constants match context.md SAFETY_CONFIG specification
    Tool: Bash
    Preconditions: constants.ts created
    Steps:
      1. `grep "MIN_REBALANCE_THRESHOLD.*0.02" src/config/constants.ts` — expect match
      2. `grep "MAX_SINGLE_TRADE_PERCENT.*0.10" src/config/constants.ts` — expect match
      3. `grep "MAX_SLIPPAGE.*0.005" src/config/constants.ts` — expect match
      4. `grep "COOLDOWN_MINUTES.*15" src/config/constants.ts` — expect match
      5. `grep "MAX_DAILY_TRADES.*6" src/config/constants.ts` — expect match
      6. `grep "SENTIMENT_CACHE_MINUTES.*10" src/config/constants.ts` — expect match
    Expected Result: All 6 safety values match context.md exactly
    Failure Indicators: Value mismatch with context.md specification
    Evidence: .sisyphus/evidence/task-3-constants.txt

  Scenario: Config reads from environment variables
    Tool: Bash
    Preconditions: constants.ts created, .env.example exists
    Steps:
      1. `grep "process.env" src/config/constants.ts` — expect at least 5 env reads
      2. `grep "CHAIN_ID\|RPC_URL\|PRIVATE_KEY\|DRY_RUN\|USE_MOCK_SERVICES" src/config/constants.ts` — expect all present
    Expected Result: Config reads sensitive values from env vars, not hardcoded
    Failure Indicators: Hardcoded API keys or private keys
    Evidence: .sisyphus/evidence/task-3-envcheck.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(config): add safety constants, network config, and service endpoints`
  - Files: `src/config/constants.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 4. Research Blocking Unknowns

  **What to do**:
  - **USDC on Base Sepolia**: Search Base Sepolia block explorer (https://sepolia.basescan.org) for USDC contract. If none exists, decide: deploy a mock ERC-20 token OR use another available stablecoin (USDbC was previously available). Document the address in constants.ts.
  - **KeeperHub SDK**: Search for KeeperHub npm package, GitHub repo, or documentation. Find: how to submit transactions, API key usage, Base Sepolia support. If SDK unavailable or undocumented, design keeperService.ts to use direct RPC `eth_sendRawTransaction` via ethers.js as the real implementation, with KeeperHub as optional alternate path.
  - **Uniswap V3 Base Sepolia liquidity**: Check if Uniswap V3 WETH/USDC pools exist on Base Sepolia with meaningful liquidity. If not, note that mock mode should be used for testnet swaps.
  - **0G Storage SDK smoke test**: If feasible within task time, write a minimal test script that does a KV write/read to the 0G testnet. If SDK fails, document fallback to local JSON file storage.
  - Update `src/config/constants.ts` with the verified USDC contract address (or mock ERC-20 address)
  - Document all findings in a research notes file at `.sisyphus/research-notes.md`

  **Must NOT do**:
  - Don't build full service implementations (those are subsequent tasks)
  - Don't spend more than 30 minutes per research item
  - Don't block on research if an item is truly unresolvable — document it as "use mock" and move on

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires investigation, web research, and documentation synthesis across multiple unknowns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1-3 running concurrently)
  - **Parallel Group**: Wave 1 (with Tasks 1-3)
  - **Blocks**: Tasks 9, 10 (Uniswap and Keeper services need research results)
  - **Blocked By**: Task 1 (needs project directory)

  **References**:

  **External References**:
  - Base Sepolia explorer: https://sepolia.basescan.org — search for USDC, USDbC, or similar stablecoin
  - Uniswap V3 research notes — SwapRouter02 address, WETH address for Base Sepolia
  - 0G Storage research notes — `@0gfoundation/0g-ts-sdk`, Batcher/KvClient API, testnet endpoints
  - KeeperHub — research was incomplete, needs fresh investigation

  **WHY Each Reference Matters**:
  - USDC contract address is required for balanceService and swap operations
  - KeeperHub API determines the entire architecture of keeperService
  - Uniswap liquidity determines whether testnet swaps are viable

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Research notes document all 4 unknowns
    Tool: Bash
    Preconditions: Research complete
    Steps:
      1. `test -f .sisyphus/research-notes.md` — expect file exists
      2. `grep -c "USDC\|KeeperHub\|Uniswap.*liquidity\|0G.*smoke" .sisyphus/research-notes.md` — expect 4 sections
    Expected Result: Research notes file exists with documented findings for all 4 unknowns
    Failure Indicators: Missing research file or fewer than 4 topics documented
    Evidence: .sisyphus/evidence/task-4-research.txt

  Scenario: Constants updated with verified contract addresses
    Tool: Bash
    Preconditions: Research complete, constants.ts updated
    Steps:
      1. `grep "USDC_ADDRESS" src/config/constants.ts` — expect a valid hex address (not placeholder or TODO)
    Expected Result: USDC_ADDRESS contains a verified contract address or documented mock address
    Failure Indicators: USDC_ADDRESS still contains "TODO" or placeholder text
    Evidence: .sisyphus/evidence/task-4-usdc.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `chore: research blocking unknowns and update contract addresses`
  - Files: `src/config/constants.ts, .sisyphus/research-notes.md`
  - Pre-commit: `npx tsc --noEmit`

- Pre-commit: `npx tsc --noEmit`

- [ ] 5. Balance Service (balanceService.ts)

  **What to do**:
  - Create `/src/services/balanceService.ts`
  - Implement `getWalletBalances(address: string): Promise<PortfolioState>` — reads WETH, USDC, and ETH balances from on-chain via ethers.js
  - Use ERC-20 `balanceOf` + `decimals` calls for WETH and USDC token balances
  - Use `eth_getBalance` for ETH balance (gas reserve check)
  - Calculate total portfolio value in USD terms (using token prices from Uniswap or mock prices)
  - Calculate current allocation percentages (WETH%, USDC%)
  - When `USE_MOCK_SERVICES=true`, return deterministic mock balances (e.g., 1.5 WETH + 3000 USDC)
  - Export `BalanceService` class with constructor taking `{ provider, wethAddress, usdcAddress }` or mock flag

  **Must NOT do**:
  - Don't implement price feeds beyond what Uniswap service provides
  - Don't add caching (engine handles caching strategy)
  - Don't use WebSocket subscriptions for real-time balance updates

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires ethers.js ERC-20 interaction, mathematical calculations, mock service pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6-10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13 (engine)
  - **Blocked By**: Tasks 2, 3 (types and constants)

  **References**:

  **API/Type References**:
  - `src/types/index.ts` — PortfolioState, TokenBalance, ServiceConfig interfaces
  - `src/config/constants.ts` — NETWORK_CONFIG (WETH_ADDRESS, USDC_ADDRESS, RPC_URL)

  **External References**:
  - ethers.js v6 docs — ERC-20 contract interaction pattern: `new Contract(address, ERC20_ABI, provider)`

  **WHY Each Reference Matters**:
  - PortfolioState defines the return shape the engine expects
  - NETWORK_CONFIG provides contract addresses for on-chain reads

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Mock balance service returns valid PortfolioState
    Tool: Bash (npx tsx)
    Preconditions: Task 2, 3 complete; USE_MOCK_SERVICES=true
    Steps:
      1. Write a small test script: `import { BalanceService } from './src/services/balanceService'; const svc = new BalanceService({ mock: true }); const balances = await svc.getWalletBalances('0x1234'); console.log(JSON.stringify(balances));`
      2. Run with `USE_MOCK_SERVICES=true npx tsx test-balance.ts`
      3. Verify output has `balances` array with WETH and USDC entries
      4. Verify `current_allocation` has WETH and USDC percentages that sum to ~1.0
    Expected Result: Valid PortfolioState JSON with balances, total_value_usd, and allocation percentages summing to 1.0
    Failure Indicators: Missing fields, allocation percentages don't sum to ~1.0
    Evidence: .sisyphus/evidence/task-5-mock-balance.txt

  Scenario: Balance service handles zero balance gracefully
    Tool: Bash (npx tsx)
    Preconditions: Mock mode enabled, wallet with 0 balance
    Steps:
      1. Call `getWalletBalances` with a wallet that has 0 of everything
      2. Verify PortfolioState still has valid structure (not null/undefined)
      3. Verify allocation is 0/0 or handles division by zero
    Expected Result: Valid PortfolioState with zero balances, no crash on division by zero
    Failure Indicators: NaN percentages, null return, unhandled exception
    Evidence: .sisyphus/evidence/task-5-zero-balance.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(services): implement balance service with on-chain reads and mock`
  - Files: `src/services/balanceService.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 6. 0G Storage Service (0gService.ts)

  **What to do**:
  - Create `/src/services/0gService.ts`
  - Implement `loadState(agentId: string): Promise<AgentState | null>` — reads agent state from 0G KV store
  - Implement `saveState(agentId: string, state: AgentState): Promise<void>` — writes state to 0G KV store
  - Use `@0gfoundation/0g-ts-sdk` Batcher/KvClient API based on research findings
  - Store state as a single flat JSON object under one key (no versioning, no migration)
  - When `USE_MOCK_SERVICES=true`, use local JSON file as mock (`./data/agent-state.json`)
  - Handle 0G Storage write failures gracefully: log error, continue cycle, don't halt agent
  - Export `ZeroGService` class with constructor taking config (indexer URL, signer, flow contract) or mock flag

  **Must NOT do**:
  - Don't implement schema versioning or migration logic
  - Don't compress or encrypt state (flat JSON only)
  - Don't add caching beyond what the engine manages
  - Don't halt the agent on storage write failure (log and continue)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires integrating unfamiliar SDK (0G Storage), managing async KV operations, error handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 7-10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13 (engine)
  - **Blocked By**: Tasks 2, 3 (types and constants)

  **References**:

  **API/Type References**:
  - `src/types/index.ts` — AgentState interface
  - `src/config/constants.ts` — ZERO_G_ENDPOINT, ZERO_G_API_KEY, 0G Flow contract address

  **External References**:
  - 0G Storage SDK research — Batcher for KV writes, KvClient for KV reads, MemData for file uploads
  - 0G testnet endpoints: RPC `https://evmrpc-testnet.0g.ai`, Indexer `https://indexer-storage-testnet-turbo.0g.ai`
  - Flow contract (testnet): `0x22E03a6A89B950F1c82ec5e74F8ECa321a105296`

  **WHY Each Reference Matters**:
  - AgentState defines what we store in 0G
  - 0G SDK research provides exact API signatures for Batcher/KvClient
  - Testnet endpoints and contract addresses are required for real 0G interaction

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Mock 0G service saves and loads state correctly
    Tool: Bash (npx tsx)
    Preconditions: Task 2, 3 complete; USE_MOCK_SERVICES=true
    Steps:
      1. `const svc = new ZeroGService({ mock: true }); await svc.saveState('agent-1', { last_decision: {...}, portfolio_history: [], timestamp: Date.now() });`
      2. `const loaded = await svc.loadState('agent-1'); console.log(JSON.stringify(loaded));`
      3. Verify loaded state matches saved state
      4. Delete `./data/agent-state.json` and call `loadState('agent-1')` — expect null (no state for unknown agent)
    Expected Result: Round-trip save/load works, unknown agent returns null
    Failure Indicators: State not persisted, loadState crashes on missing file
    Evidence: .sisyphus/evidence/task-6-mock-0g.txt

  Scenario: 0G service handles write failure gracefully
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true, make data directory read-only
    Steps:
      1. `chmod -r ./data` (make directory unwritable)
      2. Call `saveState('agent-1', state)`
      3. Verify: no crash, error logged to console, function returns undefined/throws caught error
      4. `chmod +r ./data` (restore permissions)
    Expected Result: Agent continues running after storage failure, error is logged
    Failure Indicators: Unhandled exception, agent crash
    Evidence: .sisyphus/evidence/task-6-write-failure.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(services): implement 0G Storage KV service with mock fallback`
  - Files: `src/services/0gService.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 7. News Service (newsService.ts)

  **What to do**:
  - Create `/src/services/newsService.ts`
  - Implement `fetchNews(currencies: string[]): Promise<NewsItem[]>` — fetches recent crypto news from CryptoPanic API
  - Use CryptoPanic GET `/api/v1/posts/` endpoint with `auth_token`, `currencies`, `filter=hot`, `kind=news` params
  - Parse response: extract `title`, `source.domain`, `published_at`, `votes` (positive/negative), `currencies` from each result
  - Map CryptoPanic response to `NewsItem` interface
  - Respect 30-second cache (don't call API more frequently)
  - When `USE_MOCK_SERVICES=true`, return deterministic mock news with bullish/bearish scenarios for demo
  - When `CRYPTOPANIC_API_KEY` is missing, automatically fall back to mock (error log + mock data)
  - Handle API errors (401, 429, 500): log error, return empty array (don't crash agent)
  - Export `NewsService` class with constructor taking config (apiKey, baseURL) or mock flag

  **Must NOT do**:
  - Don't send full article text to LLM (titles + summaries only, max 5 items)
  - Don't implement WebSocket or streaming news
  - Don't cache beyond 30-second minimum (respect CryptoPanic server-side cache)
  - Don't fetch more than 20 news items per call

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: HTTP API integration, response parsing, mock/scenario data design, error handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 8-10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13 (engine)
  - **Blocked By**: Tasks 2, 3 (types and constants)

  **References**:

  **API/Type References**:
  - `src/types/index.ts` — NewsItem interface
  - `src/config/constants.ts` — CRYPTOPANIC_API_KEY

  **External References**:
  - CryptoPanic API research — Base URL `https://cryptopanic.com/api/v1/posts/`, auth via `auth_token` query param
  - CryptoPanic Node.js client: `npm install cryptopanic` (optional, can use raw fetch)
  - CryptoPanic error handling: `info` key in response for API errors, HTTP 401/403/429/500

  **WHY Each Reference Matters**:
  - CryptoPanic API research provides exact endpoint URL, auth method, and response format
  - NewsItem interface defines what we extract from the API response

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Mock news service returns valid NewsItem array
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true
    Steps:
      1. `const svc = new NewsService({ mock: true }); const news = await svc.fetchNews(['ETH']); console.log(JSON.stringify(news, null, 2));`
      2. Verify array has 3-5 items
      3. Verify each item has title, source, published_at, and currencies fields
      4. Verify currencies field includes 'ETH' or 'WETH'
    Expected Result: Array of 3-5 NewsItem objects with all required fields
    Failure Indicators: Missing fields, empty array, wrong structure
    Evidence: .sisyphus/evidence/task-7-mock-news.txt

  Scenario: News service handles API failure gracefully
    Tool: Bash (npx tsx)
    Preconditions: CRYPTOPANIC_API_KEY=invalid_key, USE_MOCK_SERVICES=false
    Steps:
      1. Call `fetchNews(['ETH'])` with invalid API key
      2. Verify: function returns empty array (not crash)
      3. Verify: error is logged to console
    Expected Result: Empty array returned, error logged, no crash
    Failure Indicators: Unhandled exception, agent crash
    Evidence: .sisyphus/evidence/task-7-api-failure.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(services): implement CryptoPanic news service with mock fallback`
  - Files: `src/services/newsService.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 8. LLM Service (llmService.ts)

  **What to do**:
  - Create `/src/services/llmService.ts`
  - Implement `analyzeSentiment(news: NewsItem[], currentState: AgentState, prices: TokenBalance[]): Promise<LLMDecision>` — sends context to LLM and returns structured sentiment analysis
  - Support **OpenAI-compatible chat completions API format** (covers OpenAI, Anthropic via proxy, Groq, Together, local models)
  - Use `LLM_API_KEY` and `LLM_MODEL` from env for configuration
  - Construct system prompt that instructs LLM to return JSON matching `LLMDecision` schema
  - **Zod validation**: Parse LLM response with Zod schema matching LLMDecision. On validation failure: log error, fall back to last-known allocation from agent state, continue cycle
  - When `USE_MOCK_SERVICES=true`, return deterministic mock LLMDecision based on news sentiment
  - Respect `SENTIMENT_CACHE_MINUTES=10` — don't call LLM if a cached decision exists within 10 minutes
  - Handle LLM API errors: log, return last-known allocation, continue cycle

  **Must NOT do**:
  - Don't support multiple LLM provider adapters (one OpenAI-compatible format)
  - Don't retry failed LLM calls (fail fast, use last-known allocation)
  - Don't send full news article text (titles + summaries only, max 5 items)
  - Don't use LLM for anything beyond sentiment analysis

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires careful prompt engineering, Zod schema design, error handling, and caching logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5-7, 9-10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13 (engine)
  - **Blocked By**: Tasks 2, 3 (types and constants)

  **References**:

  **API/Type References**:
  - `src/types/index.ts` — LLMDecision, NewsItem, AgentState, TokenBalance interfaces
  - `src/config/constants.ts` — LLM_API_KEY, LLM_MODEL, SENTIMENT_CACHE_MINUTES

  **External References**:
  - OpenAI Chat Completions API: `POST /v1/chat/completions` with `model`, `messages`, `temperature`, `response_format` (JSON mode)
  - Zod npm package: schema definition and validation

  **WHY Each Reference Matters**:
  - LLMDecision defines the exact Zod schema shape
  - OpenAI-compatible format is the single adapter strategy — one format covers all providers

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Mock LLM service returns valid LLMDecision
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true
    Steps:
      1. `const svc = new LLMService({ mock: true }); const result = await svc.analyzeSentiment(mockNews, mockState, mockPrices);`
      2. Verify result.sentiment is one of 'bullish'|'bearish'|'neutral'
      3. Verify result.confidence is between 0 and 1
      4. Verify result.target_allocation.WETH + result.target_allocation.USDC ≈ 1.0
      5. Verify result.key_signals is an array with 1-3 items
      6. Verify result.reasoning is a string ≤ 200 chars
    Expected Result: Valid LLMDecision matching Zod schema, allocation sums to 1.0
    Failure Indicators: Invalid sentiment value, allocation doesn't sum to 1.0, missing fields
    Evidence: .sisyphus/evidence/task-8-mock-llm.txt

  Scenario: Zod validation catches malformed LLM response
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=false but LLM returns invalid JSON
    Steps:
      1. Simulate LLM returning `{ sentiment: "invalid", confidence: 1.5, target_allocation: {} }`
      2. Verify: Zod parse failure is caught
      3. Verify: Falls back to last-known allocation from AgentState
      4. Verify: Error logged to console
      5. Verify: Agent continues (no crash)
    Expected Result: Last-known allocation used, error logged, agent continues
    Failure Indicators: Unhandled Zod error, agent crash
    Evidence: .sisyphus/evidence/task-8-zod-validation.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(services): implement LLM sentiment service with Zod validation`
  - Files: `src/services/llmService.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 9. Uniswap Service (uniswapService.ts)

  **What to do**:
  - Create `/src/services/uniswapService.ts`
  - Implement `getQuote(fromToken: string, toToken: string, amount: string): Promise<TradeOrder>` — gets swap quote and route data
  - Implement `getSwapCalldata(tradeOrder: TradeOrder): Promise<{ to: string, data: string, value: string }>` — generates calldata for on-chain execution
  - Use Uniswap Trading API (POST `/quote` → POST `/swap`) for server-side use
    - Auth via `x-api-key` header from `KEEPER_HUB_API_KEY` env (or a separate UNISWAP_API_KEY)
    - Base URL: `https://trade-api.gateway.uniswap.org/v1`
  - Include Base Sepolia addresses: WETH `0x4200000000000000000000000000000000000006`, USDC (from Task 4 research)
  - Apply `MAX_SLIPPAGE` (0.5%) to quotes
  - When `USE_MOCK_SERVICES=true`, return deterministic mock quotes and calldata
  - Handle API errors: log, return null/throw, let engine handle the failure

  **Must NOT do**:
  - Don't use the Uniswap SDK package (use Trading API directly — simpler, no RPC dependency)
  - Don't execute swaps directly (that's keeperService)
  - Don't cache quotes (quotes expire — always fetch fresh)
  - Don't implement quote TTL logic (for hackathon: just log a warning if >60s between quote and execution)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires integrating Uniswap Trading API, handling hex calldata, managing slippage calculations
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5-8, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13 (engine)
  - **Blocked By**: Tasks 2, 3 (types), Task 4 (USDC address research)

  **References**:

  **API/Type References**:
  - `src/types/index.ts` — TradeOrder, ServiceConfig interfaces
  - `src/config/constants.ts` — MAX_SLIPPAGE, WETH_ADDRESS, USDC_ADDRESS, SwapRouter address
  - `.sisyphus/research-notes.md` — Verified USDC address from Task 4

  **External References**:
  - Uniswap Trading API: `POST https://trade-api.gateway.uniswap.org/v1/quote` → `POST /v1/swap`
  - Auth: `x-api-key` header
  - Base Sepolia SwapRouter02: `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4`
  - Base Sepolia WETH: `0x4200000000000000000000000000000000000006`

  **WHY Each Reference Matters**:
  - Trading API is simpler than SDK for server-side, no RPC dependency needed
  - Base Sepolia addresses must be correct for testnet swaps

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Mock Uniswap service returns valid quote and calldata
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true
    Steps:
      1. `const svc = new UniswapService({ mock: true }); const quote = await svc.getQuote('WETH', 'USDC', '1000000000000000000'); console.log(JSON.stringify(quote, null, 2));`
      2. Verify quote has from_token, to_token, amount, expected_output, slippage fields
      3. Get calldata: `const calldata = await svc.getSwapCalldata(quote); console.log(JSON.stringify(calldata));`
      4. Verify calldata has to (address), data (hex string starting with 0x), value fields
    Expected Result: Valid TradeOrder and calldata with all required fields
    Failure Indicators: Missing fields, non-hex calldata.data
    Evidence: .sisyphus/evidence/task-9-mock-uniswap.txt

  Scenario: Uniswap service applies slippage to quote
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true
    Steps:
      1. Get a quote with 1 WETH → USDC
      2. Verify the expected_output reflects MAX_SLIPPAGE (0.5%) tolerance
      3. Verify slippage field matches MAX_SLIPPAGE constant (0.005)
    Expected Result: Slippage tolerance applied correctly
    Failure Indicators: Slippage not matching config value
    Evidence: .sisyphus/evidence/task-9-slippage.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(services): implement Uniswap quote and calldata service`
  - Files: `src/services/uniswapService.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 10. Keeper Service (keeperService.ts)

  **What to do**:
  - Create `/src/services/keeperService.ts`
  - Implement `submitTransaction(calldata: { to: string, data: string, value: string }): Promise<string>` — submits a signed transaction on-chain
  - **Primary path**: Use KeeperHub SDK based on research from Task 4
  - **Fallback path**: If KeeperHub SDK is unavailable/broken, use direct RPC `eth_sendRawTransaction` via ethers.js
  - When `USE_MOCK_SERVICES=true`, return deterministic mock tx hash (`0x` + random hex)
  - When `DRY_RUN=true`, log the intended transaction and return mock tx hash WITHOUT actually broadcasting
  - Sign transactions with wallet private key from env
  - Handle transaction submission errors: log, throw descriptive error, let engine handle

  **Must NOT do**:
  - Don't implement retry logic (fail fast)
  - Don't track pending transactions (too complex for hackathon)
  - Don't implement gas estimation beyond basic `eth_gasPrice` (use reasonable mocks for testnet)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires on-chain transaction submission, ethers.js signing, dual path implementation (KeeperHub + direct RPC)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5-9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13 (engine)
  - **Blocked By**: Tasks 2, 3 (types and constants), Task 4 (KeeperHub research)

  **References**:

  **API/Type References**:
  - `src/types/index.ts` — TradeOrder interface
  - `src/config/constants.ts` — PRIVATE_KEY, RPC_URL, KEEPER_HUB_API_KEY
  - `.sisyphus/research-notes.md` — KeeperHub research findings from Task 4

  **External References**:
  - ethers.js v6: `Wallet`, `TransactionRequest`, `provider.sendTransaction()`
  - `.sisyphus/research-notes.md` — KeeperHub SDK findings, or direct RPC fallback design

  **WHY Each Reference Matters**:
  - Task 4 research determines whether to use KeeperHub SDK or direct RPC
  - ethers.js provides the fallback transaction submission path

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Mock keeper service returns tx hash without broadcasting
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true, DRY_RUN=true
    Steps:
      1. `const svc = new KeeperService({ mock: true, dryRun: true }); const txHash = await svc.submitTransaction({ to: '0x...', data: '0x...', value: '0' });`
      2. Verify txHash starts with '0x' and is 66 chars long
      3. Verify console log shows "DRY RUN: Would submit transaction" (or similar)
      4. Verify no actual on-chain transaction was sent
    Expected Result: Mock tx hash returned, DRY RUN logged, no on-chain broadcast
    Failure Indicators: No log message, actual broadcast attempted
    Evidence: .sisyphus/evidence/task-10-mock-keeper.txt

  Scenario: DRY_RUN=true prevents real transaction submission
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=false (real mode), DRY_RUN=true
    Steps:
      1. Call `submitTransaction` with DRY_RUN=true
      2. Verify: transaction is NOT sent to the network
      3. Verify: intended transaction details are logged
    Expected Result: No on-chain transaction, details logged
    Failure Indicators: Transaction broadcast to network when DRY_RUN=true
    Evidence: .sisyphus/evidence/task-10-dryrun.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(services): implement transaction submission service with KeeperHub and direct RPC fallback`
  - Files: `src/services/keeperService.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 11. Validator (logic/validator.ts)

  **What to do**:
  - Create `/src/logic/validator.ts`
  - Implement `validateRebalance(current: PortfolioState, proposed: LLMDecision, dailyTradeCount: number, lastTradeTime: number): ValidationResult`
  - Enforce all 6 safety rules from SAFETY_CONFIG:
    1. **Token whitelist**: Reject if `proposed.target_allocation` contains tokens other than WETH or USDC
    2. **Min rebalance threshold**: Reject if `|current_allocation.WETH - proposed.target_allocation.WETH|` < MIN_REBALANCE_THRESHOLD (0.02) for ALL tokens — meaning no single token's allocation changes by at least 2%
    3. **Max single trade**: Reject if any single trade amount > MAX_SINGLE_TRADE_PERCENT (0.10) of total portfolio value
    4. **Max slippage**: Reject if quoted slippage > MAX_SLIPPAGE (0.005) — note: slippage is checked at validation time using the proposed trade data
    5. **Cooldown**: Reject if `(Date.now() - lastTradeTime) < COOLDOWN_MINUTES * 60 * 1000`
    6. **Max daily trades**: Reject if `dailyTradeCount >= MAX_DAILY_TRADES (6)` — circuit breaker
  - Return `ValidationResult` with `valid: boolean`, `reason?: string`, and optionally `adjusted_amount?: number` (if trade was capped at max)
  - Handle edge cases:
    - Portfolio is 100% one token (0% other) — calculation must not produce NaN
    - All news is neutral — target allocation ≈ current allocation → rule 2 catches this
    - Proposed allocation contains non-whitelisted tokens → rule 1 catches this
  - All rule violations should produce a descriptive reason string for logging

  **Must NOT do**:
  - Don't make thresholds configurable via API or dashboard (hardcoded from constants.ts)
  - Don't add retry logic or trade modification strategies (just validate/reject)
  - Don't implement circuit breaker reset logic (simple daily count is enough for hackathon)
  - Don't modify the proposed allocation (validator only approves or rejects, never adjusts)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Safety-critical logic with 6 validation rules, mathematical calculations, edge cases involving division by zero and percentage comparisons
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5-10, 12 — depends only on types and constants)
  - **Parallel Group**: Wave 2-3 (can start once types and constants exist)
  - **Blocks**: Task 13 (engine calls `validateRebalance`)
  - **Blocked By**: Tasks 2, 3 (types and constants)

  **References**:

  **API/Type References**:
  - `src/types/index.ts` — PortfolioState, LLMDecision, ValidationResult interfaces
  - `src/config/constants.ts` — SAFETY_CONFIG with all 6 constraint values

  **Pattern References**:
  - `context.md` lines 82-94 — Exact SAFETY_CONFIG values and description of each constraint
  - `context.md` lines 66-78 — VALIDATE step description ("Check token whitelist", "Verify rebalance delta > MIN_THRESHOLD", etc.)

  **WHY Each Reference Matters**:
  - SAFETY_CONFIG values must be enforced EXACTLY as specified in context.md — these are the safety constraints judges will verify
  - ValidationResult defines the return format that engine.ts expects for the VALIDATE step

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Validator accepts valid rebalance within all limits
    Tool: Bash (npx tsx)
    Preconditions: Validator implemented
    Steps:
      1. Current allocation: WETH 50%, USDC 50%, portfolio value $10,000
      2. Proposed target: WETH 65%, USDC 35% (delta = 15%, trade = $1,500 → under 10% max)
      3. dailyTradeCount = 0
      4. lastTradeTime = 0 (no previous trade)
      5. Call `validateRebalance(current, proposed, 0, 0)`
      6. Verify result.valid === true
    Expected Result: ValidationResult with valid=true
    Failure Indicators: valid=false for a legitimate rebalance within all limits
    Evidence: .sisyphus/evidence/task-11-valid-rebalance.txt

  Scenario: Validator rejects trade exceeding MAX_SINGLE_TRADE_PERCENT (10%)
    Tool: Bash (npx tsx)
    Steps:
      1. Current allocation: WETH 50%, USDC 50%, portfolio value $10,000
      2. Proposed target: WETH 30%, USDC 70% (delta = 20% of portfolio → exceeds 10% max single trade)
      3. dailyTradeCount = 0
      4. Call `validateRebalance(current, proposed, 0, 0)`
      5. Verify result.valid === false
      6. Verify result.reason contains "MAX_SINGLE_TRADE" or "10%"
    Expected Result: Rejected with specific reason about max trade size
    Failure Indicators: Trade >10% of portfolio passes validation
    Evidence: .sisyphus/evidence/task-11-reject-oversize.txt

  Scenario: Validator rejects when rebalance threshold not met (delta < 2%)
    Tool: Bash (npx tsx)
    Steps:
      1. Current allocation: WETH 50.5%, USDC 49.5%
      2. Proposed target: WETH 51%, USDC 49% (delta = 0.5% < 2%)
      3. Call `validateRebalance(current, proposed, 0, 0)`
      4. Verify result.valid === false
      5. Verify result.reason contains "MIN_REBALANCE_THRESHOLD" or "2%"
    Expected Result: Rejected with reason about minimum threshold
    Failure Indicators: Tiny rebalance (< 2%) passes validation
    Evidence: .sisyphus/evidence/task-11-reject-small.txt

  Scenario: Circuit breaker rejects when MAX_DAILY_TRADES (6) reached
    Tool: Bash (npx tsx)
    Steps:
      1. dailyTradeCount = 6 (already at maximum)
      2. Call `validateRebalance(current, proposed, 6, 0)`
      3. Verify result.valid === false
      4. Verify result.reason contains "MAX_DAILY_TRADES" or "circuit breaker"
    Expected Result: Rejected due to daily trade limit reached
    Failure Indicators: 7th trade passes validation
    Evidence: .sisyphus/evidence/task-11-circuit-breaker.txt

  Scenario: Cooldown period rejects trades within 15 minutes
    Tool: Bash (npx tsx)
    Steps:
      1. lastTradeTime = Date.now() - 5 * 60 * 1000 (5 minutes ago)
      2. Call `validateRebalance(current, proposed, 0, lastTradeTime)`
      3. Verify result.valid === false
      4. Verify result.reason contains "COOLDOWN" or "15 minutes"
    Expected Result: Rejected due to cooldown
    Failure Indicators: Trade within cooldown passes validation
    Evidence: .sisyphus/evidence/task-11-cooldown.txt

  Scenario: Validator rejects non-whitelisted tokens
    Tool: Bash (npx tsx)
    Steps:
      1. Proposed target includes token "DOGE" or "SOL"
      2. Call `validateRebalance(current, proposed, 0, 0)`
      3. Verify result.valid === false
      4. Verify result.reason contains "whitelist" or "not allowed"
    Expected Result: Rejected due to non-whitelisted token
    Failure Indicators: Non-WETH/USDC token passes whitelist check
    Evidence: .sisyphus/evidence/task-11-whitelist.txt

  Scenario: Validator handles portfolio that is 100% one token (edge case)
    Tool: Bash (npx tsx)
    Steps:
      1. Current allocation: WETH 100%, USDC 0%
      2. Proposed target: WETH 70%, USDC 30%
      3. Call `validateRebalance(current, proposed, 0, 0)`
      4. Verify: no NaN results, no crash on 0% allocation
      5. Verify: valid result with no division-by-zero errors
    Expected Result: Valid calculation, no crashes or NaN
    Failure Indicators: NaN, Infinity, or crash on 0% allocation
    Evidence: .sisyphus/evidence/task-11-edge-case.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(logic): implement safety validator with 6 constraints`
  - Files: `src/logic/validator.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 12. Portfolio Calculator (logic/portfolio.ts)

  **What to do**:
  - Create `/src/logic/portfolio.ts`
  - Implement `calculateRebalance(current: PortfolioState, target: LLMDecision): TradeOrder[]` — calculates what trades need to happen to move from current allocation to target
  - Calculate the delta between current and target allocation percentages
  - Determine which tokens to sell and which to buy
  - Calculate trade amounts based on total portfolio value
  - Return array of `TradeOrder` objects (might be 1 or 2 trades depending on rebalance)
  - Handle edge cases: all-neutral sentiment (no rebalance needed → empty array), 100% single-token portfolio

  **Must NOT do**:
  - Don't execute trades (that's engine.ts)
  - Don't apply safety constraints (that's validator.ts)
  - Don't add PnL calculations or historical analytics

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mathematical calculations, single file, straightforward logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 11)
  - **Parallel Group**: Wave 3 (with Task 11)
  - **Blocks**: Task 13 (engine)
  - **Blocked By**: Tasks 2, 3 (types and constants)

  **References**:

  **API/Type References**:
  - `src/types/index.ts` — PortfolioState, LLMDecision, TradeOrder interfaces

  **WHY Each Reference Matters**:
  - TradeOrder defines the output shape that engine passes to validator and keeper

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Calculate rebalance from 50/50 to 70/30 WETH/USDC
    Tool: Bash (npx tsx)
    Steps:
      1. Current: WETH 50%, USDC 50%, total $10,000
      2. Target: WETH 70%, USDC 30%
      3. Call calculateRebalance(current, target)
      4. Verify: returns 1 trade (sell USDC, buy WETH)
      5. Verify: trade amount ≈ $2,000 (20% of $10,000)
    Expected Result: Single TradeOrder: sell USDC → buy WETH, ~$2,000
    Failure Indicators: Wrong direction, wrong amount, multiple unnecessary trades
    Evidence: .sisyphus/evidence/task-12-rebalance.txt

  Scenario: Returns empty array when target matches current
    Tool: Bash (npx tsx)
    Steps:
      1. Current: WETH 50%, USDC 50%
      2. Target: WETH 50%, USDC 50%
      3. Call calculateRebalance(current, target)
      4. Verify: returns empty array []
    Expected Result: Empty array (no rebalance needed)
    Failure Indicators: Non-empty array for matching allocations
    Evidence: .sisyphus/evidence/task-12-no-rebalance.txt

  Scenario: Handles 100% single-token portfolio
    Tool: Bash (npx tsx)
    Steps:
      1. Current: WETH 100%, USDC 0%
      2. Target: WETH 70%, USDC 30%
      3. Call calculateRebalance(current, target)
      4. Verify: returns trade to sell WETH → USDC
      5. Verify: no NaN or division-by-zero errors
    Expected Result: Valid TradeOrder, no crashes on 0% allocation
    Failure Indicators: NaN, crash, or incorrect trade direction
    Evidence: .sisyphus/evidence/task-12-edge-case.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(logic): implement portfolio rebalance calculator`
  - Files: `src/logic/portfolio.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 13. Engine — Orchestration Loop (logic/engine.ts)

  **What to do**:
  - Create `/src/logic/engine.ts`
  - Implement `SentibalancerEngine` class that orchestrates the 6-step agent cycle:
    1. **SENSE**: Call `newsService.fetchNews()` + `balanceService.getWalletBalances()`
    2. **REMEMBER**: Call `ogService.loadState()`
    3. **REASON**: Call `llmService.analyzeSentiment(news, state, prices)`
    4. **VALIDATE**: Call `validator.validateRebalance(current, proposed, dailyTradeCount)`
    5. **EXECUTE**: If valid, call `uniswapService.getQuote()` → `uniswapService.getSwapCalldata()` → `keeperService.submitTransaction()`
    6. **LOG**: Call `ogService.saveState()` with new cycle state
  - Implement **isRunning mutex flag**: If previous cycle still running, skip and log "cycle skipped"
  - Implement **cooldown check**: Don't execute if `COOLDOWN_MINUTES` hasn't elapsed since last trade
  - Implement **daily trade counter**: Reset at midnight (or first cycle after midnight)
  - Handle errors with **fail-fast pattern**: try/catch per service call, log error, skip step, continue cycle
  - When `DRY_RUN=true`, log the intended action in EXECUTE step but don't call `keeperService`
  - Export `start()` and `stop()` methods for the entry point to call
  - Emit cycle events for the API server to consume (via simple EventEmitter pattern)

  **Must NOT do**:
  - Don't implement retry logic (fail fast, log, continue)
  - Don't implement WebSocket or SSE (engine emits events, API polls state)
  - Don't implement circuit breaker reset beyond the simple daily count
  - Don't make engine aware of Express/server concerns

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core orchestration logic, 6-step cycle, mutex, error handling, EventEmitter — complexity high
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on all services and logic
  - **Parallel Group**: Sequential (after Wave 2 + Tasks 11, 12)
  - **Blocks**: Tasks 15, 19
  - **Blocked By**: Tasks 5-12 (all services and logic)

  **References**:

  **API/Type References**:
  - All service interfaces from Tasks 5-10
  - `src/types/index.ts` — AgentState, CycleStep, CycleResult, TradeOrder
  - `src/config/constants.ts` — SAFETY_CONFIG, POLLING_INTERVAL_MS, DRY_RUN
  - `src/logic/validator.ts` — ValidationResult
  - `src/logic/portfolio.ts` — calculateRebalance

  **Pattern References**:
  - `context.md` lines 46-78 — Agent cycle flow diagram with all 6 steps

  **WHY Each Reference Matters**:
  - Engine is the central orchestrator — it calls every service in the correct order
  - The 6-step cycle is the core logic flow defined in context.md

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full mock cycle completes all 6 steps
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true, DRY_RUN=true
    Steps:
      1. `const engine = new SentibalancerEngine(config); await engine.runOnce();`
      2. Verify console output shows all 6 steps: SENSE, REMEMBER, REASON, VALIDATE, EXECUTE, LOG
      3. Verify no errors or crashes
      4. Verify state is saved (mock 0G service writes to local file)
    Expected Result: All 6 steps logged in order, cycle completes, state persisted
    Failure Indicators: Missing step, crash, state not saved
    Evidence: .sisyphus/evidence/task-13-full-cycle.txt

  Scenario: Engine skips cycle when isRunning mutex is active
    Tool: Bash (npx tsx)
    Steps:
      1. Start a cycle that takes 5 seconds (mock delay)
      2. Immediately call `runOnce()` again
      3. Verify: second call logs "cycle skipped" and returns immediately
    Expected Result: Second call skipped, first cycle completes normally
    Failure Indicators: Concurrent execution, race condition
    Evidence: .sisyphus/evidence/task-13-mutex.txt

  Scenario: Engine handles service failure gracefully (fail-fast)
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true, mock news service throws error
    Steps:
      1. Configure mock news service to throw error
      2. Run `engine.runOnce()`
      3. Verify: error logged, cycle continues past SENSE step with partial data
      4. Verify: no crash, engine reports partial cycle result
    Expected Result: Error logged, cycle completes with partial data, no crash
    Failure Indicators: Unhandled exception, engine crash
    Evidence: .sisyphus/evidence/task-13-failfast.txt

  Scenario: DRY_RUN=true prevents on-chain execution
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true, DRY_RUN=true
    Steps:
      1. Run engine with DRY_RUN=true
      2. Verify: EXECUTE step logs "DRY RUN: would execute trade" but doesn't call keeperService
      3. Verify: LOG step still saves state
    Expected Result: No transaction submission, state saved with DRY_RUN flag
    Failure Indicators: keeperService.submitTransaction called when DRY_RUN=true
    Evidence: .sisyphus/evidence/task-13-dryrun.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(logic): implement agent engine with 6-step cycle and mutex`
  - Files: `src/logic/engine.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 14. API Server + Routes (api/server.ts, api/routes.ts)

  **What to do**:
  - Create `/src/api/server.ts` — Express HTTP server setup with CORS, JSON parsing, error handler
  - Create `/src/api/routes.ts` — REST API endpoints:
    - `GET /api/status` — Current agent status (running/stopped, current cycle step, last trade timestamp)
    - `GET /api/portfolio` — Current portfolio state (balances, allocation, total value)
    - `GET /api/trades` — Last 20 trades with reasoning (from 0G state or in-memory)
    - `GET /api/state` — Full agent state (last decision, portfolio history, reasoning)
    - `POST /api/trigger` — Manually trigger a cycle (for demo/development)
  - Server listens on `PORT` from env (default 3000)
  - Connect to engine EventEmitter to read current state
  - Use **HTTP polling** (dashboard polls every 5-10 seconds) — no WebSocket, no SSE

  **Must NOT do**:
  - Don't add start/stop/restart controls (that's CLI-only via signal handling)
  - Don't add authentication or user management
  - Don't implement WebSocket or SSE
  - Don't add configuration editing endpoints (env vars only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Express server, REST API design, CORS, error handling — moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11-13)
  - **Parallel Group**: Wave 3 (with Tasks 11-13)
  - **Blocks**: Task 16 (dashboard)
  - **Blocked By**: Tasks 2, 3 (types and constants)

  **References**:

  **API/Type References**:
  - `src/types/index.ts` — AgentState, PortfolioState, CycleStep, TradeOrder

  **External References**:
  - Express.js — minimal server setup with cors middleware

  **WHY Each Reference Matters**:
  - Types define the JSON shapes the API returns
  - Express is the simplest HTTP server for this use case

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: API server starts and responds to status endpoint
    Tool: Bash (curl)
    Preconditions: Server running on port 3000
    Steps:
      1. `npx tsx src/index.ts &` (start server in background)
      2. `sleep 2 && curl -s http://localhost:3000/api/status | jq .`
      3. Verify JSON response has `status`, `currentStep`, `lastTradeTimestamp` fields
      4. Kill background server
    Expected Result: JSON with agent status fields
    Failure Indicators: No response, 500 error, missing fields
    Evidence: .sisyphus/evidence/task-14-api-status.txt

  Scenario: API serves portfolio data
    Tool: Bash (curl)
    Preconditions: Server running, agent has run at least one cycle
    Steps:
      1. `curl -s http://localhost:3000/api/portfolio | jq .`
      2. Verify JSON has `balances`, `current_allocation`, `total_value_usd`
    Expected Result: Valid portfolio JSON
    Failure Indicators: 404, empty response
    Evidence: .sisyphus/evidence/task-14-api-portfolio.txt

  Scenario: POST /api/trigger manually triggers a cycle
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. `curl -X POST -s http://localhost:3000/api/trigger`
      2. Wait 5 seconds
      3. `curl -s http://localhost:3000/api/status | jq .`
      4. Verify status shows cycle completed
    Expected Result: Cycle triggered, status updated
    Failure Indicators: 500 error, cycle not triggered
    Evidence: .sisyphus/evidence/task-14-trigger.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(api): implement Express HTTP server and REST endpoints`
  - Files: `src/api/server.ts, src/api/routes.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 15. Entry Point (index.ts)

  **What to do**:
  - Create `/src/index.ts` — main entry point
  - Initialize dotenv config
  - Initialize all services with config from `getConfig()`
  - Create `SentibalancerEngine` instance with all services
  - Create Express API server, passing engine reference
  - Start API server on PORT (default 3000)
  - Start engine polling loop with `POLLING_INTERVAL_MS` (default 300000 / 5 min)
  - Handle graceful shutdown: SIGINT/SIGTERM → `engine.stop()` → `server.close()`
  - Log startup configuration (mock mode, dry run, network, polling interval)
  - Export `main()` function

  **Must NOT do**:
  - Don't add CLI argument parsing (env vars only)
  - Don't start dashboard (that's a separate `npm run dev` command)
  - Don't add process management (PM2, systemd)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Wiring existing components, straightforward entry point
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on engine and API server
  - **Parallel Group**: Sequential (after Tasks 13, 14)
  - **Blocks**: Task 19 (demo)
  - **Blocked By**: Tasks 13, 14 (engine and API server)

  **References**:

  **API/Type References**:
  - `src/logic/engine.ts` — SentibalancerEngine class, start(), stop()
  - `src/api/server.ts` — createServer() function
  - `src/config/constants.ts` — getConfig(), POLLING_INTERVAL_MS, PORT

  **WHY Each Reference Matters**:
  - Engine and API server are the two main components to wire together
  - getConfig() provides all configuration

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Agent starts and logs configuration
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true, DRY_RUN=true
    Steps:
      1. `USE_MOCK_SERVICES=true DRY_RUN=true npx tsx src/index.ts &`
      2. Wait 3 seconds
      3. Verify: console log shows startup message with "mock mode", "dry run", "network" info
      4. Verify: server listening on port 3000
      5. `curl -s http://localhost:3000/api/status | jq .status` — expect "idle" or "running"
      6. Kill background process
    Expected Result: Server running, status endpoint responds, startup config logged
    Failure Indicators: Crash on startup, no server listening, missing config log
    Evidence: .sisyphus/evidence/task-15-startup.txt

  Scenario: Graceful shutdown on SIGINT
    Tool: Bash
    Preconditions: Agent running in background
    Steps:
      1. Start agent in background
      2. Send SIGINT (`kill -INT <pid>`)
      3. Verify: engine stops cleanly (log "shutting down")
      4. Verify: server closes
    Expected Result: Clean shutdown with log message
    Failure Indicators: Unhandled promise rejection, hanging process
    Evidence: .sisyphus/evidence/task-15-shutdown.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat: wire up entry point with engine and API server`
  - Files: `src/index.ts`
  - Pre-commit: `npx tsc --noEmit`

- Pre-commit: `npx tsc --noEmit`

- [ ] 16. Dashboard Scaffolding (React + Vite + Tailwind + Recharts)

  **What to do**:
  - Create `/dashboard/` directory with a Vite + React + TypeScript project
  - Install dependencies: `react`, `react-dom`, `recharts`, `tailwindcss`, `@tailwindcss/vite`
  - Configure `vite.config.ts` with proxy to `http://localhost:3000` (API server) for `/api/*` routes
  - Configure Tailwind with a dark theme suitable for crypto dashboards
  - Create `/dashboard/src/App.tsx` with layout: header (agent name + status), main content area (2 charts + trade list), refresh indicator
  - Create `/dashboard/src/hooks/useAgentData.ts` — custom hook that polls `/api/status` and `/api/portfolio` every 5 seconds
  - Create `/dashboard/src/types.ts` — TypeScript interfaces matching the API response shapes
  - Verify `npm run dev` starts the dashboard on port 5173

  **Must NOT do**:
  - Don't add WebSocket or SSE for real-time updates (HTTP polling only)
  - Don't add authentication or user management
  - Don't add start/stop/restart controls (agent controlled via CLI)
  - Don't add configuration editing UI
  - Don't add responsive/mobile layout (desktop localhost only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend scaffolding, Tailwind config, Vite setup, React structure
  - **Skills**: [`/frontend-ui-ux`]
    - `frontend-ui-ux`: Frontend project setup and clean UI design

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on API server existing
  - **Parallel Group**: Wave 4 (with Tasks 17, 18 sequential after this)
  - **Blocks**: Tasks 17, 18
  - **Blocked By**: Task 14 (API server)

  **References**:

  **API/Type References**:
  - `src/types/index.ts` — AgentState, PortfolioState, CycleStep, TradeOrder
  - `src/api/routes.ts` — API endpoints: /api/status, /api/portfolio, /api/trades, /api/trigger

  **External References**:
  - Vite + React setup: `npm create vite@latest dashboard -- --template react-ts`
  - Tailwind CSS v4 with Vite: `@tailwindcss/vite` plugin

  **WHY Each Reference Matters**:
  - API response shapes define the TypeScript types in the dashboard
  - Vite proxy config ensures dashboard can call the same-origin API

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dashboard dev server starts and renders
    Tool: Playwright
    Preconditions: API server running on port 3000
    Steps:
      1. `cd dashboard && npm install && npm run dev`
      2. Navigate to http://localhost:5173
      3. Verify: page loads without React errors
      4. Verify: header shows "SENTI-BALANCER" text
      5. Take screenshot
    Expected Result: Dashboard loads with header, no console errors
    Failure Indicators: React error boundary, blank page, Vite build errors
    Evidence: .sisyphus/evidence/task-16-dashboard-start.png

  Scenario: Vite proxy forwards /api/* to backend
    Tool: Bash (curl)
    Preconditions: Dashboard dev server running, API server running
    Steps:
      1. `curl -s http://localhost:5173/api/status | jq .`
      2. Verify: JSON response from backend (not 404)
    Expected Result: /api/status proxied to backend, returns JSON
    Failure Indicators: 404, Vite HTML instead of JSON
    Evidence: .sisyphus/evidence/task-16-proxy.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(dashboard): scaffold React + Vite + Tailwind + Recharts project`
  - Files: `dashboard/package.json, dashboard/vite.config.ts, dashboard/tailwind.config.js, dashboard/src/App.tsx, dashboard/src/hooks/useAgentData.ts, dashboard/src/types.ts, dashboard/index.html`
  - Pre-commit: `cd dashboard && npm run build`

- [ ] 17. Dashboard — AllocationChart + AgentStatus Components

  **What to do**:
  - Create `/dashboard/src/components/AllocationChart.tsx`
    - Bar chart showing current vs target allocation (WETH%, USDC%) side by side
    - Use Recharts `BarChart` with two bars per token (current in blue, target in green)
    - Poll data from `/api/portfolio` via `useAgentData` hook
  - Create `/dashboard/src/components/AgentStatus.tsx`
    - Status indicator: "Running" (green), "Idle" (yellow), "Error" (red)
    - Current cycle step display (SENSE, REMEMBER, REASON, VALIDATE, EXECUTE, LOG)
    - Last trade timestamp
    - Portfolio total value in USD
  - Style both with Tailwind CSS, dark theme
  - Wire into App.tsx layout

  **Must NOT do**:
  - Don't add animations (keep it simple for hackathon)
  - Don't add tooltips with drill-down data
  - Don't add more than 2 charts total (this + trade timeline in Task 18)
  - Don't add start/stop controls

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React component design, Recharts integration, Tailwind styling
  - **Skills**: [`/frontend-ui-ux`]
    - `frontend-ui-ux`: Component design and visual polish

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Task 16 scaffold
  - **Parallel Group**: Wave 4 (sequential after Task 16)
  - **Blocks**: None (can run parallel with Task 18 since they're independent components)
  - **Blocked By**: Task 16 (dashboard scaffold)

  **References**:

  **API/Type References**:
  - `src/api/routes.ts` — GET /api/portfolio, GET /api/status
  - `dashboard/src/types.ts` — API response types
  - `dashboard/src/hooks/useAgentData.ts` — polling hook

  **External References**:
  - Recharts BarChart: https://recharts.org/en-US/api/BarChart

  **WHY Each Reference Matters**:
  - API endpoints define what data the charts display
  - Recharts API determines chart component structure

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Allocation chart renders with mock data
    Tool: Playwright
    Preconditions: Dashboard running, API server returning mock portfolio data
    Steps:
      1. Navigate to http://localhost:5173
      2. Verify: AllocationChart component visible
      3. Verify: Two groups of bars (WETH, USDC) showing current vs target
      4. Verify: Y-axis shows percentage (0-100%)
      5. Take screenshot
    Expected Result: Bar chart with WETH/USDC allocation bars visible
    Failure Indicators: Chart not rendering, data not loading
    Evidence: .sisyphus/evidence/task-17-allocation-chart.png

  Scenario: Agent status displays correctly
    Tool: Playwright
    Preconditions: Dashboard running, agent in "idle" state
    Steps:
      1. Navigate to http://localhost:5173
      2. Verify: AgentStatus component visible
      3. Verify: Status shows "Idle" or "Running"
      4. Verify: Current portfolio value displayed
      5. Take screenshot
    Expected Result: Status indicator visible with correct state
    Failure Indicators: Status missing, wrong state display
    Evidence: .sisyphus/evidence/task-17-agent-status.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(dashboard): add allocation chart and agent status components`
  - Files: `dashboard/src/components/AllocationChart.tsx, dashboard/src/components/AgentStatus.tsx, dashboard/src/App.tsx`
  - Pre-commit: `cd dashboard && npm run build`

- [ ] 18. Dashboard — TradeHistory Component

  **What to do**:
  - Create `/dashboard/src/components/TradeHistory.tsx`
    - Table or timeline showing last 5 trades with: timestamp, direction (buy/sell), token pair, amount, reasoning (truncated to 50 chars)
    - Recharts timeline/area chart showing allocation changes over time (simple: timestamp on X, WETH% on Y)
    - Poll data from `/api/trades` via `useAgentData` hook
  - Style with Tailwind CSS, dark theme
  - Wire into App.tsx layout

  **Must NOT do**:
  - Don't add more than 50 data points to the timeline chart
  - Don't add pagination (show last 5 trades only)
  - Don't add trade detail modals
  - Don't add export or CSV functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React table/timeline component, Recharts integration
  - **Skills**: [`/frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 17 — independent components)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Task 16 (dashboard scaffold)

  **References**:

  **API/Type References**:
  - `src/api/routes.ts` — GET /api/trades
  - `dashboard/src/types.ts` — Trade response types
  - `dashboard/src/hooks/useAgentData.ts` — polling hook

  **External References**:
  - Recharts AreaChart: https://recharts.org/en-US/api/AreaChart

  **WHY Each Reference Matters**:
  - /api/trades provides the trade history data
  - Recharts AreaChart shows allocation changes over time

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Trade history table renders with data
    Tool: Playwright
    Preconditions: Dashboard running, agent has completed at least 1 cycle
    Steps:
      1. Navigate to http://localhost:5173
      2. Verify: TradeHistory component visible
      3. Verify: At least 1 trade row displayed
      4. Verify: Each row shows timestamp, direction, amount, reasoning
      5. Take screenshot
    Expected Result: Trade history table with rows
    Failure Indicators: Empty table, missing columns
    Evidence: .sisyphus/evidence/task-18-trade-history.png

  Scenario: Timeline chart shows allocation over time
    Tool: Playwright
    Preconditions: Multiple cycles completed for time-series data
    Steps:
      1. Navigate to http://localhost:5173
      2. Verify: Timeline chart visible
      3. Verify: X-axis shows timestamps, Y-axis shows WETH percentage
      4. Take screenshot
    Expected Result: Area chart with allocation history line
    Failure Indicators: Chart missing, no data points
    Evidence: .sisyphus/evidence/task-18-timeline.png

  Scenario: Empty state when no trades yet
    Tool: Playwright
    Preconditions: Agent hasn't completed any cycle yet
    Steps:
      1. Navigate to http://localhost:5173
      2. Verify: "No trades yet" or similar empty state message
      3. Verify: No broken chart (shows empty axis or "no data")
    Expected Result: Graceful empty state, no errors
    Failure Indicators: React error, broken chart
    Evidence: .sisyphus/evidence/task-18-empty-state.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(dashboard): add trade history and timeline components`
  - Files: `dashboard/src/components/TradeHistory.tsx, dashboard/src/App.tsx`
  - Pre-commit: `cd dashboard && npm run build`

- [ ] 19. Demo Script (scripts/demo.ts)

  **What to do**:
  - Create `/scripts/demo.ts` — interactive demo script for hackathon judges
  - Implement two scenarios runnable via CLI flags:
    - `--scenario=bullish` — Seeds "ETH ETF approved" news → agent moves to 70% WETH
    - `--scenario=bearish` — Seeds "Major hack reported" news → agent moves to 70% USDC
  - Script flow:
    1. Print banner: "SENTI-BALANCER Demo - Hackathon 202X"
    2. Initialize all services with mock mode
    3. Load or create initial state (50/50 WETH/USDC allocation)
    4. Run one full agent cycle with the selected scenario
    5. Print each step with colored console output (SENSE → REMEMBER → REASON → VALIDATE → EXECUTE → LOG)
    6. Print final state: sentiment, reasoning, target allocation
    7. Print "Demo complete!" message
  - Use `chalk` or similar for colored output
  - Include `--dry-run` flag (default true) to prevent actual on-chain execution
  - Include `--verbose` flag for detailed step logging

  **Must NOT do**:
  - Don't implement interactive REPL (simple sequential script)
  - Don't add progress bars (simple console.log is fine)
  - Don't make it too complex — judges need quick, clear results

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Wiring all services together for demo, colored output, CLI flags
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 16-18 — it's independent of dashboard)
  - **Parallel Group**: Wave 4
  - **Blocks**: None (demo can run independently)
  - **Blocked By**: Task 13 (engine)

  **References**:

  **API/Type References**:
  - `src/logic/engine.ts` — SentibalancerEngine class
  - `src/config/constants.ts` — getConfig(), USE_MOCK_SERVICES, DRY_RUN

  **Pattern References**:
  - `context.md` lines 133-156 — Demo strategy and mock scenarios

  **WHY Each Reference Matters**:
  - Engine is the core orchestrator the demo needs to invoke
  - Context.md defines the exact bullish/bearish scenarios for judges

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Bullish demo runs end-to-end
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true, DRY_RUN=true
    Steps:
      1. `USE_MOCK_SERVICES=true DRY_RUN=true npx tsx scripts/demo.ts --scenario=bullish`
      2. Verify: Banner printed
      3. Verify: All 6 steps logged (SENSE, REMEMBER, REASON, VALIDATE, EXECUTE, LOG)
      4. Verify: Sentiment shows "bullish"
      5. Verify: Target allocation shifts toward WETH (≥70%)
      6. Verify: "Demo complete!" message at end
      7. Verify: Total runtime < 30 seconds
    Expected Result: Full cycle completes, bullish sentiment, WETH-weighted allocation
    Failure Indicators: Missing steps, crash, wrong sentiment, timeout > 30s
    Evidence: .sisyphus/evidence/task-19-bullish-demo.txt

  Scenario: Bearish demo runs end-to-end
    Tool: Bash (npx tsx)
    Preconditions: USE_MOCK_SERVICES=true, DRY_RUN=true
    Steps:
      1. `USE_MOCK_SERVICES=true DRY_RUN=true npx tsx scripts/demo.ts --scenario=bearish`
      2. Verify: Sentiment shows "bearish"
      3. Verify: Target allocation shifts toward USDC (≥70%)
      4. Verify: "Demo complete!" message at end
    Expected Result: Bearish sentiment, USDC-weighted allocation
    Failure Indicators: Wrong sentiment, crash
    Evidence: .sisyphus/evidence/task-19-bearish-demo.txt

  Scenario: Demo completes in under 30 seconds
    Tool: Bash
    Preconditions: USE_MOCK_SERVICES=true, DRY_RUN=true
    Steps:
      1. `time USE_MOCK_SERVICES=true DRY_RUN=true npx tsx scripts/demo.ts --scenario=bullish`
      2. Verify: Total time < 30 seconds
    Expected Result: Fast demo cycle suitable for hackathon judges
    Failure Indicators: Timeout > 30s
    Evidence: .sisyphus/evidence/task-19-timing.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(scripts): add hackathon demo script with bullish/bearish scenarios`
  - Files: `scripts/demo.ts`
  - Pre-commit: `npx tsc --noEmit`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback → fix → re-run → present again → wait for okay.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + linter check. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod (not logger), commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT Have" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat: scaffold project with types, config, and research tasks` — package.json, tsconfig, types, constants, .env.example
- **Wave 2**: `feat: implement all external service integrations` — balance, 0g, news, llm, uniswap, keeper services
- **Wave 3**: `feat: core logic, api, and entry point` — validator, portfolio, engine, api server, index
- **Wave 4**: `feat: dashboard and demo script` — dashboard components, demo scenarios

---

## Success Criteria

### Verification Commands
```bash
# Full mock cycle
USE_MOCK_SERVICES=true npx tsx scripts/demo.ts  # Expect: all 6 steps logged, cycle completes in <30s

# API server responds
npx tsx src/index.ts &
sleep 3
curl http://localhost:3000/api/status  # Expect: JSON with agent state

# Dashboard renders
cd dashboard && npm run dev &
sleep 5
curl http://localhost:5173  # Expect: HTML response with React app

# Validator rejects oversized trade
USE_MOCK_SERVICES=true MOCK_SCENARIO=oversized_trade npx tsx scripts/demo.ts  # Expect: "REJECTED" in logs

# DRY_RUN prevents on-chain execution
USE_MOCK_SERVICES=true DRY_RUN=true npx tsx scripts/demo.ts  # Expect: logs intended action, no tx hash
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Demo script runs end-to-end with mock services
- [ ] Dashboard loads and displays allocation chart
- [ ] API serves agent state as JSON
- [ ] Validator rejects trades exceeding safety limits
- [ ] DRY_RUN mode prevents actual on-chain execution