import type { Semester, CatalogCourse } from '../types'
import CourseInput from './CourseInput'

interface Props {
  semester: Semester
  catalog: CatalogCourse[]
  onUpdateName: (name: string) => void
  onCourseChange: (classId: number, value: string) => void
  onAddClass: () => void
}

export default function SemesterCard({
  semester,
  catalog,
  onUpdateName,
  onCourseChange,
  onAddClass,
}: Props) {
  return (
    <div
      className="rounded-2xl p-6 w-80 flex flex-col gap-3"
      style={{ background: '#3a3a3a' }}
    >
      <input
        className="bg-transparent border-b border-transparent text-xl font-semibold pb-1 outline-none w-full transition-colors"
        style={{
          color: '#fbbf24',
          borderBottomColor: 'transparent',
        }}
        value={semester.name}
        onChange={(e) => onUpdateName(e.target.value)}
        onFocus={(e) => ((e.target as HTMLInputElement).style.borderBottomColor = '#fbbf24')}
        onBlur={(e) => ((e.target as HTMLInputElement).style.borderBottomColor = 'transparent')}
      />
      <div className="flex flex-col gap-2">
        {semester.classes.map((cls) => (
          <CourseInput
            key={cls.id}
            value={cls.value}
            catalog={catalog}
            onChange={(val) => onCourseChange(cls.id, val)}
          />
        ))}
      </div>
      <button
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer text-sm mt-1 p-0 transition-colors"
        style={{ color: '#fbbf24' }}
        onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = '#fcd34d')}
        onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = '#fbbf24')}
        onClick={onAddClass}
      >
        <span className="text-xl leading-none">⊕</span>
        <span>Add Class</span>
      </button>
    </div>
  )
}
