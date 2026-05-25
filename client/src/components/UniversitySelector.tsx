interface Props {
  value: string
  onChange: (university: string) => void
}

export default function UniversitySelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-xs uppercase tracking-widest" style={{ color: 'rgba(251,191,36,0.6)' }}>
        University
      </label>
      <select
        className="rounded-xl px-4 py-2 text-sm min-w-72 outline-none cursor-pointer"
        style={{ background: '#3a3a3a', color: '#fbbf24', border: 'none' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— select a university —</option>
        <option value="UCI">UC Irvine</option>
        <option value="UCLA">UC Los Angeles</option>
        <option value="UCSD">UC San Diego</option>
        <option value="Berkeley">UC Berkeley</option>
      </select>
    </div>
  )
}
