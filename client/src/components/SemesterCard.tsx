import type { Semester, CatalogCourse } from '../types'
import CourseInput from './CourseInput'
import { genId } from '../lib/utils'

interface Props {
  semester: Semester
  catalog: CatalogCourse[]
  onChange: (semester: Semester) => void
}

export default function SemesterCard({ semester, catalog, onChange }: Props) {
  return (
    <div className="flex w-80 flex-col gap-3 rounded-2xl bg-surface p-6">
      <input
        className="w-full border-none bg-transparent pb-1 text-xl font-semibold text-accent outline-none"
        value={semester.name}
        onChange={(e) => onChange({ ...semester, name: e.target.value })}
      />
      <div className="flex flex-col gap-2">
        {semester.classes.map((cls) => (
          <CourseInput
            key={cls.id}
            value={cls.value}
            catalog={catalog}
            onChange={(value) =>
              onChange({
                ...semester,
                classes: semester.classes.map((c) => (c.id === cls.id ? { ...c, value } : c)),
              })
            }
          />
        ))}
      </div>
      <button
        className="mt-1 flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-sm text-accent transition-colors hover:text-accent/70"
        onClick={() => onChange({ ...semester, classes: [...semester.classes, { id: genId(), value: '' }] })}
      >
        <span className="text-xl leading-none">⊕</span>
        <span>Add Class</span>
      </button>
    </div>
  )
}
