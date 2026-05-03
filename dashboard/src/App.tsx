import { useEffect, useState } from 'react';
import axios from 'axios';
import StatusCard from './components/StatusCard';
import AllocationChart from './components/AllocationChart';
import TradeHistory from './components/TradeHistory';

const API_BASE = 'http://localhost:3000/api';

type AgentStatus = {
  isRunning: boolean;
  cycleCount: number;
  dailyTradeCount: number;
};

type PortfolioSnapshot = {
  total_value_usd: number;
  current_allocation: { WETH: number; USDC: number };
  target_allocation: { WETH: number; USDC: number };
  timestamp: number;
  balances: Array<{ token: string; amount: number; price_usd?: number }>;
};

type AgentState = {
  cycle_count: number;
  timestamp: number;
  last_decision: Record<string, unknown> | null;
  portfolio_history: PortfolioSnapshot[];
  current_allocation: { WETH: number; USDC: number } | null;
  reasoning: string;
};

export default function App() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [state, setState] = useState<AgentState | null>(null);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [statusRes, stateRes] = await Promise.all([
          axios.get<AgentStatus>(`${API_BASE}/status`),
          axios.get<AgentState>(`${API_BASE}/state`),
        ]);
        if (!cancelled) {
          setStatus(statusRes.data);
          setState(stateRes.data);
          setConnected(true);
        }
      } catch {
        if (!cancelled) {
          setConnected(false);
        }
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const latestPortfolio = state?.portfolio_history?.at(-1);
  const totalValue = latestPortfolio?.total_value_usd ?? null;

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-accent font-mono">
            CapyMate Dashboard
          </h1>
          <p className="mt-1 text-text-secondary">
            Real-time agent monitoring &amp; portfolio overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              connected ? 'bg-emerald-400' : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium text-text-secondary">
            {connected ? 'API Connected' : 'API Disconnected'}
          </span>
        </div>
      </header>

      <main className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <StatusCard status={status} totalValue={totalValue} />
        </div>
        <div className="col-span-2">
          <AllocationChart state={state} />
        </div>
        <div className="col-span-3">
          <TradeHistory state={state} />
        </div>
      </main>
    </div>
  );
}
