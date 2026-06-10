import type { TransferResult } from '../types'
import { ResultBanner, StatCard, Section, ReqItem } from './results'

export default function TransferResults({ result }: { result: TransferResult }) {
  return (
    <div className="mt-2 flex w-full max-w-2xl flex-col gap-4">
      <ResultBanner ready={result.ready} readyText="Transfer Ready" notReadyText="Not Ready Yet" />

      <div className="flex gap-3">
        <StatCard label="UC-Transferable Units" value={result.totalUnits} color="text-accent" />
        <StatCard label="Requirements Met" value={result.satisfied.length} color="text-good" />
        <StatCard label="Still Missing" value={result.missing.length} color="text-bad" />
      </div>

      {result.missing.length > 0 && (
        <Section title={`Missing (${result.missing.length})`} color="text-bad">
          {result.missing.map((m, i) => (
            <ReqItem
              key={i}
              title={`${m.uciCourse}: ${m.uciTitle}`}
              detail={m.options.length > 0 ? `Take: ${m.options.join(' | ')}` : undefined}
            />
          ))}
        </Section>
      )}

      {result.satisfied.length > 0 && (
        <Section title={`Satisfied (${result.satisfied.length})`} color="text-good" collapsible>
          {result.satisfied.map((s, i) => (
            <ReqItem key={i} title={`${s.uciCourse}: ${s.uciTitle}`} detail={s.satisfiedBy.join(', ')} />
          ))}
        </Section>
      )}

      {result.noArticulation.length > 0 && (
        <Section title={`No Articulation (${result.noArticulation.length})`} color="text-accent/80" collapsible>
          {result.noArticulation.map((n, i) => (
            <ReqItem key={i} title={`${n.uciCourse}: ${n.uciTitle}`} detail={n.reason} />
          ))}
        </Section>
      )}
    </div>
  )
}
