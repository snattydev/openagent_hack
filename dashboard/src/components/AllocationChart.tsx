import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { TooltipProps } from 'recharts';

type Props = {
  state: Record<string, unknown> | null;
};

type Allocation = {
  WETH: number;
  USDC: number;
};

type HistoryItem = {
  current_allocation: Allocation;
  timestamp: string;
};

type ParsedState = {
  current_allocation: Allocation | null;
  portfolio_history: HistoryItem[];
};

const COLORS = {
  WETH: '#22d3ee',
  USDC: '#fbbf24',
};

function getRecord(obj: unknown): Record<string, unknown> | null {
  if (typeof obj === 'object' && obj !== null) {
    return obj as Record<string, unknown>;
  }
  return null;
}

function parseAllocation(value: unknown): Allocation | null {
  const record = getRecord(value);
  if (!record) return null;
  const weth = record.WETH;
  const usdc = record.USDC;
  if (typeof weth === 'number' && typeof usdc === 'number') {
    return { WETH: weth, USDC: usdc };
  }
  return null;
}

function parseHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): HistoryItem | null => {
      const record = getRecord(item);
      if (!record) return null;
      const alloc = parseAllocation(record.current_allocation);
      const ts = record.timestamp;
      if (alloc && typeof ts === 'string') {
        return { current_allocation: alloc, timestamp: ts };
      }
      return null;
    })
    .filter((item): item is HistoryItem => item !== null);
}

function parseState(state: Record<string, unknown>): ParsedState {
  return {
    current_allocation: parseAllocation(state.current_allocation),
    portfolio_history: parseHistory(state.portfolio_history),
  };
}

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-surface border border-divider rounded-lg p-2 shadow-lg">
      {label && (
        <p className="text-xs text-text-secondary mb-1">{label}</p>
      )}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-text-primary font-medium">{entry.name}:</span>
          <span className="text-text-secondary">
            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default function AllocationChart({ state }: Props) {
  if (!state) {
    return (
      <section className="dashboard-card min-h-80 flex flex-col">
        <h2 className="text-xl font-semibold mb-4 font-mono text-accent">
          Portfolio Allocation
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-secondary">Loading...</span>
        </div>
      </section>
    );
  }

  const parsed = parseState(state);

  if (!parsed.current_allocation) {
    return (
      <section className="dashboard-card min-h-80 flex flex-col">
        <h2 className="text-xl font-semibold mb-4 font-mono text-accent">
          Portfolio Allocation
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-secondary">No allocation data available</span>
        </div>
      </section>
    );
  }

  const pieData = [
    { name: 'WETH', value: parsed.current_allocation.WETH },
    { name: 'USDC', value: parsed.current_allocation.USDC },
  ];

  const hasHistory = parsed.portfolio_history.length > 0;

  const historyData = parsed.portfolio_history.map((item) => {
    const date = new Date(item.timestamp);
    const time = Number.isNaN(date.getTime())
      ? item.timestamp
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      time,
      WETH: item.current_allocation.WETH,
      USDC: item.current_allocation.USDC,
    };
  });

  return (
    <section
      className={`dashboard-card flex flex-col ${
        hasHistory ? 'min-h-[28rem]' : 'min-h-80'
      }`}
    >
      <h2 className="text-xl font-semibold mb-4 font-mono text-accent">
        Portfolio Allocation
      </h2>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1 min-h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="35%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={4}
                dataKey="value"
                isAnimationActive={false}
                stroke="none"
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name as keyof typeof COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-text-primary text-sm ml-1">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {hasHistory && (
          <div className="flex-1 min-h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWeth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.WETH} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.WETH} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUsdc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.USDC} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.USDC} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-divider)"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-divider)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="WETH"
                  stroke={COLORS.WETH}
                  fillOpacity={1}
                  fill="url(#colorWeth)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="USDC"
                  stroke={COLORS.USDC}
                  fillOpacity={1}
                  fill="url(#colorUsdc)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
