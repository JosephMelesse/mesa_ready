export interface CalGetcArea {
  area: string
  name: string
  minCourses: number
  crossDiscipline?: boolean
}

export const CAL_GETC_AREAS: CalGetcArea[] = [
  { area: '1A', name: 'English Composition',             minCourses: 1 },
  { area: '1B', name: 'Critical Thinking & Composition', minCourses: 1 },
  { area: '1C', name: 'Oral Communication',              minCourses: 1 },
  { area: '2',  name: 'Mathematical Concepts',           minCourses: 1 },
  { area: '3A', name: 'Arts',                            minCourses: 1 },
  { area: '3B', name: 'Humanities',                      minCourses: 1 },
  { area: '4',  name: 'Social & Behavioral Sciences',    minCourses: 2, crossDiscipline: true },
  { area: '5A', name: 'Physical Sciences',               minCourses: 1 },
  { area: '5B', name: 'Biological Sciences',             minCourses: 1 },
  { area: '5C', name: 'Laboratory',                      minCourses: 1 },
  { area: '6',  name: 'Ethnic Studies',                  minCourses: 1 },
]
