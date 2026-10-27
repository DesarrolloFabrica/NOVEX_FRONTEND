/**
 * Cobertura temporal de un tramo de la lámina «Carga y movimiento» (módulo
 * puro). Solo PRESENTACIÓN: no cambia cifras, no normaliza, no proyecta.
 * Se deriva de los campos del contrato /state (start, end, calendarStart,
 * calendarEnd, dataEnd, future, current); nunca del reloj del navegador.
 */
import type { OperationalKpiFlowBucket } from '@/modules/operational-cards/types/operational-kpi.types'

/**
 * - `future`: empieza después del corte (dataEnd null) → no se dibuja.
 * - `in-progress`: los datos llegan antes del fin del tramo (el tramo actual).
 * - `clipped`: semana recortada por el borde del mes («1–4 oct» de la semana
 *   28 sep – 4 oct): todos sus días tienen datos, pero son menos de siete.
 * - `full`: tramo completo.
 */
export type FlujoCoverage = 'future' | 'in-progress' | 'clipped' | 'full'

export function flujoBucketCoverage(bucket: OperationalKpiFlowBucket): FlujoCoverage {
  if (bucket.future || !bucket.dataEnd) return 'future'
  if (bucket.dataEnd < bucket.end) return 'in-progress'
  if (bucket.start !== bucket.calendarStart || bucket.end !== bucket.calendarEnd) {
    return 'clipped'
  }
  return 'full'
}

/** Marca breve bajo la etiqueta del eje (null = tramo completo y no actual). */
export function flujoCoverageTag(bucket: OperationalKpiFlowBucket): string | null {
  const coverage = flujoBucketCoverage(bucket)
  if (coverage === 'in-progress') return 'EN CURSO'
  if (bucket.current) return 'ACTUAL'
  if (coverage === 'clipped') return 'PARCIAL'
  return null
}

/**
 * Tramos con cobertura temporal (pasados + el actual aunque sea parcial).
 * Los futuros siempre van al final (start > dataTo), así que el resultado es
 * un PREFIJO del arreglo original: el índice i de las gráficas es el mismo
 * tramo i de la respuesta. Aun así, todo (dibujo, hover, clic, teclado) se
 * resuelve sobre ESTE arreglo, nunca sobre el original.
 */
export function coveredFlowBuckets(
  buckets: readonly OperationalKpiFlowBucket[],
): OperationalKpiFlowBucket[] {
  return buckets.filter((bucket) => flujoBucketCoverage(bucket) !== 'future')
}

/**
 * RESUMEN de la lámina, derivado de los MISMOS tramos que dibujan las gráficas
 * (sin consultas ni cálculos de dominio nuevos):
 * - Activos al corte = stock del ÚLTIMO tramo con datos (= último punto de
 *   Carga; el parser ya exige que coincida con snapshot.activeCount). Los
 *   puntos de Carga NO se suman: son existencias en cortes distintos.
 * - Reportados / Cerrados = Σ de eventos por tramo. Es válido sumar porque los
 *   tramos con datos cubren [from, dataTo] sin huecos ni solapes (el backend
 *   los recorta al periodo y al corte) y los futuros ya están excluidos.
 */
export function flujoSummary(covered: readonly OperationalKpiFlowBucket[]) {
  const last = covered.at(-1)
  if (!last?.active || !last.dataEnd) return null
  return {
    activeAtCut: last.active.total,
    cutAt: last.dataEnd,
    inProgress: last.current || flujoBucketCoverage(last) === 'in-progress',
    from: covered[0].start,
    reported: covered.reduce((sum, b) => sum + (b.created ?? 0), 0),
    closed: covered.reduce((sum, b) => sum + (b.solved?.total ?? 0), 0),
  }
}

const MONTH_SHORT_LOWER = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

/** «15 oct» / «15 oct 2026» a partir de YYYY-MM-DD (sin zona: fecha civil). */
export function formatFlujoDay(ymd: string, withYear = false): string {
  const [year, month, day] = ymd.split('-').map(Number)
  return `${day} ${MONTH_SHORT_LOWER[month - 1]}${withYear ? ` ${year}` : ''}`
}

/** Nota de cobertura para tooltip y tabla accesible (null = tramo completo). */
export function flujoCoverageNote(bucket: OperationalKpiFlowBucket): string | null {
  const coverage = flujoBucketCoverage(bucket)
  if (coverage === 'in-progress' && bucket.dataEnd) {
    return `Tramo en curso · datos hasta el ${formatFlujoDay(bucket.dataEnd)}`
  }
  if (coverage === 'clipped') {
    return `Tramo parcial · semana del ${formatFlujoDay(bucket.calendarStart)} al ${formatFlujoDay(bucket.calendarEnd)}, recortada al mes`
  }
  return null
}
