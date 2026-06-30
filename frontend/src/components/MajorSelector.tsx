import type { Major } from '../types'

interface Props {
  majors: Major[]
  value: number | null
  disabled: boolean
  loading: boolean
  onChange: (majorId: number | null) => void
}

export default function MajorSelector({ majors, value, disabled, loading, onChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-xs uppercase tracking-widest text-accent/60">Target Major</label>
      {!disabled && loading ? (
        <div className="flex min-w-72 items-center justify-center gap-2 rounded-xl bg-surface px-4 py-2 text-sm text-accent/60">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          <span>Loading majors…</span>
        </div>
      ) : (
        <select
          className="min-w-72 cursor-pointer rounded-xl border-none bg-surface px-4 py-2 text-sm text-accent outline-none disabled:cursor-not-allowed disabled:opacity-50"
          value={value ?? ''}
          disabled={disabled || majors.length === 0}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">
            {disabled ? 'Choose a university first' : 'Select a major'}
          </option>
          {majors.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      )}
      {disabled && (
        <p className="text-sm text-[#fc5a8d]">
          Please select University before selecting a Target Major
        </p>
      )}
    </div>
  )
}
