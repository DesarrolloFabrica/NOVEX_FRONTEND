import type {
  OperationalKpiAging,
  OperationalKpiAgingItem,
  OperationalKpiStateSnapshot,
} from '@/modules/operational-cards/types/operational-kpi.types'

const DAY = 86_400_000

/** Instante ISO de un registro hecho `ageDays` antes de `at` (10:00 Bogotá). */
function createdAtFor(at: string, ageDays: number): string {
  return new Date(Date.parse(`${at}T10:00:00-05:00`) - ageDays * DAY).toISOString()
}

/** Ranking QA: A 63 · B 43 · C 31 · D 18 · E 9 · F 3 · G hoy. */
export const QA_AGING_ROWS: ReadonlyArray<{
  title: string
  ageDays: number
  severity: OperationalKpiAgingItem['severity']
  reportKind: OperationalKpiAgingItem['reportKind']
  categoryName: string | null
  affectedCoordinationName: string | null
  status: 'OPEN' | 'IN_PROGRESS'
}> = [
  { title: 'Falla en matrícula de nuevos ingresos', ageDays: 63, severity: 'LOW', reportKind: 'INTERNAL', categoryName: 'Admisiones', affectedCoordinationName: null, status: 'OPEN' },
  { title: 'Entrega de actas pendiente para Saber Pro', ageDays: 43, severity: 'CRITICAL', reportKind: 'INTER_COORDINATION', categoryName: null, affectedCoordinationName: 'Saber Pro', status: 'IN_PROGRESS' },
  { title: 'Intermitencia en el aula virtual de posgrado', ageDays: 31, severity: 'MEDIUM', reportKind: 'INTERNAL', categoryName: 'Internet', affectedCoordinationName: null, status: 'IN_PROGRESS' },
  { title: 'Convenio empresarial sin firma', ageDays: 18, severity: 'HIGH', reportKind: 'INTERNAL', categoryName: null, affectedCoordinationName: null, status: 'OPEN' },
  { title: 'Reporte de notas incompleto', ageDays: 9, severity: 'MEDIUM', reportKind: 'INTER_COORDINATION', categoryName: null, affectedCoordinationName: 'Servicios', status: 'OPEN' },
  { title: 'Equipos de laboratorio sin mantenimiento', ageDays: 3, severity: 'LOW', reportKind: 'INTERNAL', categoryName: 'Equipos', affectedCoordinationName: null, status: 'OPEN' },
  { title: 'Cambio de horario no publicado', ageDays: 0, severity: 'MEDIUM', reportKind: 'INTERNAL', categoryName: 'ACAS', affectedCoordinationName: null, status: 'OPEN' },
]

/**
 * `aging` coherente con el contrato: top 5 más antiguos (created ASC),
 * status/SLA solo si isNow, «solucionado después» opcional en históricos.
 */
export function agingFixture({
  at,
  isNow,
  activeCount = QA_AGING_ROWS.length,
  closedAfterCut = {},
}: {
  at: string
  isNow: boolean
  activeCount?: number
  /** Índice del ranking → ISO de cierre posterior al corte (solo históricos). */
  closedAfterCut?: Record<number, string>
}): OperationalKpiAging {
  const rows = QA_AGING_ROWS.slice(0, Math.min(activeCount, QA_AGING_ROWS.length))
  const ages = rows.map((row) => row.ageDays).sort((a, b) => a - b)
  const n = ages.length
  const median =
    n === 0 ? null : n % 2 === 1 ? ages[(n - 1) / 2] : (ages[n / 2 - 1] + ages[n / 2]) / 2
  const band = (lo: number, hi: number) => ages.filter((a) => a >= lo && a <= hi).length
  return {
    semantics: 'active-at-cut-age-since-created',
    at,
    isNow,
    reliability: isNow
      ? { status: 'current', sla: 'current' }
      : { status: 'unavailable', sla: 'unavailable' },
    severitySemantics: 'current-severity',
    activeCount,
    medianAgeDays: median,
    bands: [
      { key: '0-7', count: band(0, 7) },
      { key: '8-14', count: band(8, 14) },
      { key: '15-30', count: band(15, 30) },
      { key: '31+', count: band(31, Number.POSITIVE_INFINITY) },
    ],
    oldest: rows.slice(0, 5).map((row, index) => ({
      id: `f0000000-0000-4000-8000-00000000000${index + 1}`,
      title: row.title,
      createdAt: createdAtFor(at, row.ageDays),
      ageDays: row.ageDays,
      severity: row.severity,
      reportKind: row.reportKind,
      categoryName: row.reportKind === 'INTERNAL' ? (row.categoryName ?? 'Sin categoría') : null,
      affectedCoordinationName: row.affectedCoordinationName,
      status: isNow ? row.status : null,
      slaOverdue: isNow ? row.ageDays > 14 || (row.severity === 'CRITICAL' && row.ageDays > 1) : null,
      closedAfterCutAt: isNow ? null : (closedAfterCut[index] ?? null),
    })),
  }
}

/**
 * `snapshot` coherente con un `aging`: misma población (activeCount), mismo
 * corte y fiabilidad honesta. Severidad repartida de forma determinista; en
 * un corte histórico, los «solucionados después» del ranking se reflejan en
 * `closedAfterCut`.
 */
export function snapshotFixture(aging: OperationalKpiAging): OperationalKpiStateSnapshot {
  const n = aging.activeCount
  const critical = n >= 4 ? 1 : 0
  const high = Math.floor((n - critical) / 3)
  const low = Math.floor((n - critical - high) / 2)
  const medium = n - critical - high - low
  const closedAfterCut = aging.isNow
    ? 0
    : aging.oldest.filter((item) => item.closedAfterCutAt !== null).length
  const stillActive = n - closedAfterCut
  const inProgress = Math.floor(stillActive / 2)
  return {
    semantics: 'active-at-cut',
    at: aging.at,
    isNow: aging.isNow,
    activeCount: n,
    severity: { low, medium, high, critical },
    attention: {
      open: stillActive - inProgress,
      inProgress,
      closedAfterCut,
      unclassified: 0,
    },
    reliability: aging.isNow
      ? { severity: 'exact', attention: 'exact' }
      : { severity: 'current-value', attention: 'current-value' },
  }
}
