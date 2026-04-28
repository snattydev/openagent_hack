# Learnings — SENTI-BALANCER

## Conventions & Patterns
- TypeScript strict mode
- npm package manager
- USE_MOCK_SERVICES env toggle for mock/real switching
- DRY_RUN=true for safe testing
- Fail-fast error handling (no retry logic)
- Flat JSON in 0G Storage (no versioning)
- OpenAI-compatible LLM adapter (single adapter pattern)
- HTTP polling for dashboard (no WebSocket/SSE)

## Gotchas
- USDC address on Base Sepolia needs verification
- KeeperHub SDK documentation incomplete - use direct RPC fallback
- 0G Storage SDK has two npm packages (@0gfoundation vs @0glabs)
- Uniswap Trading API requires x-api-key header for authentication
