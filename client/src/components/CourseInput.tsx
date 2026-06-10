import { useState } from 'react'
import type { CatalogCourse } from '../types'

interface Props {
  value: string
  catalog: CatalogCourse[]
  onChange: (value: string) => void
}

export default function CourseInput({ value, catalog, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const q = value.trim().toLowerCase()
  const matches =
    open && q
      ? catalog
          .filter((c) => {
            const code = `${c.course_prefix} ${c.course_number}`.toLowerCase()
            return (
              code.includes(q) ||
              c.course_title.toLowerCase().includes(q) ||
              (c.former_identifiers ?? []).some((f) => f.toLowerCase().includes(q))
            )
          })
          .slice(0, 8)
      : []

  return (
    <div className="relative">
      <input
        className="w-full rounded-lg border-none bg-charcoal px-3 py-2 text-sm text-accent outline-none"
        placeholder="e.g. CHEM 111 or General Chemistry…"
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {matches.length > 0 && (
        <ul className="absolute top-full z-10 mt-1 w-full list-none overflow-hidden rounded-lg border border-accent/20 bg-surface shadow-xl">
          {matches.map((c) => (
            <li
              key={c.id}
              className="cursor-pointer px-3 py-2 text-sm text-amber-300"
              onMouseDown={() => {
                onChange(`${c.course_prefix} ${c.course_number}`)
                setOpen(false)
              }}
            >
              <span className="font-semibold">
                {c.course_prefix} {c.course_number}
              </span>
              <span className="ml-2 text-accent/60">{c.course_title}</span>
              <span className="ml-1 text-xs text-accent/40">({c.min_units}u)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
