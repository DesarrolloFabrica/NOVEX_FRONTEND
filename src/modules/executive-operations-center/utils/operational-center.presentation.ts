import type { SituationSeverity } from '@/modules/situations/types/situation.types'

export const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En gestión',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
}

export const SEVERITY_LABELS: Record<SituationSeverity, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export function formatDateTime(value: string | null): string {
  if (!value) return 'Sin registro'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDate(value: string | null): string {
  if (!value) return 'Sin registro'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatRelativeTime(value: string | null): string {
  if (!value) return 'Sin actividad'
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return value
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Hace ${days} d`
  return formatDate(value)
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Sin datos'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours < 24) return remainder > 0 ? `${hours} h ${remainder} min` : `${hours} h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days} d ${remainingHours} h` : `${days} d`
}

export function formatConfidence(value: number | null): string {
  if (value === null) return 'Sin análisis'
  return `${Math.round(value * 100)}%`
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll('_', ' ').toLowerCase()
}

export function severityLabel(severity: SituationSeverity): string {
  return SEVERITY_LABELS[severity]
}

export function statusTone(status: string): string {
  if (status === 'OPEN') return 'critical'
  if (status === 'IN_PROGRESS') return 'attention'
  return 'stable'
}

export function severityTone(severity: SituationSeverity): string {
  if (severity === 'CRITICAL') return 'critical'
  if (severity === 'HIGH') return 'high'
  if (severity === 'MEDIUM') return 'attention'
  return 'stable'
}

export function eventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    SITUATION_CREATED: 'Registro creado',
    STATUS_CHANGED: 'Estado actualizado',
    AI_ANALYSIS_COMPLETED: 'Análisis IA completado',
    AI_REANALYZED: 'Reanálisis IA',
    AI_ANALYSIS_VERSION_CREATED: 'Nueva versión IA',
    EVIDENCE_ADDED: 'Evidencia agregada',
    RECOMMENDATION_UPDATED: 'Recomendación actualizada',
  }
  return labels[eventType] ?? eventType.replaceAll('_', ' ').toLowerCase()
}

export function situationAge(createdAt: string): string {
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return 'Sin fecha'
  return formatDuration(Math.max(0, Math.floor((Date.now() - created) / 60_000)))
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const text = sanitizeCsvValue(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function sanitizeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const CSV_DELIMITER = ';'

export function buildCsvContent(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  delimiter: string = CSV_DELIMITER,
): string {
  const formatRow = (row: Array<string | number | null | undefined>) =>
    row.map((cell) => escapeCsvCell(cell)).join(delimiter)

  return [`sep=${delimiter}`, formatRow(headers), ...rows.map(formatRow)].join('\r\n')
}

/** CSV en UTF-16 LE: Excel en Windows abre tildes y ñ correctamente. */
export function createExcelCompatibleCsvBlob(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  delimiter: string = CSV_DELIMITER,
): Blob {
  const csv = buildCsvContent(headers, rows, delimiter)
  const bytes = new Uint8Array((csv.length + 1) * 2)
  const view = new DataView(bytes.buffer)
  view.setUint16(0, 0xfeff, true)

  for (let index = 0; index < csv.length; index += 1) {
    view.setUint16(2 + index * 2, csv.charCodeAt(index), true)
  }

  return new Blob([bytes], { type: 'text/csv;charset=utf-16le;' })
}

export function downloadExcelCompatibleCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): void {
  const blob = createExcelCompatibleCsvBlob(headers, rows)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
