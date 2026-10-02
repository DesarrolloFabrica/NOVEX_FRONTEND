import type {
  HistoryPeriodKind,
  ProblemHistoryPeriod,
} from '@/modules/operational-cards/types/problem-history.types'

/**
 * Períodos de historial en calendario de Colombia (America/Bogota, UTC−5 fijo).
 * Semana = lunes–domingo; mes = calendario; ciclo = H1 ene–jun / H2 jul–dic.
 */

export const PROBLEM_HISTORY_PAGE_SIZE = 20
export const COLOMBIA_TZ = 'America/Bogota'
/** Offset fijo: Colombia no observa horario de verano. */
const COLOMBIA_OFFSET = '-05:00'

const MONTH_NAMES = [
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
] as const

const MONTH_TITLE = MONTH_NAMES.map(
  (name) => name.charAt(0).toUpperCase() + name.slice(1),
)

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatYmd(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

/** Partes de calendario «ahora» en Colombia. */
export function bogotaTodayParts(now = new Date()): {
  year: number
  monthIndex: number
  day: number
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const day = Number(parts.find((p) => p.type === 'day')?.value)
  return { year, monthIndex: month - 1, day }
}

/** Día de la semana 0=domingo … 6=sábado en Colombia. */
function bogotaWeekday(ymd: string): number {
  // Mediodía evita bordes al interpretar el día civil.
  const instant = new Date(`${ymd}T12:00:00${COLOMBIA_OFFSET}`)
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: COLOMBIA_TZ,
    weekday: 'short',
  }).format(instant)
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

function addDaysYmd(ymd: string, delta: number): string {
  const instant = new Date(`${ymd}T12:00:00${COLOMBIA_OFFSET}`)
  instant.setTime(instant.getTime() + delta * 24 * 60 * 60 * 1000)
  const parts = bogotaTodayParts(instant)
  return formatYmd(parts.year, parts.monthIndex, parts.day)
}

function daysInMonth(year: number, monthIndex: number): number {
  // Día 0 del mes siguiente = último día del mes.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function mondayOfWeekContaining(ymd: string): string {
  const weekday = bogotaWeekday(ymd)
  const offsetFromMonday = weekday === 0 ? -6 : 1 - weekday
  return addDaysYmd(ymd, offsetFromMonday)
}

function formatDayMonth(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number)
  return `${d} de ${MONTH_NAMES[m - 1]}`
}

function formatDayMonthYear(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return `${d} de ${MONTH_NAMES[m - 1]} de ${y}`
}

export function buildMonthPeriod(
  year: number,
  monthIndex: number,
): ProblemHistoryPeriod {
  const from = formatYmd(year, monthIndex, 1)
  const to = formatYmd(year, monthIndex, daysInMonth(year, monthIndex))
  const title = MONTH_TITLE[monthIndex]
  const lower = MONTH_NAMES[monthIndex]
  return {
    kind: 'month',
    key: `${year}-${pad2(monthIndex + 1)}`,
    from,
    to,
    label: `${title} de ${year}`,
    summaryPhrase: `en ${lower} de ${year}`,
  }
}

export function buildCyclePeriod(
  year: number,
  half: 1 | 2,
): ProblemHistoryPeriod {
  if (half === 1) {
    return {
      kind: 'cycle',
      key: `${year}-H1`,
      from: formatYmd(year, 0, 1),
      to: formatYmd(year, 5, 30),
      label: `Ciclo 1 · ${year} (enero–junio)`,
      summaryPhrase: `en el ciclo 1 de ${year} (enero–junio)`,
    }
  }
  return {
    kind: 'cycle',
    key: `${year}-H2`,
    from: formatYmd(year, 6, 1),
    to: formatYmd(year, 11, 31),
    label: `Ciclo 2 · ${year} (julio–diciembre)`,
    summaryPhrase: `en el ciclo 2 de ${year} (julio–diciembre)`,
  }
}

export function buildWeekPeriod(mondayYmd: string): ProblemHistoryPeriod {
  const sundayYmd = addDaysYmd(mondayYmd, 6)
  const [y] = mondayYmd.split('-').map(Number)
  // Clave estable: año-semana aproximada por el lunes.
  const weekKey = `W${mondayYmd}`
  const sameMonth =
    mondayYmd.slice(0, 7) === sundayYmd.slice(0, 7)
  const rangeLabel = sameMonth
    ? `${formatDayMonth(mondayYmd).replace(/ de .+$/, '')}–${formatDayMonthYear(sundayYmd)}`
    : `${formatDayMonth(mondayYmd)} – ${formatDayMonthYear(sundayYmd)}`
  // Más legible: «Semana del 22 al 28 de septiembre de 2026»
  const [, mMon, dMon] = mondayYmd.split('-').map(Number)
  const [, mSun, dSun] = sundayYmd.split('-').map(Number)
  let label: string
  if (mMon === mSun) {
    label = `Semana del ${dMon} al ${dSun} de ${MONTH_NAMES[mMon - 1]} de ${y}`
  } else {
    label = `Semana del ${dMon} de ${MONTH_NAMES[mMon - 1]} al ${dSun} de ${MONTH_NAMES[mSun - 1]} de ${y}`
  }
  return {
    kind: 'week',
    key: weekKey,
    from: mondayYmd,
    to: sundayYmd,
    label,
    summaryPhrase: `en la semana del ${rangeLabel}`,
  }
}

/** Mes calendario actual en Colombia (no «últimos 30 días»). */
export function defaultHistoryPeriod(now = new Date()): ProblemHistoryPeriod {
  const { year, monthIndex } = bogotaTodayParts(now)
  return buildMonthPeriod(year, monthIndex)
}

export function periodFromKey(
  kind: HistoryPeriodKind,
  key: string,
): ProblemHistoryPeriod | null {
  if (kind === 'month') {
    const match = /^(\d{4})-(\d{2})$/.exec(key)
    if (!match) return null
    return buildMonthPeriod(Number(match[1]), Number(match[2]) - 1)
  }
  if (kind === 'cycle') {
    const match = /^(\d{4})-H([12])$/.exec(key)
    if (!match) return null
    return buildCyclePeriod(Number(match[1]), Number(match[2]) as 1 | 2)
  }
  if (kind === 'week') {
    const match = /^W(\d{4}-\d{2}-\d{2})$/.exec(key)
    if (!match) return null
    return buildWeekPeriod(match[1])
  }
  return null
}

/**
 * Inicio inclusivo del día civil colombiano → ISO UTC.
 * El backend compara con `closedAt >= closedFrom`.
 */
export function colombiaDayStartIso(ymd: string): string {
  return new Date(`${ymd}T00:00:00.000${COLOMBIA_OFFSET}`).toISOString()
}

/**
 * Fin inclusivo del día civil colombiano → ISO UTC.
 * El backend compara con `closedAt <= closedTo` (inclusivo); no se usa
 * extremo exclusivo. Así el 30 de junio 23:59:59.999−05 queda en Ciclo 1
 * y el 1 de julio 00:00:00−05 abre el Ciclo 2.
 */
export function colombiaDayEndIso(ymd: string): string {
  return new Date(`${ymd}T23:59:59.999${COLOMBIA_OFFSET}`).toISOString()
}

export function isValidHistoryPeriod(period: ProblemHistoryPeriod): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period.from)) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period.to)) return false
  return period.from <= period.to
}

export function formatHistoryPeriodLabel(period: ProblemHistoryPeriod): string {
  return period.label
}

/** Meses del año para el selector. */
export function listMonthPeriods(year: number): ProblemHistoryPeriod[] {
  return Array.from({ length: 12 }, (_, monthIndex) =>
    buildMonthPeriod(year, monthIndex),
  )
}

/** Los dos ciclos del año. */
export function listCyclePeriods(year: number): ProblemHistoryPeriod[] {
  return [buildCyclePeriod(year, 1), buildCyclePeriod(year, 2)]
}

/**
 * Semanas (lun–dom) que intersectan el mes indicado.
 * Evita listar las ~52 semanas del año de golpe.
 */
export function listWeekPeriodsInMonth(
  year: number,
  monthIndex: number,
): ProblemHistoryPeriod[] {
  const first = formatYmd(year, monthIndex, 1)
  const last = formatYmd(year, monthIndex, daysInMonth(year, monthIndex))
  let monday = mondayOfWeekContaining(first)
  const weeks: ProblemHistoryPeriod[] = []
  while (monday <= last) {
    const week = buildWeekPeriod(monday)
    // Incluye la semana si solapa el mes.
    if (week.to >= first && week.from <= last) {
      weeks.push(week)
    }
    monday = addDaysYmd(monday, 7)
    if (weeks.length > 6) break
  }
  return weeks
}

export function summaryCountLabel(
  total: number | null | undefined,
  period: ProblemHistoryPeriod,
): string | null {
  if (typeof total !== 'number' || !Number.isFinite(total)) return null
  const noun = total === 1 ? 'problema cerrado' : 'problemas cerrados'
  return `${total} ${noun} ${period.summaryPhrase}`
}

export function emptyHistoryMessage(period: ProblemHistoryPeriod): string {
  return `No hay problemas cerrados en este período`
}

export function emptyHistoryHint(period: ProblemHistoryPeriod): string {
  return `Período: ${period.label}. Elija otro en «Período».`
}

/** Alias de compatibilidad con el servicio. */
export const localDayStartIso = colombiaDayStartIso
export const localDayEndIso = colombiaDayEndIso
