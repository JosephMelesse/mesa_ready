import type { ReactNode } from 'react'

export function ResultBanner({ ready, readyText, notReadyText }: {
  ready: boolean
  readyText: string
  notReadyText: string
}) {
  return (
    <div
      className={`rounded-2xl bg-surface px-6 py-4 text-center text-2xl font-bold ${
        ready ? 'text-good' : 'text-bad'
      }`}
    >
      {ready ? readyText : notReadyText}
    </div>
  )
}

export function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-surface px-5 py-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-accent/50">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

export function Section({ title, color, collapsible = false, children }: {
  title: string
  color: string
  collapsible?: boolean
  children: ReactNode
}) {
  const heading = `text-sm font-semibold uppercase tracking-wide ${color}`
  if (!collapsible) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-5">
        <div className={heading}>{title}</div>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    )
  }
  return (
    <details className="rounded-2xl bg-surface p-5">
      <summary className={`cursor-pointer ${heading}`}>{title}</summary>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </details>
  )
}

export function ReqItem({ title, detail }: { title: string; detail?: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-amber-300">{title}</div>
      {detail && <div className="mt-0.5 text-xs text-accent/60">{detail}</div>}
    </div>
  )
}
