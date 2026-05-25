import { useState, useEffect, useCallback } from 'react'
import type { Major, CatalogCourse, Semester, SemesterClass, CheckResult } from './types'
import { fetchMajors, fetchCatalog, fetchMajorNotes, checkReadiness, checkCalGetc } from './api'
import UniversitySelector from './components/UniversitySelector'
import MajorSelector from './components/MajorSelector'
import MajorNotes from './components/MajorNotes'
import SemesterCard from './components/SemesterCard'
import TransferResults from './components/TransferResults'
import CalGetcGrid from './components/CalGetcGrid'

let nextId = 1
const genId = () => nextId++

function makeDefaultSemester(): Semester {
  return {
    id: genId(),
    name: 'Semester 1',
    classes: [
      { id: genId(), value: '' },
      { id: genId(), value: '' },
    ],
  }
}

export default function App() {
  const [catalog, setCatalog] = useState<CatalogCourse[]>([])
  const [allMajors, setAllMajors] = useState<Major[]>([])
  const [selectedUniversity, setSelectedUniversity] = useState('')
  const [selectedMajorId, setSelectedMajorId] = useState<number | null>(null)
  const [majorNotes, setMajorNotes] = useState<string | null>(null)
  const [semesters, setSemesters] = useState<Semester[]>([makeDefaultSemester()])
  const [result, setResult] = useState<CheckResult | null>(null)
  const [loadingTransfer, setLoadingTransfer] = useState(false)
  const [loadingCalGetc, setLoadingCalGetc] = useState(false)

  useEffect(() => {
    Promise.all([fetchMajors(), fetchCatalog()]).then(([majors, cat]) => {
      setAllMajors(majors)
      setCatalog(cat)
    })
  }, [])

  const filteredMajors = allMajors.filter((m) => m.university === selectedUniversity)

  const getCourses = useCallback(
    () => semesters.flatMap((s) => s.classes.map((c) => c.value)).filter(Boolean),
    [semesters]
  )

  function handleUniversityChange(university: string) {
    setSelectedUniversity(university)
    setSelectedMajorId(null)
    setMajorNotes(null)
    setResult(null)
  }

  async function handleMajorChange(majorId: number | null) {
    setSelectedMajorId(majorId)
    setResult(null)
    if (majorId) {
      const notes = await fetchMajorNotes(majorId)
      setMajorNotes(notes)
    } else {
      setMajorNotes(null)
    }
  }

  function handleUpdateName(semId: number, name: string) {
    setSemesters((prev) => prev.map((s) => (s.id === semId ? { ...s, name } : s)))
  }

  function handleCourseChange(semId: number, classId: number, value: string) {
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? { ...s, classes: s.classes.map((c) => (c.id === classId ? { ...c, value } : c)) }
          : s
      )
    )
    setResult(null)
  }

  function handleAddClass(semId: number) {
    const newClass: SemesterClass = { id: genId(), value: '' }
    setSemesters((prev) =>
      prev.map((s) => (s.id === semId ? { ...s, classes: [...s.classes, newClass] } : s))
    )
  }

  function handleAddSemester() {
    const newSem: Semester = {
      id: genId(),
      name: `Semester ${semesters.length + 1}`,
      classes: [],
    }
    setSemesters((prev) => [...prev, newSem])
  }

  async function handleCheckTransfer() {
    if (!selectedMajorId) return
    setLoadingTransfer(true)
    setResult(null)
    try {
      const data = await checkReadiness(selectedMajorId, getCourses())
      setResult({ type: 'transfer', data })
    } finally {
      setLoadingTransfer(false)
    }
  }

  async function handleCheckCalGetc() {
    setLoadingCalGetc(true)
    setResult(null)
    try {
      const data = await checkCalGetc(getCourses())
      setResult({ type: 'calgetc', data })
    } finally {
      setLoadingCalGetc(false)
    }
  }

  return (
    <div className="flex flex-col items-center py-10 px-6 gap-8">

      <UniversitySelector value={selectedUniversity} onChange={handleUniversityChange} />

      <MajorSelector
        majors={filteredMajors}
        value={selectedMajorId}
        disabled={!selectedUniversity}
        onChange={handleMajorChange}
      />

      <MajorNotes notes={majorNotes} />

      <div className="flex flex-wrap gap-6 justify-center">
        {semesters.map((sem) => (
          <SemesterCard
            key={sem.id}
            semester={sem}
            catalog={catalog}
            onUpdateName={(name) => handleUpdateName(sem.id, name)}
            onCourseChange={(classId, value) => handleCourseChange(sem.id, classId, value)}
            onAddClass={() => handleAddClass(sem.id)}
          />
        ))}
      </div>

      <button
        className="flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer text-base font-medium transition-colors"
        style={{ color: '#fbbf24' }}
        onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = '#fcd34d')}
        onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = '#fbbf24')}
        onClick={handleAddSemester}
      >
        <span>Add Semester</span>
        <span className="text-3xl leading-none">⊕</span>
      </button>

      <div className="flex flex-col items-center gap-3">
        <button
          className="w-72 py-3 px-8 rounded-2xl font-bold text-base cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: '#fbbf24', color: '#2e2e2e' }}
          onMouseOver={(e) => {
            if (!(e.currentTarget as HTMLButtonElement).disabled)
              (e.currentTarget as HTMLElement).style.background = '#fcd34d'
          }}
          onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.background = '#fbbf24')}
          onClick={handleCheckTransfer}
          disabled={!selectedMajorId || loadingTransfer}
        >
          {loadingTransfer ? 'Checking…' : 'Check Transfer Readiness'}
        </button>

        <button
          className="w-72 py-3 px-8 rounded-2xl font-bold text-base cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: '#3a3a3a',
            color: '#fbbf24',
            border: '1px solid rgba(251,191,36,0.3)',
          }}
          onMouseOver={(e) => {
            if (!(e.currentTarget as HTMLButtonElement).disabled) {
              (e.currentTarget as HTMLElement).style.background = '#444'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.6)'
            }
          }}
          onMouseOut={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = '#3a3a3a'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.3)'
          }}
          onClick={handleCheckCalGetc}
          disabled={loadingCalGetc}
        >
          {loadingCalGetc ? 'Checking…' : 'Check Cal-GETC Readiness'}
        </button>
      </div>

      {result?.type === 'transfer' && <TransferResults result={result.data} />}
      {result?.type === 'calgetc' && <CalGetcGrid result={result.data} />}

    </div>
  )
}
