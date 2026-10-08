import { resolutionFixture } from '../src/modules/operational-cards/charts/resolucion.fixture'

/**
 * Mock de GET /operational-kpis/state para E2E con la MISMA geometría de
 * buckets que el backend (buildEstadoFlowSlots):
 * - cycle → 6 meses; month → semanas lun–dom recortadas al mes;
 *   week → 7 días. Los posteriores a dataTo son futuros (valores null).
 * - calendarStart/calendarEnd = unidad completa (drill-down).
 */

const DAY = 86_400_000
const toMs = (ymd: string) => Date.parse(`${ymd}T12:00:00Z`)
const toYmd = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const addDays = (ymd: string, n: number) => toYmd(toMs(ymd) + n * DAY)
const minYmd = (a: string, b: string) => (a < b ? a : b)
const maxYmd = (a: string, b: string) => (a > b ? a : b)
const mondayOf = (ymd: string) => {
  const weekday = new Date(toMs(ymd)).getUTCDay()
  return addDays(ymd, weekday === 0 ? -6 : 1 - weekday)
}
const lastOfMonth = (ymd: string) => {
  const [y, m] = ymd.split('-').map(Number)
  return toYmd(Date.UTC(y, m, 0, 12))
}

export type FlowQuery = {
  coordinationId: string
  kind: 'week' | 'month' | 'cycle'
  from: string
  to: string
  calendarEnd: string
}

const CATEGORIES = [
  { categoryId: 'a1000000-0000-4000-8000-000000000001', categoryCode: 'internet', categoryName: 'Internet', selectable: true },
  { categoryId: 'a1000000-0000-4000-8000-000000000002', categoryCode: 'acas', categoryName: 'ACAS', selectable: true },
  { categoryId: 'a1000000-0000-4000-8000-000000000003', categoryCode: 'aplicativos', categoryName: 'Aplicativos', selectable: true },
  { categoryId: 'a1000000-0000-4000-8000-000000000004', categoryCode: 'infraestructura', categoryName: 'Infraestructura', selectable: true },
  { categoryId: 'a1000000-0000-4000-8000-000000000005', categoryCode: 'equipos', categoryName: 'Equipos', selectable: true },
  { categoryId: '00000000-0000-4000-8000-000000000099', categoryCode: 'UNCATEGORIZED', categoryName: 'Sin categoría', selectable: false },
]

export type FixtureCoordination = { id: string; code: string; shortName: string }

/** Reparte n en pesos (orden estable) y devuelve filas count DESC, nombre ASC. */
function distribute<T extends { name: string }>(n: number, items: T[], weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0)
  const counts = weights.map((w) => Math.floor((n * w) / total))
  let rest = n - counts.reduce((a, b) => a + b, 0)
  for (let i = 0; rest > 0; i = (i + 1) % counts.length, rest -= 1) counts[i] += 1
  return items
    .map((item, i) => ({ item, count: counts[i] }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.item.name.localeCompare(b.item.name, 'es'))
}

/**
 * Carga activa determinista. Ciclo H2 de B2B: OCT = 12 activos
 * (7 internos: Internet 3, ACAS 2, Aplicativos 1, Infraestructura 1;
 *  5 externos: Saber Pro 2, Servicios 2, Especializaciones 1), 4 solucionados.
 */
function loadFor(
  slot: { start: string },
  kind: FlowQuery['kind'],
  seed: number,
  partners: FixtureCoordination[],
) {
  const month = Number(slot.start.slice(5, 7))
  const day = Number(slot.start.slice(8, 10))
  const scale = kind === 'cycle' ? 1 : kind === 'month' ? 0.8 : 0.6
  const baseInternal = { 7: 4, 8: 6, 9: 8, 10: 7 }[month] ?? 5
  const baseExternal = { 7: 2, 8: 3, 9: 4, 10: 5 }[month] ?? 3
  const wobble = kind === 'cycle' ? 0 : (day % 3) - 1
  const internal = Math.max(0, Math.round(baseInternal * scale) + wobble + (seed % 2))
  const external = Math.max(0, Math.round(baseExternal * scale) - (wobble > 0 ? 1 : 0))
  const solved = kind === 'cycle' ? ({ 7: 3, 8: 5, 9: 6, 10: 4 }[month] ?? 2) : Math.max(0, (day % 4) - 1)
  const categories = CATEGORIES.map((c) => ({ ...c, name: c.categoryName }))
  const internalBreakdown = distribute(internal, categories, [3, 2, 1, 1, 0.4, 0.2]).map(
    ({ item, count }) => ({
      categoryId: item.categoryId,
      categoryCode: item.categoryCode,
      categoryName: item.categoryName,
      selectable: item.selectable,
      count,
    }),
  )
  const coordinationItems = partners.map((p) => ({ ...p, name: p.shortName }))
  const externalBreakdown = distribute(external, coordinationItems, [2, 2, 1]).map(
    ({ item, count }) => ({
      coordinationId: item.id,
      coordinationCode: item.code,
      coordinationName: item.shortName,
      count,
    }),
  )
  return {
    active: {
      total: internal + external,
      internal,
      external,
      internalBreakdown,
      externalBreakdown,
    },
    solved: { total: solved },
  }
}

/** Valores deterministas por bucket (varían con la fecha y la coordinación). */
function valuesFor(start: string, seed: number) {
  const n = Number(start.slice(8, 10)) + Number(start.slice(5, 7)) * 3 + seed
  return { created: (n % 5) + 1, closed: (n * 7) % 4, backlog: 4 + (n % 6) }
}

/**
 * ANTIGÜEDAD QA: edades bien distintas al corte (A 63 · B 43 · C 31 · D 18 ·
 * E 9 · F 3 · G hoy) y relleno joven si hay más activos. Cuadra por
 * construcción con Carga: activeCount = active.total del último bucket no
 * futuro. Histórico: sin status ni SLA; B «solucionado después».
 */
const AGING_ROWS = [
  { title: 'Falla en matrícula de nuevos ingresos', age: 63, severity: 'LOW', kind: 'INTERNAL', category: 'Internet', status: 'OPEN' },
  { title: 'Entrega de actas pendiente con la coordinación aliada', age: 43, severity: 'CRITICAL', kind: 'INTER_COORDINATION', category: null, status: 'IN_PROGRESS' },
  { title: 'Intermitencia en el aula virtual de posgrado', age: 31, severity: 'MEDIUM', kind: 'INTERNAL', category: 'Aplicativos', status: 'IN_PROGRESS' },
  { title: 'Convenio empresarial sin firma', age: 18, severity: 'HIGH', kind: 'INTERNAL', category: null, status: 'OPEN' },
  { title: 'Reporte de notas incompleto', age: 9, severity: 'MEDIUM', kind: 'INTER_COORDINATION', category: null, status: 'OPEN' },
  { title: 'Equipos de laboratorio sin mantenimiento', age: 3, severity: 'LOW', kind: 'INTERNAL', category: 'Equipos', status: 'OPEN' },
  { title: 'Cambio de horario no publicado', age: 0, severity: 'MEDIUM', kind: 'INTERNAL', category: 'ACAS', status: 'OPEN' },
] as const

const SLA_DAYS = { CRITICAL: 1, HIGH: 3, MEDIUM: 7, LOW: 14 } as const

/**
 * Perfil QA de la coordinación: `stale` = carga muy envejecida (>31 d);
 * `empty` = sin activos en ningún corte (Carga en 0 y aging vacío, cuadrados).
 */
export type AgingProfile = 'default' | 'stale' | 'empty'

function agingFor(
  at: string,
  isNow: boolean,
  activeCount: number,
  partners: FixtureCoordination[],
  today: string,
  profile: AgingProfile,
  seed = 0,
) {
  // Cada coordinación (seed) envejece distinto: la lámina cambia con la carta.
  const shift = profile === 'stale' ? 0 : (seed * 7) % 11
  // «Solucionado después»: 3 días tras el corte, nunca después de hoy.
  const closedAfter = new Date(
    Math.min(Date.parse(`${at}T15:00:00-05:00`) + 3 * DAY, Date.parse(`${today}T09:00:00-05:00`)),
  ).toISOString()
  const filler = Array.from({ length: Math.max(0, activeCount - AGING_ROWS.length) }, (_, i) => ({
    ...AGING_ROWS[6],
    title: `Problema activo ${i + 1}`,
    age: profile === 'stale' ? 34 + i * 5 : (i % 6) + 1,
  }))
  // «stale»: carga envejecida, casi todo por encima de 31 días.
  const STALE_AGES = [118, 97, 84, 76, 63, 4, 49]
  const base =
    profile === 'stale'
      ? AGING_ROWS.map((row, i) => ({ ...row, age: STALE_AGES[i] }))
      : AGING_ROWS.map((row) => ({ ...row, age: row.age + shift }))
  const rows = [...base.slice(0, activeCount), ...filler]
  const ages = rows.map((row) => row.age).sort((a, b) => a - b)
  const n = ages.length
  const band = (lo: number, hi: number) => ages.filter((a) => a >= lo && a <= hi).length
  const createdAt = (age: number) => new Date(Date.parse(`${at}T10:00:00-05:00`) - age * DAY).toISOString()
  // Orden del contrato: created_at ASC (= edad DESC), id ASC.
  const ranked = rows
    .map((row, index) => ({ row, id: `f0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` }))
    .sort((a, b) => b.row.age - a.row.age || a.id.localeCompare(b.id))
  return {
    semantics: 'active-at-cut-age-since-created',
    at,
    isNow,
    reliability: isNow
      ? { status: 'current', sla: 'current' }
      : { status: 'unavailable', sla: 'unavailable' },
    severitySemantics: 'current-severity',
    activeCount,
    medianAgeDays: n === 0 ? null : n % 2 ? ages[(n - 1) / 2] : (ages[n / 2 - 1] + ages[n / 2]) / 2,
    bands: [
      { key: '0-7', count: band(0, 7) },
      { key: '8-14', count: band(8, 14) },
      { key: '15-30', count: band(15, 30) },
      { key: '31+', count: band(31, Infinity) },
    ],
    oldest: ranked.slice(0, 5).map(({ row, id }, index) => {
      const internal = row.kind === 'INTERNAL'
      const partner = partners[index % Math.max(1, partners.length)]
      return {
        id,
        title: row.title,
        createdAt: createdAt(row.age),
        ageDays: row.age,
        severity: row.severity,
        reportKind: row.kind,
        categoryName: internal ? (row.category ?? 'Sin categoría') : null,
        affectedCoordinationName: internal ? null : (partner?.shortName ?? 'Servicios'),
        status: isNow ? row.status : null,
        slaOverdue: isNow ? row.age > SLA_DAYS[row.severity] : null,
        closedAfterCutAt:
          !isNow && index === 1 ? closedAfter : null,
      }
    }),
  }
}

/**
 * SNAPSHOT AT CUT coherente con el aging del mismo corte: misma población
 * (activeCount), severidad repartida de forma determinista y atención con
 * «solucionados después» en cortes históricos (reliability honesta).
 */
function snapshotFor(aging: ReturnType<typeof agingFor>) {
  const n = aging.activeCount
  const critical = n >= 4 ? 1 : 0
  const high = Math.floor((n - critical) / 3)
  const low = Math.floor((n - critical - high) / 2)
  const medium = n - critical - high - low
  const closedAfterCut = aging.isNow
    ? 0
    : aging.oldest.filter((item) => item.closedAfterCutAt !== null).length
  const still = n - closedAfterCut
  const inProgress = Math.floor(still / 2)
  return {
    semantics: 'active-at-cut',
    at: aging.at,
    isNow: aging.isNow,
    activeCount: n,
    severity: { low, medium, high, critical },
    attention: { open: still - inProgress, inProgress, closedAfterCut, unclassified: 0 },
    reliability: aging.isNow
      ? { severity: 'exact', attention: 'exact' }
      : { severity: 'current-value', attention: 'current-value' },
  }
}

export function flowStateResponse(
  query: FlowQuery,
  today: string,
  seed = 0,
  partners: FixtureCoordination[] = [],
  profile: AgingProfile = 'default',
) {
  const { kind, from, to, calendarEnd } = query
  const slots: Array<{ start: string; end: string; calendarStart: string; calendarEnd: string }> = []
  if (kind === 'week') {
    for (let d = from; d <= calendarEnd; d = addDays(d, 1)) {
      slots.push({ start: d, end: d, calendarStart: d, calendarEnd: d })
    }
  } else if (kind === 'month') {
    for (let monday = mondayOf(from); monday <= calendarEnd; monday = addDays(monday, 7)) {
      const sunday = addDays(monday, 6)
      slots.push({
        start: maxYmd(monday, from),
        end: minYmd(sunday, calendarEnd),
        calendarStart: monday,
        calendarEnd: sunday,
      })
    }
  } else {
    for (let first = from; first <= calendarEnd; first = addDays(lastOfMonth(first), 1)) {
      slots.push({ start: first, end: lastOfMonth(first), calendarStart: first, calendarEnd: lastOfMonth(first) })
    }
  }
  const buckets = slots.map((slot) => {
    const future = slot.start > to
    const values = future ? null : valuesFor(slot.start, seed)
    return {
      ...slot,
      dataEnd: future ? null : minYmd(slot.end, to),
      label: slot.start,
      current: slot.start <= today && today <= slot.end,
      future,
      created: values ? values.created : null,
      closed: values ? values.closed : null,
      backlog: values ? values.backlog : null,
      ...(future
        ? { active: null, solved: null }
        : profile === 'empty'
          ? {
              active: { total: 0, internal: 0, external: 0, internalBreakdown: [], externalBreakdown: [] },
              solved: { total: 0 },
            }
          : loadFor(slot, kind, seed, partners)),
    }
  })
  const known = buckets.filter((b) => !b.future)
  const isPartial = to < calendarEnd
  const aging = agingFor(to, to === today, known.at(-1)?.active?.total ?? 0, partners, today, profile, seed)
  return {
    scope: { type: 'coordination', coordinationId: query.coordinationId },
    timezone: 'America/Bogota',
    period: {
      kind,
      from,
      to,
      calendarEnd,
      label: `${from} – ${calendarEnd}`,
      isCurrent: from <= today && today <= calendarEnd,
      isPartial,
      dataTo: to,
    },
    relations: { dependencies: 2, commitments: 3 },
    evolution: {
      bucket: kind === 'week' ? 'day' : kind === 'month' ? 'week' : 'month',
      backlog: known.map((b) => ({ start: b.start, end: b.dataEnd, label: b.label, value: b.backlog })),
      created: known.map((b) => ({ start: b.start, end: b.dataEnd, label: b.label, value: b.created })),
      closed: known.map((b) => ({ start: b.start, end: b.dataEnd, label: b.label, value: b.closed })),
      buckets,
    },
    activeAtPeriodEnd: {
      count: known.at(-1)?.backlog ?? 0,
      at: to,
      isNow: to === today,
    },
    aging,
    snapshot: snapshotFor(aging),
    // Resolución: los mismos cierres que «Solucionados» (cuadra por construcción).
    resolution: resolutionFixture(buckets, seed),
  }
}
