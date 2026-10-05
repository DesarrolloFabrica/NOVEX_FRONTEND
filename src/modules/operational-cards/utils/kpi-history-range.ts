/**
 * Rangos por defecto para el histórico KPI (fechas civiles Bogotá).
 * Semana = lunes–domingo; mes = calendario; ciclo = H1/H2.
 */

const COLOMBIA_OFFSET = '-05:00'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function bogotaTodayYmd(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
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

function bogotaWeekday(ymd: string): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    weekday: 'short',
  }).format(new Date(`${ymd}T12:00:00${COLOMBIA_OFFSET}`))
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[label] ?? 0
}

function mondayOf(ymd: string): string {
  const weekday = bogotaWeekday(ymd)
  const offset = weekday === 0 ? -6 : 1 - weekday
  return addDaysYmd(ymd, offset)
}

export type HistoryRangeGranularity = 'week' | 'month' | 'cycle'

export function buildDefaultHistoryRange(
  granularity: HistoryRangeGranularity,
  now: Date = new Date(),
): { from: string; to: string } {
  const today = bogotaTodayYmd(now)
  if (granularity === 'week') {
    const thisMonday = mondayOf(today)
    return {
      from: addDaysYmd(thisMonday, -7 * 11),
      to: today,
    }
  }
  if (granularity === 'month') {
    const { year, monthIndex } = parseYmd(today)
    let fromYear = year
    let fromMonth = monthIndex - 11
    while (fromMonth < 0) {
      fromMonth += 12
      fromYear -= 1
    }
    return {
      from: formatYmd(fromYear, fromMonth, 1),
      to: today,
    }
  }
  const { year, monthIndex } = parseYmd(today)
  const half = monthIndex <= 5 ? 1 : 2
  if (half === 1) {
    return {
      from: formatYmd(year - 1, 6, 1),
      to: today,
    }
  }
  return {
    from: formatYmd(year - 1, 0, 1),
    to: today,
  }
}
