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
      <label className="text-xs uppercase tracking-widest text-accent/60">Target Major</label>
      <select
        className="min-w-72 cursor-pointer rounded-xl border-none bg-surface px-4 py-2 text-sm text-accent outline-none disabled:cursor-not-allowed disabled:opacity-50"
        value={value ?? ''}
        disabled={disabled || majors.length === 0}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">
          {disabled ? 'Select a university first' : 'Select a major'}
        </option>
        {majors.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  )
}
