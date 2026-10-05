/**
 * Periodo de análisis de ESTADO: fechas explícitas (Bogotá), no solo granularidad.
 */

import {
  bogotaTodayParts,
  buildCyclePeriod,
  buildMonthPeriod,
  buildWeekPeriod,
  formatYmd,
  listCyclePeriods,
  listWeekPeriodsInMonth,
} from '@/modules/operational-cards/data/problemHistoryPeriod'

export type AnalysisPeriodKind = 'week' | 'month' | 'cycle'

export type AnalysisPeriod = {
  kind: AnalysisPeriodKind
  /** Inicio calendario inclusive YYYY-MM-DD */
  from: string
  /** Fin de datos inclusive (hoy si parcial) */
  to: string
  /** Fin calendario del periodo (domingo / fin de mes / fin de ciclo) */
  calendarEnd: string
  /** Rango corto visible: "29 SEP – 5 OCT 2026" */
  rangeLabel: string
  /** Nombre accesible completo */
  accessibleLabel: string
  /** Semana / Mes / Ciclo H1|H2 */
  kindLabel: string
  isCurrent: boolean
  isPartial: boolean
  navigationContext: {
    year: number
    month?: number
    half?: 1 | 2
  }
}

const MONTH_SHORT = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
] as const

const COLOMBIA_OFFSET = '-05:00'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function parseYmd(ymd: string): { year: number; monthIndex: number; day: number } {
  const [year, month, day] = ymd.split('-').map(Number)
  return { year, monthIndex: month - 1, day }
}

function addDaysYmd(ymd: string, delta: number): string {
  const instant = new Date(`${ymd}T12:00:00${COLOMBIA_OFFSET}`)
  instant.setTime(instant.getTime() + delta * 24 * 60 * 60 * 1000)
  const p = bogotaTodayParts(instant)
  return formatYmd(p.year, p.monthIndex, p.day)
}

function bogotaTodayYmd(now: Date = new Date()): string {
  const p = bogotaTodayParts(now)
  return formatYmd(p.year, p.monthIndex, p.day)
}

function minYmd(a: string, b: string): string {
  return a < b ? a : b
}

function formatRangeLabel(from: string, calendarEnd: string): string {
  const a = parseYmd(from)
  const b = parseYmd(calendarEnd)
  if (a.year === b.year && a.monthIndex === b.monthIndex) {
    return `${a.day} ${MONTH_SHORT[a.monthIndex]} – ${b.day} ${MONTH_SHORT[b.monthIndex]} ${b.year}`
  }
  if (a.year === b.year) {
    return `${a.day} ${MONTH_SHORT[a.monthIndex]} – ${b.day} ${MONTH_SHORT[b.monthIndex]} ${b.year}`
  }
  return `${a.day} ${MONTH_SHORT[a.monthIndex]} ${a.year} – ${b.day} ${MONTH_SHORT[b.monthIndex]} ${b.year}`
}

function withDataWindow(
  base: Omit<AnalysisPeriod, 'to' | 'isCurrent' | 'isPartial'>,
  now: Date = new Date(),
): AnalysisPeriod {
  const today = bogotaTodayYmd(now)
  const to = minYmd(base.calendarEnd, today)
  const isPartial = to < base.calendarEnd
  const isCurrent = base.from <= today && today <= base.calendarEnd
  return {
    ...base,
    to,
    isPartial,
    isCurrent,
  }
}

/** Default ESTADO: semana actual lun–dom (datos hasta hoy si incompleta). */
export function buildCurrentWeekPeriod(now: Date = new Date()): AnalysisPeriod {
  const today = bogotaTodayYmd(now)
  const week = buildWeekPeriod(
    // buildWeekPeriod expects monday; find monday of today
    (() => {
      const label = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota',
        weekday: 'short',
      }).format(new Date(`${today}T12:00:00${COLOMBIA_OFFSET}`))
      const map: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      }
      const weekday = map[label] ?? 0
      const offset = weekday === 0 ? -6 : 1 - weekday
      return addDaysYmd(today, offset)
    })(),
  )
  const { year, monthIndex } = parseYmd(week.from)
  return withDataWindow(
    {
      kind: 'week',
      from: week.from,
      calendarEnd: week.to,
      rangeLabel: formatRangeLabel(week.from, week.to),
      accessibleLabel: week.label,
      kindLabel: 'Semana',
      navigationContext: { year, month: monthIndex },
    },
    now,
  )
}

export function analysisPeriodFromWeek(
  mondayYmd: string,
  now: Date = new Date(),
): AnalysisPeriod {
  const week = buildWeekPeriod(mondayYmd)
  const { year, monthIndex } = parseYmd(
    // contexto de navegación: mes que contiene el jueves de la semana, o el to
    minYmd(addDaysYmd(mondayYmd, 3), week.to),
  )
  return withDataWindow(
    {
      kind: 'week',
      from: week.from,
      calendarEnd: week.to,
      rangeLabel: formatRangeLabel(week.from, week.to),
      accessibleLabel: week.label,
      kindLabel: 'Semana',
      navigationContext: { year, month: monthIndex },
    },
    now,
  )
}

export function analysisPeriodFromMonth(
  year: number,
  monthIndex: number,
  now: Date = new Date(),
): AnalysisPeriod {
  const month = buildMonthPeriod(year, monthIndex)
  return withDataWindow(
    {
      kind: 'month',
      from: month.from,
      calendarEnd: month.to,
      rangeLabel: formatRangeLabel(month.from, month.to),
      accessibleLabel: month.label,
      kindLabel: 'Mes',
      navigationContext: { year, month: monthIndex },
    },
    now,
  )
}

export function analysisPeriodFromCycle(
  year: number,
  half: 1 | 2,
  now: Date = new Date(),
): AnalysisPeriod {
  const cycle = buildCyclePeriod(year, half)
  return withDataWindow(
    {
      kind: 'cycle',
      from: cycle.from,
      calendarEnd: cycle.to,
      rangeLabel:
        half === 1
          ? `ENE – JUN ${year}`
          : `JUL – DIC ${year}`,
      accessibleLabel: `Ciclo H${half} · ${year}`,
      kindLabel: `Ciclo H${half}`,
      navigationContext: { year, half },
    },
    now,
  )
}

export function canNavigateNext(
  period: AnalysisPeriod,
  now: Date = new Date(),
): boolean {
  const today = bogotaTodayYmd(now)
  const next = shiftAnalysisPeriod(period, 1, now)
  // No periodos completamente futuros: next.from > today
  return next.from <= today
}

export function shiftAnalysisPeriod(
  period: AnalysisPeriod,
  direction: -1 | 1,
  now: Date = new Date(),
): AnalysisPeriod {
  if (period.kind === 'week') {
    const monday = addDaysYmd(period.from, direction * 7)
    return analysisPeriodFromWeek(monday, now)
  }
  if (period.kind === 'month') {
    const { year, monthIndex } = period.navigationContext
    let y = year
    let m = (monthIndex ?? 0) + direction
    while (m < 0) {
      m += 12
      y -= 1
    }
    while (m > 11) {
      m -= 12
      y += 1
    }
    return analysisPeriodFromMonth(y, m, now)
  }
  const half = period.navigationContext.half ?? 1
  let y = period.navigationContext.year
  let h = half + direction
  if (h < 1) {
    h = 2
    y -= 1
  } else if (h > 2) {
    h = 1
    y += 1
  }
  return analysisPeriodFromCycle(y, h as 1 | 2, now)
}

export function evolutionBucketOf(
  kind: AnalysisPeriodKind,
): 'day' | 'week' | 'month' {
  if (kind === 'week') return 'day'
  if (kind === 'month') return 'week'
  return 'month'
}

export function listWeeksInBrowseMonth(
  year: number,
  monthIndex: number,
): ReturnType<typeof listWeekPeriodsInMonth> {
  return listWeekPeriodsInMonth(year, monthIndex)
}

export function listCyclesInYear(year: number) {
  return listCyclePeriods(year)
}

export function browseMonthLabel(year: number, monthIndex: number): string {
  return buildMonthPeriod(year, monthIndex).label.toUpperCase()
}

export function shiftBrowseMonth(
  year: number,
  monthIndex: number,
  direction: -1 | 1,
): { year: number; monthIndex: number } {
  let y = year
  let m = monthIndex + direction
  while (m < 0) {
    m += 12
    y -= 1
  }
  while (m > 11) {
    m -= 12
    y += 1
  }
  return { year: y, monthIndex: m }
}

export function isSameAnalysisPeriod(a: AnalysisPeriod, b: AnalysisPeriod): boolean {
  return a.kind === b.kind && a.from === b.from && a.calendarEnd === b.calendarEnd
}

/** Periodo cuyo inicio es estrictamente posterior a hoy (no seleccionable). */
export function isPeriodFullyFuture(
  fromYmd: string,
  now: Date = new Date(),
): boolean {
  return fromYmd > bogotaTodayYmd(now)
}

export function monthsInCycleHalf(half: 1 | 2): number[] {
  return half === 1 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11]
}

export { bogotaTodayYmd, formatYmd, pad2, MONTH_SHORT }
