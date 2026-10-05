/**
 * Periodo anterior equivalente al rango actual (misma longitud de buckets).
 * Semana/mes/ciclo alineados a America/Bogota.
 */

import {
  bogotaTodayYmd,
  type HistoryRangeGranularity,
} from '@/modules/operational-cards/utils/kpi-history-range'

const COLOMBIA_OFFSET = '-05:00'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function parseYmd(ymd: string): { year: number; monthIndex: number; day: number } {
  const [year, month, day] = ymd.split('-').map(Number)
  return { year, monthIndex: month - 1, day }
}

function formatYmd(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

function addDaysYmd(ymd: string, delta: number): string {
  const instant = new Date(`${ymd}T12:00:00${COLOMBIA_OFFSET}`)
  instant.setTime(instant.getTime() + delta * 24 * 60 * 60 * 1000)
  return bogotaTodayYmd(instant)
}

function daysBetweenInclusive(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00${COLOMBIA_OFFSET}`).getTime()
  const b = new Date(`${to}T12:00:00${COLOMBIA_OFFSET}`).getTime()
  return Math.round((b - a) / (24 * 60 * 60 * 1000)) + 1
}

function monthsBetween(from: string, to: string): number {
  const a = parseYmd(from)
  const b = parseYmd(to)
  return (b.year - a.year) * 12 + (b.monthIndex - a.monthIndex) + 1
}

/**
 * Rango inmediatamente anterior, misma longitud conceptual.
 * El `to` del anterior es el día previo al `from` actual.
 */
export function buildPreviousHistoryRange(
  current: { from: string; to: string },
  granularity: HistoryRangeGranularity,
): { from: string; to: string } {
  const previousTo = addDaysYmd(current.from, -1)

  if (granularity === 'week') {
    const span = daysBetweenInclusive(current.from, current.to)
    return {
      from: addDaysYmd(previousTo, -(span - 1)),
      to: previousTo,
    }
  }

  if (granularity === 'month') {
    const count = monthsBetween(current.from, current.to)
    const end = parseYmd(previousTo)
    let fromYear = end.year
    let fromMonth = end.monthIndex - (count - 1)
    while (fromMonth < 0) {
      fromMonth += 12
      fromYear -= 1
    }
    return {
      from: formatYmd(fromYear, fromMonth, 1),
      to: previousTo,
    }
  }

  // cycle: desplazar el mismo número de semestres
  const fromParts = parseYmd(current.from)
  const toParts = parseYmd(current.to)
  const fromHalf = fromParts.monthIndex <= 5 ? 1 : 2
  const toHalf = toParts.monthIndex <= 5 ? 1 : 2
  const cycleCount =
    (toParts.year - fromParts.year) * 2 + (toHalf - fromHalf) + 1

  const endHalf = parseYmd(previousTo).monthIndex <= 5 ? 1 : 2
  let year = parseYmd(previousTo).year
  let half = endHalf
  for (let i = 1; i < cycleCount; i += 1) {
    if (half === 1) {
      half = 2
      year -= 1
    } else {
      half = 1
    }
  }
  return {
    from: half === 1 ? formatYmd(year, 0, 1) : formatYmd(year, 6, 1),
    to: previousTo,
  }
}

/** true si `to` no cae en el fin natural del bucket (semana/mes/ciclo). */
export function isIncompleteCurrentPeriod(
  to: string,
  granularity: HistoryRangeGranularity,
  now: Date = new Date(),
): boolean {
  const today = bogotaTodayYmd(now)
  if (to !== today) return false
  const { monthIndex, day } = parseYmd(to)
  if (granularity === 'week') {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      weekday: 'short',
    }).format(new Date(`${to}T12:00:00${COLOMBIA_OFFSET}`))
    return weekday !== 'Sun'
  }
  if (granularity === 'month') {
    const lastDay = new Date(Date.UTC(parseYmd(to).year, monthIndex + 1, 0)).getUTCDate()
    return day !== lastDay
  }
  // ciclo: incompleto si no es 30 jun ni 31 dic
  return !(monthIndex === 5 && day === 30) && !(monthIndex === 11 && day === 31)
}

export function formatCaseDelta(delta: number): string {
  if (delta === 0) return '0'
  if (delta > 0) return `+${delta}`
  return `${delta}`
}

export function summarizeSeries(
  series: readonly { value: number }[],
): { current: number; min: number; max: number; first: number } | null {
  if (series.length === 0) return null
  const values = series.map((point) => point.value)
  return {
    current: values[values.length - 1] ?? 0,
    min: Math.min(...values),
    max: Math.max(...values),
    first: values[0] ?? 0,
  }
}
