import { useState, useEffect } from 'react'
import type { Major, CatalogCourse, Semester, CheckResult } from './types'
import { fetchMajors, fetchCatalog, checkReadiness, checkCalGetc } from './api'
import { genId } from './lib/utils'
import UniversitySelector from './components/UniversitySelector'
import MajorSelector from './components/MajorSelector'
import SemesterCard from './components/SemesterCard'
import TransferResults from './components/TransferResults'
import CalGetcGrid from './components/CalGetcGrid'

function makeSemester(name: string): Semester {
  return { id: genId(), name, classes: [{ id: genId(), value: '' }] }
}

export default function App() {
  const [catalog, setCatalog] = useState<CatalogCourse[]>([])
  const [allMajors, setAllMajors] = useState<Major[]>([])
  const [selectedUniversity, setSelectedUniversity] = useState('')
  const [selectedMajorId, setSelectedMajorId] = useState<number | null>(null)
  const [semesters, setSemesters] = useState<Semester[]>([makeSemester('Semester 1')])
  const [result, setResult] = useState<CheckResult | null>(null)
  const [checking, setChecking] = useState<CheckResult['type'] | null>(null)
  const [majorsLoading, setMajorsLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchMajors(), fetchCatalog()])
      .then(([majors, cat]) => {
        setAllMajors(majors)
        setCatalog(cat)
      })
      .finally(() => setMajorsLoading(false))
  }, [])

  const filteredMajors = allMajors.filter((m) => m.university === selectedUniversity)

  function handleUniversityChange(university: string) {
    setSelectedUniversity(university)
    setSelectedMajorId(null)
    setResult(null)
  }

  function handleMajorChange(majorId: number | null) {
    setSelectedMajorId(majorId)
    setResult(null)
  }

  function handleSemesterChange(updated: Semester) {
    setSemesters((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setResult(null)
  }

  async function runCheck(type: CheckResult['type']) {
    setChecking(type)
    setResult(null)
    try {
      const courses = semesters.flatMap((s) => s.classes.map((c) => c.value)).filter(Boolean)
      if (type === 'transfer') {
        if (!selectedMajorId) return
        setResult({ type, data: await checkReadiness(selectedMajorId, courses) })
      } else {
        setResult({ type, data: await checkCalGetc(courses) })
      }
    } finally {
      setChecking(null)
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-10">
      <UniversitySelector value={selectedUniversity} onChange={handleUniversityChange} />

      <MajorSelector
        majors={filteredMajors}
        value={selectedMajorId}
        disabled={!selectedUniversity}
        loading={majorsLoading}
        onChange={handleMajorChange}
      />

<div className="flex flex-wrap justify-center gap-6">
        {semesters.map((sem) => (
          <SemesterCard key={sem.id} semester={sem} catalog={catalog} onChange={handleSemesterChange} />
        ))}
      </div>

      <button
        className="flex cursor-pointer flex-col items-center gap-1 border-none bg-transparent text-base font-medium text-accent transition-colors hover:text-accent/70"
        onClick={() =>
          setSemesters((prev) => [...prev, { id: genId(), name: `Semester ${prev.length + 1}`, classes: [] }])
        }
      >
        <span>Add Semester</span>
        <span className="text-3xl leading-none">⊕</span>
      </button>

      <div className="flex flex-col items-center gap-3">
        <button
          className="w-72 cursor-pointer rounded-2xl border-none bg-accent px-8 py-3 text-base font-bold text-charcoal transition-colors enabled:hover:bg-accent/85 disabled:cursor-not-allowed disabled:opacity-30"
          onClick={() => runCheck('transfer')}
          disabled={!selectedMajorId || checking !== null}
        >
          {checking === 'transfer' ? 'Checking…' : 'Check Transfer Readiness'}
        </button>

        <button
          className="w-72 cursor-pointer rounded-2xl border border-accent/30 bg-surface px-8 py-3 text-base font-bold text-accent transition-colors enabled:hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-30"
          onClick={() => runCheck('calgetc')}
          disabled={checking !== null}
        >
          {checking === 'calgetc' ? 'Checking…' : 'Check Cal-GETC Readiness'}
        </button>
      </div>

      {result?.type === 'transfer' && <TransferResults result={result.data} />}
      {result?.type === 'calgetc' && <CalGetcGrid result={result.data} />}
    </div>
  )
}
