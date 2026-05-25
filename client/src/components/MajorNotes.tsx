interface Props {
  notes: string | null
}

export default function MajorNotes({ notes }: Props) {
  if (!notes) return null
  return (
    <details
      className="w-full max-w-2xl rounded-lg overflow-hidden"
      style={{ background: '#3a3a3a' }}
    >
      <summary
        className="px-4 py-2.5 cursor-pointer text-xs uppercase tracking-widest select-none transition-colors"
        style={{ color: 'rgba(251,191,36,0.7)' }}
        onMouseOver={(e) => ((e.target as HTMLElement).style.color = '#fbbf24')}
        onMouseOut={(e) => ((e.target as HTMLElement).style.color = 'rgba(251,191,36,0.7)')}
      >
        University Notes
      </summary>
      <pre
        className="px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap font-sans"
        style={{
          color: 'rgba(251,191,36,0.85)',
          borderTop: '1px solid rgba(251,191,36,0.1)',
        }}
      >
        {notes}
      </pre>
    </details>
  )
}
