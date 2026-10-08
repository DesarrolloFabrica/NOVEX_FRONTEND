import { formatDossierFolio } from '@/modules/operational-cards/data/problemDossier'
import type {
  InternalConsequenceMark,
  InternalProblemRow,
  InternalRecurrenceBucket,
  InternalRecurrenceBucketKind,
  InternalRecurrenceCategory,
  InternalRecurrenceResponse,
} from '@/modules/operational-cards/types/internal-problems.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'

/**
 * INTERNOS · presentación pura de las dos láminas.
 *
 *   RECURRENCIA: filas del heatmap (Top 5 + «Otras»), intensidad, textos de
 *     columna, tooltip y ranking. La unidad es la CATEGORÍA, nunca «el mismo
 *     problema que volvió».
 *   AFECTACIONES ACTIVAS: Top 5, filas y escala común de la línea de vida
 *     (tiempo activo y afectaciones), legacy fuera y textos de tooltip.
 */

export const SEVERITY_ORDER: readonly SituationSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export const SEVERITY_LABEL: Record<SituationSeverity, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
}

export function severityRank(severity: SituationSeverity): number {
  return SEVERITY_ORDER.indexOf(severity)
}

export function severityDrift(
  row: Pick<InternalProblemRow, 'reportedSeverity' | 'severityAtCut'>,
): number {
  return Math.max(0, severityRank(row.severityAtCut) - severityRank(row.reportedSeverity))
}

export function internalProblemFolio(id: string): string {
  return formatDossierFolio(id)
}

/* ───────────────────────────── Textos comunes ───────────────────────────── */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** «hace 3 min» · «hace 2 h» · «hace 1 d». */
export function formatAgo(iso: string, reference: Date): string {
  const delta = Math.max(0, reference.getTime() - new Date(iso).getTime())
  if (delta < HOUR) return `hace ${Math.max(1, Math.round(delta / MINUTE))} min`
  if (delta < DAY) return `hace ${Math.floor(delta / HOUR)} h`
  return `hace ${Math.floor(delta / DAY)} d`
}

/** Edad corta: «hoy» · «8 d». */
export function formatAge(days: number): string {
  return days === 0 ? 'hoy' : `${days} d`
}

/** Edad larga del tooltip: «abierto hoy» · «1 día abierto» · «8 días abierto». */
export function formatAgeLong(days: number): string {
  if (days === 0) return 'Abierto hoy'
  return days === 1 ? '1 día abierto' : `${days} días abierto`
}

export function countLabel(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** «MEDIA → CRÍTICA» si escaló; si no, solo la severidad al corte. */
export function severityPath(
  row: Pick<InternalProblemRow, 'reportedSeverity' | 'severityAtCut' | 'historyReliable'>,
): string {
  const now = SEVERITY_LABEL[row.severityAtCut].toUpperCase()
  if (!row.historyReliable || severityDrift(row) === 0) return now
  return `${SEVERITY_LABEL[row.reportedSeverity].toUpperCase()} → ${now}`
}

export const SLA_TOOLTIP: Record<InternalProblemRow['slaAtCut'], string | null> = {
  overdue: 'SLA vencido',
  at_risk: 'SLA en riesgo',
  on_track: 'SLA en plazo',
  none: null,
}

/** Instante de referencia de los textos relativos: min(ahora, corte). */
export function internalProblemsReference(cutAt: string, now: Date = new Date()): Date {
  return new Date(Math.min(now.getTime(), new Date(cutAt).getTime()))
}

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const WEEKDAYS_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

function ymdParts(ymd: string): { year: number; month: number; day: number; weekday: number } {
  const [year, month, day] = ymd.split('-').map(Number)
  return { year, month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() }
}

/** «7 OCT» a partir de YYYY-MM-DD. */
export function formatCutDay(ymd: string): string {
  const { month, day } = ymdParts(ymd)
  return `${day} ${MONTHS.at(month - 1)}`
}

/* ───────────────────────────── RECURRENCIA ───────────────────────────── */

/** Filas visibles del heatmap antes de «Otras». */
export const RECURRENCE_TOP = 5

/** Unidad de la presencia según el nivel: «meses», «semanas», «días». */
export function presenceUnit(kind: InternalRecurrenceBucketKind, n: number): string {
  if (kind === 'month') return n === 1 ? 'mes' : 'meses'
  if (kind === 'week') return n === 1 ? 'semana' : 'semanas'
  return n === 1 ? 'día' : 'días'
}

/** «presente en 4/4 meses». */
export function presenceText(
  category: Pick<InternalRecurrenceCategory, 'bucketsWithOccurrences'>,
  eligible: number,
  kind: InternalRecurrenceBucketKind,
): string {
  return `presente en ${category.bucketsWithOccurrences}/${eligible} ${presenceUnit(kind, eligible)}`
}

/** Encabezado de columna: «JUL» · «14–20 SEP» · «LUN 14». */
export function bucketHeader(bucket: InternalRecurrenceBucket, kind: InternalRecurrenceBucketKind): string {
  const { month, day, weekday } = ymdParts(bucket.start)
  if (kind === 'month') return MONTHS.at(month - 1) ?? ''
  if (kind === 'day') return `${WEEKDAYS_SHORT.at(weekday)} ${day}`
  return bucket.label.toUpperCase()
}

/** Nombre del bucket en el tooltip: «septiembre» · «la semana 14–20 sep» · «el lunes 14 sep». */
export function bucketLongName(bucket: InternalRecurrenceBucket, kind: InternalRecurrenceBucketKind): string {
  const { month, day, weekday } = ymdParts(bucket.start)
  if (kind === 'month') return MONTHS_LONG.at(month - 1) ?? ''
  if (kind === 'day') return `el ${WEEKDAYS_LONG.at(weekday)} ${day} ${MONTHS.at(month - 1)?.toLowerCase()}`
  return `la semana ${bucket.label}`
}

export type RecurrenceRow = {
  id: string
  name: string
  /** «Otras (N categorías)» agrupa el resto. */
  others: number
  totalCreated: number
  bucketsWithOccurrences: number
  values: Array<number | null>
}

/**
 * Top 5 categorías (orden del backend: presencia ↓ · total ↓ · nombre) y, si
 * hay más, una sexta fila «Otras» que suma EXACTAMENTE el resto.
 */
export function recurrenceRows(
  recurrence: Pick<InternalRecurrenceResponse, 'categories' | 'buckets'>,
  top = RECURRENCE_TOP,
): RecurrenceRow[] {
  const visible = recurrence.categories.slice(0, top)
  const rest = recurrence.categories.slice(top)
  const rows: RecurrenceRow[] = visible.map((c) => ({
    id: c.id,
    name: c.name,
    others: 0,
    totalCreated: c.totalCreated,
    bucketsWithOccurrences: c.bucketsWithOccurrences,
    values: c.values,
  }))
  if (rest.length > 0) {
    const values = recurrence.buckets.map((bucket, i): number | null =>
      bucket.future ? null : rest.reduce((sum, c) => sum + (c.values.at(i) ?? 0), 0),
    )
    rows.push({
      id: 'otras',
      name: 'Otras',
      others: rest.length,
      totalCreated: rest.reduce((sum, c) => sum + c.totalCreated, 0),
      bucketsWithOccurrences: values.filter((v) => v !== null && v > 0).length,
      values,
    })
  }
  return rows
}

/** Intensidad 0..1 de una celda, relativa al máximo de la matriz visible. */
export function cellIntensity(value: number | null, max: number): number {
  if (value === null || value <= 0 || max <= 0) return 0
  return value / max
}

export function maxCell(rows: readonly RecurrenceRow[]): number {
  return Math.max(0, ...rows.flatMap((row) => row.values.map((v) => v ?? 0)))
}

/** «INTERNET · SEPTIEMBRE» + «4 problemas reportados de 10 internos registrados en septiembre». */
export function recurrenceCellTooltip(
  row: Pick<RecurrenceRow, 'name' | 'others'>,
  bucket: InternalRecurrenceBucket,
  kind: InternalRecurrenceBucketKind,
  value: number,
): { title: string; lines: string[] } {
  const where = bucketLongName(bucket, kind)
  const name = row.others > 0 ? `Otras (${countLabel(row.others, 'categoría', 'categorías')})` : row.name
  const total = bucket.total ?? 0
  return {
    title: `${name.toUpperCase()} · ${where.toUpperCase()}`,
    lines: [
      countLabel(value, 'problema reportado', 'problemas reportados'),
      `de ${countLabel(total, 'interno registrado', 'internos registrados')} en ${where}`,
    ],
  }
}

/* ───────────────────────── AFECTACIONES ACTIVAS ───────────────────────── */

/* ───────────── Tiempo activo y afectaciones (línea de vida) ─────────────
 * Cada fila = un INTERNAL activo FIABLE: línea desde su alta hasta el corte
 * y una ● por afectación CONOCIDA al corte (inclusión por registro), ubicada
 * en su ocurrencia. Todas las filas comparten UNA escala temporal.
 */

export const TIMELINE_TOP = 5

/**
 * Filas de la línea de vida: fiables en el orden del backend (afectaciones ↓
 * · severidad ↓ · edad ↓ · id). Si hay menos de 5 con afectaciones, completan
 * los de 0 en ese mismo orden (severidad ↓ · edad ↓). Legacy fuera.
 */
export function timelineSelection(rows: readonly InternalProblemRow[], top = TIMELINE_TOP): {
  rows: InternalProblemRow[]
  reliable: number
  legacy: number
} {
  const reliable = rows.filter((row) => row.historyReliable)
  return { rows: reliable.slice(0, top), reliable: reliable.length, legacy: rows.length - reliable.length }
}

export function legacyNote(legacy: number): string | null {
  if (legacy <= 0) return null
  return legacy === 1
    ? '1 activo anterior al registro de afectaciones no se muestra.'
    : `${legacy} activos anteriores al registro de afectaciones no se muestran.`
}

/** Días (fraccionarios) entre un instante y el corte de la lectura. */
export function daysBefore(iso: string, reference: Date): number {
  return Math.max(0, (reference.getTime() - new Date(iso).getTime()) / DAY)
}

export type TimelineScale = {
  mode: 'linear' | 'banded'
  /** Posición 0..1 (0 = izquierda / más antiguo, 1 = corte) de «hace d días». */
  at: (days: number) => number
  /** Marcas del eje común, en días antes del corte. */
  ticks: number[]
  /**
   * Fronteras de los tramos que usa `at` (días antes del corte, de 0 al
   * extremo izquierdo). Solo describen la escala; no cambian la posición.
   */
  edges: number[]
}

const BAND_STOPS = [0, 7, 14, 30, 60, 90, 180, 365, 730]
const NICE_WINDOWS = [7, 14, 21, 30, 45, 60, 90, 120, 180, 365, 730]

function niceUp(days: number): number {
  return NICE_WINDOWS.find((w) => w >= days) ?? Math.ceil(days / 365) * 365
}

function linearScale(maxDays: number): TimelineScale {
  const domain = maxDays <= 7 ? 7 : niceUp(maxDays)
  const half = Math.round(domain / 2)
  return {
    mode: 'linear',
    at: (days) => 1 - Math.min(days, domain) / domain,
    ticks: half > 0 && half < domain ? [half, domain] : [domain],
    edges: domain <= 7 ? [0, domain] : [0, 7, domain],
  }
}

/**
 * Escala temporal COMÚN para las filas visibles.
 *   - Hasta 14 días: lineal (lectura directa).
 *   - Más: tramos de igual ancho 0–7 · 7–14 · 14–30 · 30–60 · 60–90 · 90–180 d
 *     (el último recortado al caso más antiguo), con sus fechas en el eje y una
 *     nota que lo dice: un caso de 90 d no aplasta a los recientes.
 *   Auditado en navegador frente a «lineal con corte (⫽)»: con 5 / 28 / 44 /
 *   97 d el corte no se activa y K (5 d · 3 afectaciones) quedaba en 26 px con
 *   las marcas superpuestas; por tramos ocupa 74 px y se lee.
 */
export function timelineScale(ages: readonly number[]): TimelineScale {
  const sorted = [...ages].sort((x, y) => y - x)
  const maxDays = Math.max(1, sorted[0] ?? 1)
  if (maxDays <= 14) return linearScale(maxDays)

  {
    // Tramos completos hasta el caso más antiguo; el último tramo se recorta
    // en proporción (sin espacio vacío a la izquierda).
    const full = BAND_STOPS.filter((stop) => stop < maxDays)
    const nextStop = BAND_STOPS.find((stop) => stop >= maxDays) ?? maxDays
    const lastWeight = (maxDays - full[full.length - 1]) / (nextStop - full[full.length - 1])
    const weights = full.slice(1).map(() => 1).concat(lastWeight)
    const total = weights.reduce((sum, w) => sum + w, 0)
    const edges = full.concat(maxDays)
    return {
      mode: 'banded',
      at: (days) => {
        const d = Math.min(Math.max(days, 0), maxDays)
        let i = 0
        while (i < edges.length - 2 && d > edges[i + 1]) i += 1
        const frac = (d - edges[i]) / (edges[i + 1] - edges[i])
        const before = weights.slice(0, i).reduce((sum, w) => sum + w, 0)
        return 1 - (before + frac * weights[i]) / total
      },
      ticks: full.slice(1),
      edges,
    }
  }
}

export type TimelineSegment = {
  /** Días antes del corte: borde derecho (reciente) e izquierdo (antiguo). */
  fromDays: number
  toDays: number
  /** «0–7 D» · «8–14 D» · «15–30 D» · «31–60 D» · «60+ D». */
  label: string
  /** Posiciones 0..1 (izquierda / derecha) en la escala común. */
  left: number
  right: number
}

/**
 * Tramos VISIBLES de la escala, de izquierda (pasado) a derecha (HOY). Un tramo demasiado
 * estrecho para su rótulo (p. ej. 90–91 d) se funde con el anterior y este
 * pasa a leerse «N+ D»: la frontera matemática sigue existiendo, solo no se
 * rotula. `minWidth` en fracción del ancho.
 */
export function timelineSegments(scale: TimelineScale, minWidth = 0.08): TimelineSegment[] {
  const raw = scale.edges.slice(0, -1).map((from, i) => ({
    fromDays: from,
    toDays: scale.edges[i + 1],
    left: scale.at(scale.edges[i + 1]),
    right: scale.at(from),
  }))
  const merged: Array<Omit<TimelineSegment, 'label'> & { open: boolean }> = []
  for (const segment of raw) {
    const last = merged.at(-1)
    if (last && segment.right - segment.left < minWidth) {
      last.toDays = segment.toDays
      last.left = segment.left
      last.open = true
      continue
    }
    merged.push({ ...segment, open: false })
  }
  const isLastOpen = (index: number) =>
    index === merged.length - 1 && scale.mode === 'banded' && (merged[index].open || index > 0)
  // De izquierda (pasado) a derecha (HOY), como se leen.
  return merged
    .map((segment, index) => ({
    fromDays: segment.fromDays,
    toDays: segment.toDays,
    left: segment.left,
    right: segment.right,
    label:
      segment.fromDays === 0
        ? `0–${Math.round(segment.toDays)} D`
        : isLastOpen(index)
          ? `${segment.fromDays}+ D`
          : `${segment.fromDays + 1}–${Math.round(segment.toDays)} D`,
    }))
    .reverse()
}

export type MarkPlacement = {
  /** Índice de la afectación en el arreglo recibido. */
  index: number
  /** Desplazamiento vertical (px) para separar marcas casi coincidentes. */
  dy: number
  /** >1 = marcas que caen en el MISMO punto: se dibuja una con «×N». */
  count: number
  /** false = absorbida por la anterior (misma posición). */
  visible: boolean
}

/**
 * Coloca las ● sin mover su fecha: si dos quedan a menos de `minGap` px,
 * la siguiente se desplaza alternando arriba / abajo; si caen en el mismo
 * punto (< 1.5 px) se agrupan con «×N».
 */
export function layoutMarks(xs: readonly number[], minGap = 11, offset = 6): MarkPlacement[] {
  const order = xs.map((x, index) => ({ x, index })).sort((a, b) => a.x - b.x || a.index - b.index)
  const out: MarkPlacement[] = xs.map((_, index) => ({ index, dy: 0, count: 1, visible: true }))
  let anchor: { x: number; index: number } | null = null
  let previousX: number | null = null
  let cluster = 0
  for (const item of order) {
    if (anchor && Math.abs(item.x - anchor.x) < 1.5) {
      out[anchor.index].count += 1
      out[item.index].visible = false
      continue
    }
    cluster = previousX !== null && item.x - previousX < minGap ? cluster + 1 : 0
    // Patrón dentro de un grupo cercano: 0 · arriba · abajo · arriba…
    out[item.index].dy = cluster === 0 ? 0 : cluster % 2 === 1 ? -offset : offset
    previousX = item.x
    anchor = item
  }
  return out
}

/** Severidad · edad · afectaciones como UNA lectura secundaria. */
export function timelineMeta(row: InternalProblemRow): string {
  return `${severityPath(row)} · ${timelineFacts(row)}`
}

/** «6 OCT · 16:30» en Bogotá. */
export function formatMarkDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${Number(get('day'))} ${MONTHS.at(Number(get('month')) - 1)} · ${get('hour')}:${get('minute')}`
}

/** «29 SEP» (Bogotá) de un instante. */
export function formatMarkDay(iso: string): string {
  return formatMarkDateTime(iso).split(' · ')[0]
}

/** «29 SEP» del día que queda d días antes del corte. */
export function dayBefore(reference: Date, days: number): string {
  return formatMarkDay(new Date(reference.getTime() - days * DAY).toISOString())
}

/** Hechos al extremo derecho: «8 d · 5 afectaciones» · «hoy · sin afectaciones». */
export function timelineFacts(row: Pick<InternalProblemRow, 'ageDays' | 'consequenceCountAtCut'>): string {
  const count =
    row.consequenceCountAtCut === 0
      ? 'sin afectaciones'
      : countLabel(row.consequenceCountAtCut, 'afectación', 'afectaciones')
  return `${formatAge(row.ageDays)} · ${count}`
}

/** Tooltip de una ●: ocurrencia, extracto, registro y severidad de entonces. */
/**
 * Tooltip de una ●, en este orden: texto de la afectación (su extracto: no hay
 * un «nombre» formal), fecha de ocurrencia, fecha de registro solo si es
 * distinta (otro minuto) y severidad vigente en ese momento.
 */
export function markTooltip(mark: InternalConsequenceMark): { title: string; lines: string[] } {
  const occurred = formatMarkDateTime(mark.occurredAt)
  const registered = formatMarkDateTime(mark.createdAt)
  return {
    title: `${mark.preview}${mark.truncated ? '…' : ''}`,
    lines: [
      occurred,
      registered !== occurred ? `Registrada: ${registered}` : null,
      `Severidad en ese momento: ${SEVERITY_LABEL[mark.severityAtOccurrence]}`,
    ].filter((line): line is string => line !== null),
  }
}

/** Tooltip del problema (nombre o línea). */
export function problemTooltip(row: InternalProblemRow): { title: string; lines: string[] } {
  return {
    title: row.title,
    lines: [
      row.category?.name ?? 'Sin categoría',
      severityPath(row),
      formatAgeLong(row.ageDays),
      SLA_TOOLTIP[row.slaAtCut],
      row.consequenceCountAtCut === 0
        ? 'Sin afectaciones registradas'
        : countLabel(row.consequenceCountAtCut, 'afectación registrada', 'afectaciones registradas'),
    ].filter((line): line is string => line !== null),
  }
}

/* ───────────────────────────── Miga temporal ───────────────────────────── */

const MONTH_LONG_UPPER = MONTHS_LONG.map((m) => m.toUpperCase())

/** «H2 2026» · «SEPTIEMBRE» · «14–20 SEP» (misma lectura que el Flujo). */
export function periodCrumbLabel(period: {
  kind: string
  from: string
  calendarEnd: string
  navigationContext: { year: number; half?: 1 | 2 }
}): string {
  const from = ymdParts(period.from)
  const end = ymdParts(period.calendarEnd)
  if (period.kind === 'cycle') {
    return `H${period.navigationContext.half ?? 1} ${period.navigationContext.year}`
  }
  if (period.kind === 'month') return MONTH_LONG_UPPER.at(from.month - 1) ?? ''
  return from.month === end.month
    ? `${from.day}–${end.day} ${MONTHS.at(end.month - 1)}`
    : `${from.day} ${MONTHS.at(from.month - 1)} – ${end.day} ${MONTHS.at(end.month - 1)}`
}
