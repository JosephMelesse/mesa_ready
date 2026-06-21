import type { CalGetcResult } from '../types'
import { ResultBanner, StatCard, Section } from './ResultUI'

const AREA_LABELS: Record<string, string> = {
  '1A': 'English Composition',
  '1B': 'Critical Thinking & Composition',
  '1C': 'Oral Communication',
  '2': 'Mathematical Concepts',
  '3A': 'Arts',
  '3B': 'Humanities',
  '4': 'Social & Behavioral Sciences',
  '5A': 'Physical Sciences',
  '5B': 'Biological Sciences',
  '5C': 'Laboratory',
  '6': 'Ethnic Studies',
}

export default function CalGetcGrid({ result }: { result: CalGetcResult }) {
  return (
    <div className="mt-2 flex w-full max-w-2xl flex-col gap-4">
      <ResultBanner ready={result.ready} readyText="Cal-GETC Complete" notReadyText="Cal-GETC Incomplete" />

      <div className="flex gap-3">
        <StatCard label="Areas Complete" value={result.satisfied.length} color="text-good" />
        <StatCard label="Areas Missing" value={result.missing.length} color="text-bad" />
        <StatCard label="Total Areas" value={Object.keys(AREA_LABELS).length} color="text-accent" />
      </div>

      <Section title="All Areas" color="text-accent/60">
        {Object.entries(AREA_LABELS).map(([area, name]) => {
          const sat = result.satisfied.find((s) => s.area === area)
          const mis = result.missing.find((m) => m.area === area)
          const done = !!sat
          const entry = sat ?? mis
          const needed = mis?.needed ?? 1
          const statusColor = done ? 'text-good' : 'text-bad'

          return (
            <div key={area} className="flex items-start gap-3 px-3 py-2">
              <span className={`mt-0.5 w-6 shrink-0 text-xs font-bold ${statusColor}`}>{area}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${statusColor}`}>
                  {name}
                  {done ? '' : ` (need ${needed} more course${needed > 1 ? 's' : ''})`}
                </div>
                {entry?.courses?.length ? (
                  <div className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-accent/50">
                    {entry.courses.join(' · ')}
                  </div>
                ) : null}
                {entry?.note ? <div className="mt-0.5 text-xs text-accent/70">{entry.note}</div> : null}
              </div>
            </div>
          )
        })}
      </Section>
    </div>
  )
}
