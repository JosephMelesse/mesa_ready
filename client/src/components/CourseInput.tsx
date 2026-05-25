import { useState, useRef, useEffect } from 'react'
import type { CatalogCourse } from '../types'

interface Props {
  value: string
  catalog: CatalogCourse[]
  onChange: (value: string) => void
}

export default function CourseInput({ value, catalog, onChange }: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const matches =
    query.trim().length > 0
      ? catalog
          .filter((c) => {
            const q = query.toLowerCase()
            const code = `${c.course_prefix} ${c.course_number}`.toLowerCase()
            const title = c.course_title.toLowerCase()
            const formers = (c.former_identifiers ?? []).map((f) => f.toLowerCase())
            return code.includes(q) || title.includes(q) || formers.some((f) => f.includes(q))
          })
          .slice(0, 8)
      : []

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function handleSelect(course: CatalogCourse) {
    const chosen = `${course.course_prefix} ${course.course_number}`
    setQuery(chosen)
    onChange(chosen)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-shadow"
        style={{
          background: '#2e2e2e',
          color: '#fbbf24',
          border: 'none',
        }}
        placeholder="e.g. CHEM 111 or General Chemistry…"
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <ul
          className="absolute z-10 top-full mt-1 w-full rounded-lg overflow-hidden shadow-xl list-none"
          style={{
            background: '#2a2a2a',
            border: '1px solid rgba(251,191,36,0.2)',
          }}
        >
          {matches.map((c) => (
            <li
              key={c.id}
              className="flex items-center px-3 py-2 text-sm cursor-pointer transition-colors"
              style={{ color: '#fcd34d' }}
              onMouseOver={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.1)')
              }
              onMouseOut={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'transparent')
              }
              onMouseDown={() => handleSelect(c)}
            >
              <span className="font-semibold">
                {c.course_prefix} {c.course_number}
              </span>
              <span className="ml-2" style={{ color: 'rgba(251,191,36,0.6)' }}>
                — {c.course_title}
              </span>
              <span className="ml-1 text-xs" style={{ color: 'rgba(251,191,36,0.4)' }}>
                ({c.min_units}u)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
