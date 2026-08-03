/** YYYY-MM-DD en la zona horaria local del operador. */
export function todayCaptureDate(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/** Acepta YYYY-MM-DD o valores legacy con hora (YYYY-MM-DDTHH:mm). */
export function normalizeCaptureDate(value: string): string {
  if (!value) return ''
  const datePart = value.split('T')[0]?.trim() ?? ''
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : ''
}

export function isValidCaptureDate(value: string): boolean {
  const normalized = normalizeCaptureDate(value)
  if (!normalized) return false

  const [year, month, day] = normalized.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  )
}

export function isFutureCaptureDate(value: string): boolean {
  const normalized = normalizeCaptureDate(value)
  if (!normalized) return false
  return normalized > todayCaptureDate()
}

/** Convierte un día calendario local a ISO para el backend (mediodía local evita saltos de zona). */
export function captureDateToOccurredAt(value: string): string {
  const normalized = normalizeCaptureDate(value)
  const [year, month, day] = normalized.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString()
}

export function formatCaptureDateLabel(value: string): string {
  const normalized = normalizeCaptureDate(value)
  if (!normalized) return '—'

  const [year, month, day] = normalized.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  if (Number.isNaN(parsed.getTime())) return normalized

  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(parsed)
}
