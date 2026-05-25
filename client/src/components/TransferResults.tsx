import type { TransferResult } from '../types'

function StatCard({
  label,
  value,
  labelColor,
  valueColor,
}: {
  label: string
  value: number
  labelColor: string
  valueColor: string
}) {
  return (
    <div className="flex-1 rounded-2xl px-5 py-3 text-center" style={{ background: '#3a3a3a' }}>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: labelColor }}>
        {label}
      </div>
      <div className="text-3xl font-bold mt-1" style={{ color: valueColor }}>
        {value}
      </div>
    </div>
  )
}

export default function TransferResults({ result }: { result: TransferResult }) {
  return (
    <div className="w-full max-w-2xl flex flex-col gap-4 mt-2">
      <div
        className="rounded-2xl px-6 py-4 text-center text-2xl font-bold"
        style={
          result.ready
            ? { background: 'rgba(22,101,52,0.4)', color: '#4ade80' }
            : { background: 'rgba(127,29,29,0.4)', color: '#f87171' }
        }
      >
        {result.ready ? '✓ Transfer Ready' : '✗ Not Ready Yet'}
      </div>

      <div className="flex gap-3">
        <StatCard
          label="UC-Transferable Units"
          value={result.totalUnits}
          labelColor="rgba(251,191,36,0.5)"
          valueColor="#fbbf24"
        />
        <StatCard
          label="Requirements Met"
          value={result.satisfied.length}
          labelColor="rgba(74,222,128,0.6)"
          valueColor="#4ade80"
        />
        <StatCard
          label="Still Missing"
          value={result.missing.length}
          labelColor="rgba(248,113,113,0.6)"
          valueColor="#f87171"
        />
      </div>

      {result.missing.length > 0 && (
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: '#3a3a3a' }}>
          <div
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: '#f87171' }}
          >
            Missing ({result.missing.length})
          </div>
          <div className="flex flex-col gap-2">
            {result.missing.map((m, i) => (
              <div
                key={i}
                className="pl-3"
                style={{ borderLeft: '2px solid rgba(239,68,68,0.5)' }}
              >
                <div className="font-semibold text-sm" style={{ color: '#fcd34d' }}>
                  {m.uciCourse} — {m.uciTitle}
                </div>
                {m.options.length > 0 && (
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(251,191,36,0.6)' }}>
                    Take: {m.options.join(' | ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.satisfied.length > 0 && (
        <details className="rounded-2xl p-5" style={{ background: '#3a3a3a' }}>
          <summary
            className="text-sm font-semibold uppercase tracking-wide cursor-pointer"
            style={{ color: '#4ade80' }}
          >
            Satisfied ({result.satisfied.length})
          </summary>
          <div className="flex flex-col gap-2 mt-3">
            {result.satisfied.map((s, i) => (
              <div
                key={i}
                className="pl-3"
                style={{ borderLeft: '2px solid rgba(22,163,74,0.5)' }}
              >
                <div className="font-semibold text-sm" style={{ color: '#fcd34d' }}>
                  {s.uciCourse} — {s.uciTitle}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(251,191,36,0.6)' }}>
                  {s.satisfiedBy.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {result.noArticulation.length > 0 && (
        <details className="rounded-2xl p-5" style={{ background: '#3a3a3a' }}>
          <summary
            className="text-sm font-semibold uppercase tracking-wide cursor-pointer"
            style={{ color: 'rgba(234,179,8,0.8)' }}
          >
            No Articulation ({result.noArticulation.length})
          </summary>
          <div className="flex flex-col gap-2 mt-3">
            {result.noArticulation.map((n, i) => (
              <div
                key={i}
                className="pl-3"
                style={{ borderLeft: '2px solid rgba(202,138,4,0.4)' }}
              >
                <div className="font-semibold text-sm" style={{ color: '#fcd34d' }}>
                  {n.uciCourse} — {n.uciTitle}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(251,191,36,0.6)' }}>
                  {n.reason}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
