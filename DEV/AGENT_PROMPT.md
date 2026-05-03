# CapyMate Harness — Agent Installation Guide

**For AI agents only.** If you are a human, read README.md instead.

## Your Mission

Install the CapyMate autonomous crypto portfolio agent into your workspace. After setup, it runs fully autonomously without human interaction.

## Prerequisites

- Node.js 20+ installed
- Your user has a wallet with testnet ETH on Base Sepolia (optional)

## Steps

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/capymate-harness.git
cd capymate-harness
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Interactive Setup (ONE TIME ONLY)

```bash
node setup.js
```

**CRITICAL:** This is the ONLY step that requires human interaction. Relay each 
question to the user, collect their answers, and the setup script will save everything 
to `capymate.config.json`. After this, the agent runs autonomously.

The setup will ask for:
1. **LLM provider & API key** — for sentiment analysis. If no key, select "Mock mode".
2. **Wallet private key** — for live trading. If omitted, agent runs in simulation mode.
3. **0G contract address** — default is pre-filled. Press Enter to accept.
4. **CryptoPanic API key** — optional. Mock news used if empty.
5. **Safety settings** — max daily trades, cooldown, etc.

### 4. Start the Agent (FULLY AUTONOMOUS)

```bash
npm start
```

The agent now runs continuously and autonomously:
- Fetches news every 5 minutes (configurable)
- Analyzes sentiment via LLM automatically
- Validates against safety rules
- Executes trades automatically (if wallet key provided)
- Logs state to 0G Storage
- Repeats forever until stopped

**No further human interaction needed.** The user can check status via API or logs.

### 5. API Access (Optional — for monitoring)

The agent exposes an API on `http://localhost:3000`:

```bash
curl http://localhost:3000/api/health      # Check if running
curl http://localhost:3000/api/state       # View full agent state
curl -X POST http://localhost:3000/api/trigger  # Force one cycle now
```

## Troubleshooting

- If `npm install` fails: Ensure Node.js ≥ 20 (`node --version`)
- If setup hangs: Check that `setup.js` has execute permissions (`chmod +x setup.js`)
- If trades fail: Verify wallet has testnet ETH on Base Sepolia
- If 0G storage fails: Falls back to `data/agent-state.json` automatically
- To change config later: Edit `capymate.config.json` and restart

## Important Notes

- **Never commit `capymate.config.json`** — it contains secrets.
- **Fully autonomous after setup** — the agent does not ask for input per cycle.
- **Mock mode is safe** — no real trades, no API calls, runs entirely offline.
- **Simulation mode** — if no private key, the agent logs what it *would* trade.
- **Open source** — users can deploy their own 0G contract and override the address.
