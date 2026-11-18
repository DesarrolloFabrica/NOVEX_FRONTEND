import { apiDownload } from '@/shared/api/http'

/** Estados activos exportables (los mismos que cuentan como «activa»). */
export type ExportStatus = 'OPEN' | 'IN_PROGRESS'
export type ExportSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type ExportReportKind = 'INTERNAL' | 'INTER_COORDINATION'
export type ExportSheet = 'situations' | 'summary' | 'consequences' | 'related'

export interface SituationsExportOptions {
  /** UUID de coordinaciones responsables; vacío = todas. */
  coordinationIds: string[]
  statuses: ExportStatus[]
  severities: ExportSeverity[]
  reportKinds: ExportReportKind[]
  sheets: ExportSheet[]
}

export const ALL_STATUSES: readonly ExportStatus[] = ['OPEN', 'IN_PROGRESS']
export const ALL_SEVERITIES: readonly ExportSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
export const ALL_REPORT_KINDS: readonly ExportReportKind[] = ['INTERNAL', 'INTER_COORDINATION']
export const ALL_SHEETS: readonly ExportSheet[] = ['summary', 'situations', 'consequences', 'related']

/**
 * Query del endpoint. Un filtro que abarca todos sus valores no se envía: el
 * backend lo interpreta como «sin filtro» y el resumen del archivo dice «Todas».
 */
export function buildSituationsExportQuery(options: SituationsExportOptions): string {
  const params = new URLSearchParams()
  const setIfPartial = (key: string, values: readonly string[], all: readonly string[]) => {
    if (values.length > 0 && values.length < all.length) params.set(key, values.join(','))
  }
  if (options.coordinationIds.length > 0) {
    params.set('coordinationIds', options.coordinationIds.join(','))
  }
  setIfPartial('statuses', options.statuses, ALL_STATUSES)
  setIfPartial('severities', options.severities, ALL_SEVERITIES)
  setIfPartial('reportKinds', options.reportKinds, ALL_REPORT_KINDS)
  // «situations» siempre va; se envía la lista solo si no son todas.
  const sheets = Array.from(new Set<ExportSheet>(['situations', ...options.sheets]))
  if (sheets.length < ALL_SHEETS.length) params.set('sheets', sheets.join(','))
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** Nombre de respaldo si el servidor no lo envía (hora local del navegador). */
export function fallbackExportFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `NOVEX_situaciones_activas_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`
}

export async function downloadActiveSituationsExcel(
  options: SituationsExportOptions,
): Promise<{ blob: Blob; filename: string }> {
  const { blob, filename } = await apiDownload(
    `/situations/export${buildSituationsExportQuery(options)}`,
    // Un libro grande tarda: más margen que una lectura normal.
    { signal: AbortSignal.timeout(90_000) },
  )
  return { blob, filename: filename ?? fallbackExportFilename() }
}

/** Entrega el Blob al navegador como descarga con su nombre. */
export function saveBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Se libera después: algunos navegadores leen la URL tras el clic.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
