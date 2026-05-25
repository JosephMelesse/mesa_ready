import type { Major } from '../types'

interface Props {
  majors: Major[]
  value: number | null
  disabled: boolean
  onChange: (majorId: number | null) => void
}

export default function MajorSelector({ majors, value, disabled, onChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-xs uppercase tracking-widest" style={{ color: 'rgba(251,191,36,0.6)' }}>
        Target Major
      </label>
      <select
        className="rounded-xl px-4 py-2 text-sm min-w-72 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#3a3a3a', color: '#fbbf24', border: 'none' }}
        value={value ?? ''}
        disabled={disabled || majors.length === 0}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">
          {disabled ? '— select a university first —' : '— select a major —'}
        </option>
        {majors.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  )
}
