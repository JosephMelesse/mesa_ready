import type { Major, CatalogCourse, TransferResult, CalGetcResult } from './types'

// Backend lives on a separate origin in deployment. VITE_API_URL points at it
// (e.g. https://api.example.com); leave it unset to use a same-origin /api.
const API_URL = import.meta.env.VITE_API_URL ?? ''

export async function fetchMajors(): Promise<Major[]> {
  const res = await fetch(`${API_URL}/api/majors`)
  if (!res.ok) throw new Error('Failed to fetch majors')
  return res.json()
}

export async function fetchCatalog(): Promise<CatalogCourse[]> {
  const res = await fetch(`${API_URL}/api/cerritos-courses`)
  if (!res.ok) throw new Error('Failed to fetch catalog')
  return res.json()
}

export async function checkReadiness(majorId: number, courses: string[]): Promise<TransferResult> {
  const res = await fetch(`${API_URL}/api/check-readiness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ majorId, courses }),
  })
  if (!res.ok) throw new Error('Failed to check readiness')
  return res.json()
}

export async function checkCalGetc(courses: string[]): Promise<CalGetcResult> {
  const res = await fetch(`${API_URL}/api/check-calgetc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courses }),
  })
  if (!res.ok) throw new Error('Failed to check Cal-GETC')
  return res.json()
}
