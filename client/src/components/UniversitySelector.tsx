interface Props {
  value: string
  onChange: (university: string) => void
}

export default function UniversitySelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-xs uppercase tracking-widest text-accent/60">University</label>
      <select
        className="min-w-72 cursor-pointer rounded-xl border-none bg-surface px-4 py-2 text-sm text-accent outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a university</option>
        <option value="UCI">UC Irvine</option>
        <option value="UCLA">UC Los Angeles</option>
        <option value="UCSD">UC San Diego</option>
        <option value="Berkeley">UC Berkeley</option>
      </select>
    </div>
  )
}
