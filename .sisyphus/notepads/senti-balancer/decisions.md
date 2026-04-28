# Architectural Decisions — SENTI-BALANCER

## Session: 2026-04-28

### LLM Strategy
- Single OpenAI-compatible adapter
- Anthropic via proxy, Groq, Together, local models all supported through this interface
- Zod validation on LLM output
- Fallback to last-known allocation on parse failure

### Storage Strategy
- 0G Storage KV approach for agent memory
- Single flat JSON object under one key
- No schema versioning or migration
- Local JSON file fallback (mock mode)

### DEX Strategy
- Uniswap Trading API (REST) for quotes and calldata
- Server-side, no RPC dependency needed
- Base Sepolia SwapRouter02 for testnet execution

### Execution Strategy
- KeeperHub SDK primary path (if available)
- Direct RPC eth_sendRawTransaction fallback via ethers.js
- DRY_RUN mode prevents actual on-chain broadcast

### Dashboard Strategy
- React + Vite + Tailwind + Recharts
- Read-only display (no controls)
- HTTP polling at 5s intervals
- Vite proxy for /api/* routes to backend

### Safety Strategy
- 6 hard constraints in validator.ts
- Hardcoded thresholds (not configurable via dashboard)
- isRunning mutex in engine for cycle concurrency
- Circuit breaker: max 6 daily trades + 15min cooldown
