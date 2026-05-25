import type { CalGetcResult } from '../types'

const AREA_LABELS: Record<string, string> = {
  '1A': 'English Composition',
  '1B': 'Critical Thinking & Composition',
  '1C': 'Oral Communication',
  '2':  'Mathematical Concepts',
  '3A': 'Arts',
  '3B': 'Humanities',
  '4':  'Social & Behavioral Sciences',
  '5A': 'Physical Sciences',
  '5B': 'Biological Sciences',
  '5C': 'Laboratory',
  '6':  'Ethnic Studies',
}

export default function CalGetcGrid({ result }: { result: CalGetcResult }) {
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
        {result.ready ? '✓ Cal-GETC Complete' : '✗ Cal-GETC Incomplete'}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl px-5 py-3 text-center" style={{ background: '#3a3a3a' }}>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'rgba(74,222,128,0.6)' }}>
            Areas Complete
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: '#4ade80' }}>
            {result.satisfied.length}
          </div>
        </div>
        <div className="flex-1 rounded-2xl px-5 py-3 text-center" style={{ background: '#3a3a3a' }}>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'rgba(248,113,113,0.6)' }}>
            Areas Missing
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: '#f87171' }}>
            {result.missing.length}
          </div>
        </div>
        <div className="flex-1 rounded-2xl px-5 py-3 text-center" style={{ background: '#3a3a3a' }}>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'rgba(251,191,36,0.5)' }}>
            Total Areas
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: '#fbbf24' }}>
            11
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: '#3a3a3a' }}>
        <div
          className="text-sm font-semibold uppercase tracking-wide mb-1"
          style={{ color: 'rgba(251,191,36,0.6)' }}
        >
          All Areas
        </div>
        {Object.entries(AREA_LABELS).map(([area, name]) => {
          const sat = result.satisfied.find((s) => s.area === area)
          const mis = result.missing.find((m) => m.area === area)
          const done = !!sat
          const entry = sat ?? mis
          const needed = mis?.needed ?? 1

          return (
            <div
              key={area}
              className="flex items-start gap-3 rounded-xl px-3 py-2"
              style={{
                background: done ? 'rgba(20,83,45,0.2)' : 'rgba(127,29,29,0.2)',
              }}
            >
              <span
                className="text-xs font-bold w-6 shrink-0 mt-0.5"
                style={{ color: done ? '#4ade80' : '#f87171' }}
              >
                {area}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-semibold"
                  style={{ color: done ? '#86efac' : '#fca5a5' }}
                >
                  {name}
                  {done ? ' ✓' : ` — need ${needed} more course${needed > 1 ? 's' : ''}`}
                </div>
                {entry?.courses?.length ? (
                  <div
                    className="text-xs mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ color: 'rgba(251,191,36,0.5)' }}
                  >
                    {entry.courses.join(' · ')}
                  </div>
                ) : null}
                {entry?.note ? (
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(234,179,8,0.7)' }}>
                    {entry.note}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
