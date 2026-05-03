type Props = {
  state: Record<string, unknown> | null;
};

interface PortfolioHistoryItem {
  balances: unknown[];
  total_value_usd: number;
  current_allocation: { WETH: number; USDC: number };
  target_allocation: { WETH: number; USDC: number };
  timestamp?: number;
}

function isPortfolioHistoryItem(item: unknown): item is PortfolioHistoryItem {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  const curr = obj.current_allocation;
  if (typeof curr !== 'object' || curr === null) return false;
  const alloc = curr as Record<string, unknown>;
  return (
    typeof obj.total_value_usd === 'number' &&
    typeof alloc.WETH === 'number' &&
    typeof alloc.USDC === 'number'
  );
}

function getHistory(state: Record<string, unknown> | null): PortfolioHistoryItem[] {
  if (!state) return [];
  const raw = state.portfolio_history;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPortfolioHistoryItem);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimestamp(ts: number | undefined): string {
  if (typeof ts !== 'number') return '—';
  return new Date(ts).toLocaleString();
}

export default function TradeHistory({ state }: Props) {
  if (state === null) {
    return (
      <section className="dashboard-card">
        <h2 className="text-xl font-semibold mb-4 font-mono text-accent">Trade History</h2>
        <p className="text-text-secondary italic">Loading...</p>
      </section>
    );
  }

  const history = getHistory(state);

  if (history.length === 0) {
    return (
      <section className="dashboard-card">
        <h2 className="text-xl font-semibold mb-4 font-mono text-accent">Trade History</h2>
        <div className="border border-dashed border-divider rounded-lg p-8 text-center">
          <span className="text-text-secondary">No trades yet</span>
        </div>
      </section>
    );
  }

  const recentHistory = [...history].reverse().slice(0, 10);
  const hasMore = history.length > 10;

  return (
    <section className="dashboard-card">
      <h2 className="text-xl font-semibold mb-4 font-mono text-accent">Trade History</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-divider">
              <th className="pb-3 pr-4 text-sm font-medium text-text-secondary">Cycle</th>
              <th className="pb-3 pr-4 text-sm font-medium text-text-secondary">Timestamp</th>
              <th className="pb-3 pr-4 text-sm font-medium text-text-secondary">WETH</th>
              <th className="pb-3 pr-4 text-sm font-medium text-text-secondary">USDC</th>
              <th className="pb-3 pr-4 text-sm font-medium text-text-secondary text-right">Rebalanced</th>
              <th className="pb-3 text-sm font-medium text-text-secondary text-right">Total Value</th>
            </tr>
          </thead>
          <tbody>
            {recentHistory.map((item, idx) => {
              const originalIndex = history.length - 1 - idx;
              const prevItem = originalIndex > 0 ? history[originalIndex - 1] : null;

              const wethBefore = prevItem
                ? prevItem.current_allocation.WETH
                : item.current_allocation.WETH;
              const wethAfter = item.current_allocation.WETH;
              const usdcBefore = prevItem
                ? prevItem.current_allocation.USDC
                : item.current_allocation.USDC;
              const usdcAfter = item.current_allocation.USDC;

              const wethDiff = wethAfter - wethBefore;
              const usdcDiff = usdcAfter - usdcBefore;
              const rebalanceAmount = Math.abs(wethDiff) * item.total_value_usd;
              const valueChange = prevItem ? item.total_value_usd - prevItem.total_value_usd : 0;

              return (
                <tr
                  key={originalIndex}
                  className="border-b border-divider last:border-b-0"
                >
                  <td className="py-3 pr-4 font-mono text-text-primary">
                    {originalIndex + 1}
                  </td>
                  <td className="py-3 pr-4 text-text-secondary">
                    {formatTimestamp(item.timestamp)}
                  </td>
                  <td className="py-3 pr-4 font-mono text-text-primary">
                    {formatPercent(wethBefore)} →{' '}
                    <span
                      className={
                        wethDiff > 0
                          ? 'text-emerald-400'
                          : wethDiff < 0
                            ? 'text-rose-400'
                            : ''
                      }
                    >
                      {formatPercent(wethAfter)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-text-primary">
                    {formatPercent(usdcBefore)} →{' '}
                    <span
                      className={
                        usdcDiff > 0
                          ? 'text-emerald-400'
                          : usdcDiff < 0
                            ? 'text-rose-400'
                            : ''
                      }
                    >
                      {formatPercent(usdcAfter)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-text-primary">
                    {rebalanceAmount > 0 ? formatUsd(rebalanceAmount) : '—'}
                  </td>
                  <td className="py-3 text-right font-mono">
                    <span className="text-text-primary">{formatUsd(item.total_value_usd)}</span>
                    {prevItem && (
                      <span
                        className={`ml-2 text-xs ${
                          valueChange > 0
                            ? 'text-emerald-400'
                            : valueChange < 0
                              ? 'text-rose-400'
                              : 'text-text-secondary'
                        }`}
                      >
                        {valueChange > 0 ? '+' : ''}
                        {formatUsd(valueChange)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <p className="mt-4 text-sm text-text-secondary">
          +{history.length - 10} older trades not shown
        </p>
      )}
    </section>
  );
}
