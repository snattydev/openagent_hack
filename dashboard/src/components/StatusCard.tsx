type Props = {
  status: { isRunning: boolean; cycleCount: number; dailyTradeCount: number } | null;
};

export default function StatusCard({ status }: Props) {
  return (
    <section className="dashboard-card">
      <h2 className="text-xl font-semibold mb-4 font-mono text-accent">Agent Status</h2>
      {status ? (
        <dl className="space-y-3">
          <div className="flex justify-between items-center">
            <dt className="text-text-secondary">Running</dt>
            <dd className={status.isRunning ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
              {status.isRunning ? 'Yes' : 'No'}
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-text-secondary">Cycle Count</dt>
            <dd className="font-mono text-text-primary">{status.cycleCount}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-text-secondary">Daily Trades</dt>
            <dd className="font-mono text-text-primary">{status.dailyTradeCount}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-text-secondary italic">Waiting for data...</p>
      )}
    </section>
  );
}
