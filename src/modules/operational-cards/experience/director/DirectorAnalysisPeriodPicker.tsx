import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import {
  analysisPeriodFromCycle,
  analysisPeriodFromMonth,
  analysisPeriodFromWeek,
  bogotaTodayYmd,
  buildCurrentCyclePeriod,
  buildCurrentWeekPeriod,
  canNavigateNext,
  containingCyclePeriod,
  cycleHalfOf,
  formatYmd,
  isPeriodFullyFuture,
  listWeeksInBrowseMonth,
  MONTH_SHORT,
  monthsInCycleHalf,
  refreshAnalysisPeriod,
  shiftAnalysisPeriod,
  type AnalysisPeriod,
} from '@/modules/operational-cards/domain/analysis-period'
import { bogotaTodayParts } from '@/modules/operational-cards/data/problemHistoryPeriod'
import '@/styles/director-kpi-panel.css'

type DrillLevel = 'cycle' | 'month' | 'week'

type DrillState = {
  level: DrillLevel
  year: number
  half: 1 | 2
  monthIndex: number
  direction: 1 | -1
}

const MONTH_LONG = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

/**
 * Un «ciclo» de ESTADO es la mitad del año CALENDARIO (H1 ene–jun, H2
 * jul–dic). Se nombra así, sin equipararlo a un periodo académico.
 */
const CALENDAR_SEMESTER = 'semestre calendario'

/* ───────────── Presentación (no dominio): textos humanos del periodo ───────────── */

function ymdParts(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split('-').map(Number)
  return { year, month: month - 1, day }
}

/** «5 — 11 OCT 2026», «29 SEP — 5 OCT 2026», «OCTUBRE 2026», «JUL — DIC 2026». */
function displayRange(period: AnalysisPeriod): string {
  const start = ymdParts(period.from)
  const end = ymdParts(period.calendarEnd)
  if (period.kind === 'month') {
    return `${MONTH_LONG[start.month].toUpperCase()} ${start.year}`
  }
  if (period.kind === 'cycle') {
    return `${MONTH_SHORT[start.month]} — ${MONTH_SHORT[end.month]} ${start.year}`
  }
  if (start.year !== end.year) {
    return `${start.day} ${MONTH_SHORT[start.month]} ${start.year} — ${end.day} ${MONTH_SHORT[end.month]} ${end.year}`
  }
  if (start.month === end.month) {
    return `${start.day} — ${end.day} ${MONTH_SHORT[end.month]} ${end.year}`
  }
  return `${start.day} ${MONTH_SHORT[start.month]} — ${end.day} ${MONTH_SHORT[end.month]} ${end.year}`
}

/**
 * Variante «cycle»: el picker solo elige CICLO (el flujo de problemas hace el
 * drill-down a mes / semana). Muestra el ciclo que contiene el periodo.
 */
function displayCycle(cycle: AnalysisPeriod): { range: string; meta: string } {
  const start = ymdParts(cycle.from)
  const end = ymdParts(cycle.calendarEnd)
  return {
    range: `H${cycle.navigationContext.half ?? 1} ${start.year}`,
    meta: `${MONTH_SHORT[start.month]} — ${MONTH_SHORT[end.month]} ${start.year}`,
  }
}

/** Nivel 2 (tipo) y nivel 3 (estado) del periodo aplicado. */
function displayMeta(period: AnalysisPeriod): { kind: string; state: string | null } {
  const half = period.navigationContext.half ?? cycleHalfOf(period)
  const kind =
    period.kind === 'week'
      ? period.isCurrent
        ? 'Semana actual'
        : 'Semana'
      : period.kind === 'month'
        ? period.isCurrent
          ? 'Mes actual'
          : 'Mes'
        : `Ciclo H${half}`
  const state = period.isCurrent && period.isPartial ? 'En curso' : null
  return { kind, state }
}

function weekRangeShort(from: string, to: string): string {
  const [, mFrom, dFrom] = from.split('-').map(Number)
  const [, mTo, dTo] = to.split('-').map(Number)
  if (mFrom === mTo) {
    return `${dFrom} — ${dTo} ${MONTH_SHORT[mTo - 1]}`
  }
  return `${dFrom} ${MONTH_SHORT[mFrom - 1]} — ${dTo} ${MONTH_SHORT[mTo - 1]}`
}

/* ───────────── Selección aplicada (selected / contains) ───────────── */

/** El drill abre siempre en ciclos, pero en el año/ciclo/mes del periodo aplicado. */
function drillFromPeriod(period: AnalysisPeriod): DrillState {
  const half = cycleHalfOf(period)
  return {
    level: 'cycle',
    year: period.navigationContext.year,
    half,
    monthIndex: period.navigationContext.month ?? (half === 1 ? 0 : 6),
    direction: 1,
  }
}

/**
 * `selected`: es exactamente el periodo aplicado.
 * `contains`: el periodo aplicado (más fino) vive dentro de este elemento.
 */
type SelectionMark = 'selected' | 'contains' | 'none'

function cycleMark(period: AnalysisPeriod, year: number, half: 1 | 2): SelectionMark {
  if (period.navigationContext.year !== year || cycleHalfOf(period) !== half) {
    return 'none'
  }
  return period.kind === 'cycle' ? 'selected' : 'contains'
}

function monthMark(
  period: AnalysisPeriod,
  year: number,
  monthIndex: number,
): SelectionMark {
  if (period.kind === 'cycle') return 'none'
  if (
    period.navigationContext.year !== year ||
    period.navigationContext.month !== monthIndex
  ) {
    return 'none'
  }
  return period.kind === 'month' ? 'selected' : 'contains'
}

function Tags({ current, mark }: { current: boolean; mark: SelectionMark }) {
  if (!current && mark === 'none') return null
  return (
    <span className="director-analysis-period__tags">
      {current ? (
        <span className="director-analysis-period__tag" data-tone="current">
          Actual
        </span>
      ) : null}
      {mark !== 'none' ? (
        <span
          className="director-analysis-period__tag"
          data-tone={mark}
          data-testid={`director-analysis-period-mark-${mark}`}
        >
          {mark === 'selected' ? 'Seleccionado' : 'Contiene la selección'}
        </span>
      ) : null}
    </span>
  )
}

/* ───────────── Componente ───────────── */

export function DirectorAnalysisPeriodPicker({
  period,
  onChange,
  variant = 'full',
}: {
  period: AnalysisPeriod
  onChange: (next: AnalysisPeriod) => void
  /**
   * `full`: Ciclo → Mes → Semana (implementación previa, conservada).
   * `cycle`: solo cambia de ciclo; mes y semana se eligen en el flujo.
   */
  variant?: 'full' | 'cycle'
}) {
  const rootId = useId()
  const rootRef = useRef<HTMLElement>(null)
  /** Selector a enfocar tras el próximo render (drill, volver, cerrar). */
  const pendingFocus = useRef<string | null>(null)
  const [open, setOpen] = useState(false)
  const [drill, setDrill] = useState<DrillState>(() => drillFromPeriod(period))
  const today = bogotaTodayParts()

  const focusAfterRender = (selector: string) => {
    pendingFocus.current = selector
  }

  useLayoutEffect(() => {
    const selector = pendingFocus.current
    if (!selector) return
    pendingFocus.current = null
    rootRef.current?.querySelector<HTMLElement>(selector)?.focus()
  })

  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) {
      focusAfterRender('[data-testid="director-analysis-period-trigger"]')
    }
  }

  const toggle = () => {
    if (open) {
      close(true)
      return
    }
    // Usar el picker revalida «actual / en curso» por si cambió el día.
    const fresh = refreshAnalysisPeriod(period)
    if (fresh !== period) onChange(fresh)
    setDrill(drillFromPeriod(fresh))
    setOpen(true)
    focusAfterRender('[data-period-focus="heading"]')
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        // Click fuera: no robar el foco a lo que la persona acaba de tocar.
        close(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close(true)
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const select = (nextPeriod: AnalysisPeriod) => {
    onChange(nextPeriod)
    close(true)
  }

  const cycleOnly = variant === 'cycle'
  const containingCycle = containingCyclePeriod(period)
  // ‹ › navegan al NIVEL del AnalysisPeriod real (ciclo, mes o semana) y
  // modifican el periodo GLOBAL: todas las gráficas de la lectura reaccionan.
  // El diálogo (variante ciclo) sigue siendo la vía macro para saltar de ciclo.
  const shown = period
  const prev = () => onChange(shiftAnalysisPeriod(shown, -1))
  const nextAllowed = canNavigateNext(shown)
  const next = () => {
    if (!nextAllowed) return
    onChange(shiftAnalysisPeriod(shown, 1))
  }
  // Default único de producto: el ciclo actual.
  const goCurrent = () => {
    onChange(buildCurrentCyclePeriod())
    focusAfterRender('[data-testid="director-analysis-period-trigger"]')
  }

  const goCycles = (returnFocusTo?: string) => {
    setDrill((d) => ({ ...d, level: 'cycle', direction: -1 }))
    focusAfterRender(returnFocusTo ?? '[data-period-focus="heading"]')
  }

  const goMonths = (year: number, half: 1 | 2) => {
    setDrill({
      level: 'month',
      year,
      half,
      monthIndex: half === 1 ? 0 : 6,
      direction: 1,
    })
    focusAfterRender('[data-period-focus="heading"]')
  }

  const backToMonths = () => {
    setDrill((d) => ({ ...d, level: 'month', direction: -1 }))
    // Devuelve el foco al «Semanas →» del mes desde el que se entró.
    focusAfterRender(
      `[data-testid="director-analysis-period-drill-month-${drill.monthIndex}"]`,
    )
  }

  const goWeeks = (year: number, half: 1 | 2, monthIndex: number) => {
    setDrill({ level: 'week', year, half, monthIndex, direction: 1 })
    focusAfterRender('[data-period-focus="heading"]')
  }

  const currentWeek = buildCurrentWeekPeriod()
  const todayYmd = bogotaTodayYmd()
  const weeks = listWeeksInBrowseMonth(drill.year, drill.monthIndex)
  const monthIndexes = monthsInCycleHalf(drill.half)
  const cycleDisplay = displayCycle(containingCycle)
  /*
   * El trigger refleja SIEMPRE el AnalysisPeriod real: tras un drill-down en
   * la gráfica dice «SEPTIEMBRE 2026 · Mes», nunca el ciclo contenedor. En la
   * variante ciclo solo la navegación (‹ › y el diálogo) opera por ciclo.
   */
  // Un ciclo aplicado se titula igual en ambas variantes («H2 2026», como la
  // ruta del flujo) y declara su naturaleza: semestre del año calendario.
  const showsCycle = period.kind === 'cycle'
  const meta = showsCycle
    ? {
        kind: `${cycleDisplay.meta} · ${CALENDAR_SEMESTER}`,
        state: containingCycle.isCurrent && containingCycle.isPartial ? 'En curso' : null,
      }
    : displayMeta(period)
  const range = showsCycle ? cycleDisplay.range : displayRange(period)
  const unitLabel =
    period.kind === 'cycle' ? 'Ciclo' : period.kind === 'month' ? 'Mes' : 'Semana'
  const prevLabel = `${unitLabel} anterior`
  const nextLabel = `${unitLabel} siguiente`
  const panelId = `${rootId}-panel`
  const headingId = `${rootId}-heading`
  const cycleLabel = `H${drill.half} ${drill.year}`

  return (
    <section
      ref={rootRef}
      className="director-analysis-period"
      data-testid="director-analysis-period"
      data-kind={period.kind}
      data-partial={period.isPartial ? 'true' : 'false'}
      data-current={period.isCurrent ? 'true' : 'false'}
      data-open={open ? 'true' : 'false'}
      data-variant={variant}
      aria-label="Periodo analizado"
    >
      <p className="director-analysis-period__title" aria-hidden="true">
        {cycleOnly ? 'Periodo' : 'Periodo analizado'}
      </p>

      {/* ── Estado pasivo ── */}
      <div className="director-analysis-period__bar">
        <button
          type="button"
          className="director-analysis-period__nav"
          aria-label={prevLabel}
          data-testid="director-analysis-period-prev"
          onClick={prev}
        >
          ‹
        </button>

        <button
          type="button"
          className="director-analysis-period__trigger"
          data-testid="director-analysis-period-trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={`Periodo analizado: ${period.accessibleLabel}. ${meta.kind}${
            meta.state ? `, ${meta.state.toLowerCase()}` : ''
          }. Cambiar periodo`}
          onClick={toggle}
        >
          <span
            className="director-analysis-period__range"
            data-testid="director-analysis-period-range"
          >
            {range}
          </span>
          <span className="director-analysis-period__meta">
            <span className="director-analysis-period__kind">{meta.kind}</span>
            {meta.state ? (
              <>
                <span aria-hidden="true"> · </span>
                <span className="director-analysis-period__state">
                  {meta.state}
                </span>
              </>
            ) : null}
          </span>
          <span className="director-analysis-period__caret" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="director-analysis-period__nav"
          aria-label={nextLabel}
          data-testid="director-analysis-period-next"
          disabled={!nextAllowed}
          onClick={next}
        >
          ›
        </button>
      </div>

      {!containingCycle.isCurrent ? (
        <button
          type="button"
          className="director-analysis-period__current"
          data-testid="director-analysis-period-go-current"
          aria-label="Volver al ciclo actual"
          onClick={goCurrent}
        >
          <span aria-hidden="true">↺ </span>Ciclo actual
        </button>
      ) : null}

      {/* ── Estado de exploración ── */}
      {open ? (
        <div
          id={panelId}
          className="director-analysis-period__panel"
          data-testid="director-analysis-period-panel"
          data-level={drill.level}
          data-direction={drill.direction === 1 ? 'forward' : 'back'}
          role="dialog"
          aria-labelledby={headingId}
        >
          <header className="director-analysis-period__head">
            <p className="director-analysis-period__panel-title" id={headingId}>
              Seleccionar periodo
            </p>

            {drill.level === 'cycle' ? (
              <div
                className="director-analysis-period__year"
                data-testid="director-analysis-period-year"
              >
                <button
                  type="button"
                  className="director-analysis-period__nav"
                  aria-label={`Año anterior (${drill.year - 1})`}
                  data-testid="director-analysis-period-year-prev"
                  onClick={() => setDrill((d) => ({ ...d, year: d.year - 1 }))}
                >
                  ‹
                </button>
                <span
                  className="director-analysis-period__year-label"
                  data-period-focus="heading"
                  tabIndex={-1}
                  aria-label={`Ciclos de ${drill.year}`}
                >
                  {drill.year}
                </span>
                <button
                  type="button"
                  className="director-analysis-period__nav"
                  aria-label={`Año siguiente (${drill.year + 1})`}
                  data-testid="director-analysis-period-year-next"
                  disabled={drill.year >= today.year}
                  onClick={() =>
                    setDrill((d) => ({
                      ...d,
                      year: Math.min(d.year + 1, today.year),
                    }))
                  }
                >
                  ›
                </button>
              </div>
            ) : (
              <nav
                className="director-analysis-period__crumb"
                aria-label="Ruta del selector"
                data-testid="director-analysis-period-crumb"
              >
                <button
                  type="button"
                  className="director-analysis-period__crumb-link"
                  data-testid="director-analysis-period-crumb-cycles"
                  onClick={() =>
                    goCycles(
                      `[data-testid="director-analysis-period-drill-cycle-H${drill.half}"]`,
                    )
                  }
                >
                  Ciclos
                </button>
                <span className="director-analysis-period__crumb-sep" aria-hidden="true">
                  ›
                </span>
                {drill.level === 'week' ? (
                  <>
                    <button
                      type="button"
                      className="director-analysis-period__crumb-link"
                      data-testid="director-analysis-period-crumb-cycle"
                      onClick={backToMonths}
                    >
                      {cycleLabel}
                    </button>
                    <span
                      className="director-analysis-period__crumb-sep"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                    <span
                      className="director-analysis-period__crumb-here"
                      data-period-focus="heading"
                      tabIndex={-1}
                      aria-current="location"
                      aria-label={`Semanas de ${MONTH_LONG[drill.monthIndex].toLowerCase()} ${drill.year}`}
                    >
                      {MONTH_LONG[drill.monthIndex]}
                      <span className="director-analysis-period__crumb-noun">
                        {' '}
                        · Semanas
                      </span>
                    </span>
                  </>
                ) : (
                  <span
                    className="director-analysis-period__crumb-here"
                    data-period-focus="heading"
                    tabIndex={-1}
                    aria-current="location"
                    aria-label={`Meses del ciclo ${cycleLabel}`}
                  >
                    {cycleLabel}
                    <span className="director-analysis-period__crumb-noun">
                      {' '}
                      · Meses
                    </span>
                  </span>
                )}
              </nav>
            )}
          </header>

          <div
            className="director-analysis-period__body"
            data-testid="director-analysis-period-body"
          >
            {drill.level === 'cycle' ? (
              <ul
                key={`cycles-${drill.year}`}
                className="director-analysis-period__level director-analysis-period__cycles"
                data-testid="director-analysis-period-level-cycle"
              >
                {([1, 2] as const).map((half) => {
                  const candidate = analysisPeriodFromCycle(drill.year, half)
                  const future = isPeriodFullyFuture(candidate.from)
                  const isActual = candidate.isCurrent
                  const mark = cycleMark(period, drill.year, half)
                  const name = `ciclo H${half} ${drill.year}`
                  return (
                    <li
                      key={half}
                      className="director-analysis-period__act director-analysis-period__cycle"
                      data-testid={`director-analysis-period-cycle-H${half}`}
                      data-future={future ? 'true' : 'false'}
                      data-current={isActual ? 'true' : 'false'}
                      data-selection={mark}
                    >
                      <div className="director-analysis-period__act-head">
                        <span className="director-analysis-period__act-title">
                          H{half}
                        </span>
                        <span className="director-analysis-period__act-meta">
                          {half === 1 ? 'Ene — Jun' : 'Jul — Dic'} {drill.year} ·{' '}
                          {CALENDAR_SEMESTER}
                        </span>
                        <Tags current={isActual} mark={mark} />
                      </div>
                      <div className="director-analysis-period__stub">
                        <button
                          type="button"
                          className="director-analysis-period__use"
                          data-testid={`director-analysis-period-use-cycle-H${half}`}
                          aria-label={`Seleccionar ${name}`}
                          aria-current={mark === 'selected' ? 'true' : undefined}
                          disabled={future}
                          onClick={() => select(candidate)}
                        >
                          Seleccionar
                        </button>
                        {cycleOnly ? null : (
                          <button
                            type="button"
                            className="director-analysis-period__drill"
                            data-testid={`director-analysis-period-drill-cycle-H${half}`}
                            aria-label={`Ver meses del ${name}`}
                            disabled={future}
                            onClick={() => goMonths(drill.year, half)}
                          >
                            Meses <span aria-hidden="true">→</span>
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {drill.level === 'month' ? (
              <ul
                key={`months-${drill.year}-${drill.half}`}
                className="director-analysis-period__level director-analysis-period__months"
                data-testid="director-analysis-period-level-month"
              >
                {monthIndexes.map((monthIndex) => {
                  const candidate = analysisPeriodFromMonth(drill.year, monthIndex)
                  const future = isPeriodFullyFuture(candidate.from)
                  const isActual = candidate.isCurrent
                  const mark = monthMark(period, drill.year, monthIndex)
                  const name = `${MONTH_LONG[monthIndex].toLowerCase()} ${drill.year}`
                  return (
                    <li
                      key={monthIndex}
                      className="director-analysis-period__act director-analysis-period__month"
                      data-testid={`director-analysis-period-month-${formatYmd(drill.year, monthIndex, 1)}`}
                      data-future={future ? 'true' : 'false'}
                      data-current={isActual ? 'true' : 'false'}
                      data-selection={mark}
                    >
                      <div className="director-analysis-period__act-head">
                        <span className="director-analysis-period__act-title">
                          {MONTH_SHORT[monthIndex]}
                        </span>
                        <Tags current={isActual} mark={mark} />
                      </div>
                      <div className="director-analysis-period__stub">
                        <button
                          type="button"
                          className="director-analysis-period__use"
                          data-testid={`director-analysis-period-use-month-${monthIndex}`}
                          aria-label={`Seleccionar ${name}`}
                          aria-current={mark === 'selected' ? 'true' : undefined}
                          disabled={future}
                          onClick={() => select(candidate)}
                        >
                          Seleccionar
                        </button>
                        <button
                          type="button"
                          className="director-analysis-period__drill"
                          data-testid={`director-analysis-period-drill-month-${monthIndex}`}
                          aria-label={`Ver semanas de ${name}`}
                          disabled={future}
                          onClick={() => goWeeks(drill.year, drill.half, monthIndex)}
                        >
                          Semanas <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {drill.level === 'week' ? (
              <ul
                key={`weeks-${drill.year}-${drill.monthIndex}`}
                className="director-analysis-period__level director-analysis-period__weeks"
                data-testid="director-analysis-period-level-week"
              >
                {weeks.map((week) => {
                  const future = week.from > todayYmd
                  const isActual = week.from === currentWeek.from
                  const selected =
                    period.kind === 'week' && period.from === week.from
                  return (
                    <li key={week.key}>
                      <button
                        type="button"
                        className="director-analysis-period__week-btn"
                        data-testid={`director-analysis-period-week-${week.from}`}
                        data-selection={selected ? 'selected' : 'none'}
                        data-current={isActual ? 'true' : 'false'}
                        data-future={future ? 'true' : 'false'}
                        aria-current={selected ? 'true' : undefined}
                        aria-label={`Seleccionar ${week.label.toLowerCase()}`}
                        disabled={future}
                        onClick={() => select(analysisPeriodFromWeek(week.from))}
                      >
                        <span className="director-analysis-period__week-range">
                          {weekRangeShort(week.from, week.to)}
                        </span>
                        <Tags current={isActual} mark={selected ? 'selected' : 'none'} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

/* ───────────── Franja de filtros: Ciclo · Mes · Semana ───────────── */

/** «1 JUL — 31 DIC 2026», «1 — 30 SEP 2026», «28 SEP — 4 OCT 2026». */
function explicitRange(period: AnalysisPeriod): string {
  const start = ymdParts(period.from)
  const end = ymdParts(period.calendarEnd)
  if (start.year !== end.year) {
    return `${start.day} ${MONTH_SHORT[start.month]} ${start.year} — ${end.day} ${MONTH_SHORT[end.month]} ${end.year}`
  }
  if (start.month === end.month) {
    return `${start.day} — ${end.day} ${MONTH_SHORT[end.month]} ${end.year}`
  }
  return `${start.day} ${MONTH_SHORT[start.month]} — ${end.day} ${MONTH_SHORT[end.month]} ${end.year}`
}

/** Ciclos ofrecidos: el año actual y los dos anteriores, más el elegido si es más antiguo. */
function cycleOptions(period: AnalysisPeriod, todayYear: number) {
  const selectedYear = containingCyclePeriod(period).navigationContext.year
  const firstYear = Math.min(todayYear - 2, selectedYear)
  const options: { value: string; label: string; future: boolean }[] = []
  for (let year = todayYear; year >= firstYear; year -= 1) {
    for (const half of [2, 1] as const) {
      const candidate = analysisPeriodFromCycle(year, half)
      options.push({
        value: `${year}-${half}`,
        label: `H${half} ${year} · ${half === 1 ? 'Ene — Jun' : 'Jul — Dic'}`,
        future: isPeriodFullyFuture(candidate.from),
      })
    }
  }
  return options
}

/**
 * Selección temporal EXPLÍCITA de la lectura de coordinación.
 *
 * No guarda estado propio: cada control se deriva del único `AnalysisPeriod`
 * y cada cambio emite un periodo nuevo con los constructores del dominio. Así
 * selectores, flechas y clics en las gráficas no pueden desincronizarse.
 *
 * - Ciclo elegido y mes «Todo el ciclo» → periodo de ciclo.
 * - Mes elegido y semana «Todo el mes» → periodo de mes.
 * - Semana elegida → periodo de semana (lun–dom completa, como el drill-down;
 *   conserva el mes desde el que se eligió como contexto).
 * Cambiar el ciclo descarta mes y semana; cambiar el mes descarta la semana.
 * Las opciones totalmente futuras quedan deshabilitadas.
 */
export function DirectorAnalysisPeriodFilters({
  period,
  onChange,
}: {
  period: AnalysisPeriod
  onChange: (next: AnalysisPeriod) => void
}) {
  const rootId = useId()
  const weekReasonId = `${rootId}-week-reason`
  const today = bogotaTodayParts()
  const cycle = containingCyclePeriod(period)
  const year = cycle.navigationContext.year
  const half = cycleHalfOf(period)
  const monthIndex =
    period.kind === 'cycle' ? null : (period.navigationContext.month ?? null)
  const weekFrom = period.kind === 'week' ? period.from : null

  const currentWeekFrom = buildCurrentWeekPeriod().from
  const nextAllowed = canNavigateNext(period)
  const unitLabel =
    period.kind === 'cycle' ? 'Ciclo' : period.kind === 'month' ? 'Mes' : 'Semana'

  const onCycle = (value: string) => {
    const [y, h] = value.split('-').map(Number)
    onChange(analysisPeriodFromCycle(y, h as 1 | 2))
  }
  const onMonth = (value: string) => {
    if (value === '') onChange(analysisPeriodFromCycle(year, half))
    else onChange(analysisPeriodFromMonth(year, Number(value)))
  }
  const onWeek = (value: string) => {
    if (monthIndex === null) return
    if (value === '') {
      onChange(analysisPeriodFromMonth(year, monthIndex))
      return
    }
    // Misma regla que el drill-down: semana completa, contexto = mes elegido.
    onChange({
      ...analysisPeriodFromWeek(value),
      navigationContext: { year, month: monthIndex },
    })
  }

  const weeks = monthIndex === null ? [] : listWeeksInBrowseMonth(year, monthIndex)
  const inProgress = period.isCurrent && period.isPartial

  return (
    <section
      className="director-analysis-period director-analysis-period--filters"
      data-testid="director-analysis-period"
      data-kind={period.kind}
      data-partial={period.isPartial ? 'true' : 'false'}
      data-current={period.isCurrent ? 'true' : 'false'}
      data-variant="filters"
      aria-label="Periodo analizado"
    >
      <div className="director-period-filters">
        <button
          type="button"
          className="director-analysis-period__nav"
          aria-label={`${unitLabel} anterior`}
          data-testid="director-analysis-period-prev"
          onClick={() => onChange(shiftAnalysisPeriod(period, -1))}
        >
          ‹
        </button>

        <label className="director-period-filters__field">
          <span className="director-period-filters__label">Ciclo</span>
          <select
            className="director-period-filters__select"
            data-testid="director-period-cycle"
            value={`${year}-${half}`}
            onChange={(event) => onCycle(event.target.value)}
          >
            {cycleOptions(period, today.year).map((option) => (
              <option key={option.value} value={option.value} disabled={option.future}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="director-period-filters__field">
          <span className="director-period-filters__label">Mes</span>
          <select
            className="director-period-filters__select"
            data-testid="director-period-month"
            value={monthIndex === null ? '' : String(monthIndex)}
            onChange={(event) => onMonth(event.target.value)}
          >
            <option value="">Todo el ciclo</option>
            {monthsInCycleHalf(half).map((m) => {
              const future = isPeriodFullyFuture(formatYmd(year, m, 1))
              const current = year === today.year && m === today.monthIndex
              return (
                <option key={m} value={String(m)} disabled={future}>
                  {MONTH_LONG[m]}
                  {current ? ' (actual)' : ''}
                </option>
              )
            })}
          </select>
        </label>

        <label className="director-period-filters__field">
          <span className="director-period-filters__label">Semana</span>
          <select
            className="director-period-filters__select"
            data-testid="director-period-week"
            value={weekFrom ?? ''}
            disabled={monthIndex === null}
            aria-describedby={monthIndex === null ? weekReasonId : undefined}
            title={monthIndex === null ? 'Elija un mes para ver sus semanas' : undefined}
            onChange={(event) => onWeek(event.target.value)}
          >
            <option value="">{monthIndex === null ? 'Elija un mes' : 'Todo el mes'}</option>
            {weeks.map((week) => (
              <option
                key={week.from}
                value={week.from}
                disabled={isPeriodFullyFuture(week.from)}
              >
                {weekRangeShort(week.from, week.to)}
                {week.from === currentWeekFrom ? ' (actual)' : ''}
              </option>
            ))}
          </select>
          {monthIndex === null ? (
            <span id={weekReasonId} className="director-period-filters__sr">
              Elija un mes para filtrar por semana.
            </span>
          ) : null}
        </label>

        <button
          type="button"
          className="director-analysis-period__nav"
          aria-label={`${unitLabel} siguiente`}
          data-testid="director-analysis-period-next"
          disabled={!nextAllowed}
          onClick={() => {
            if (nextAllowed) onChange(shiftAnalysisPeriod(period, 1))
          }}
        >
          ›
        </button>
      </div>

      {/* Intervalo efectivo: fechas exactas y si está en curso. */}
      <p className="director-period-filters__effective">
        <span data-testid="director-analysis-period-range">{explicitRange(period)}</span>
        {inProgress ? (
          <span className="director-period-filters__live">
            <span aria-hidden="true"> · </span>En curso
          </span>
        ) : null}
        {!cycle.isCurrent ? (
          <button
            type="button"
            className="director-analysis-period__current"
            data-testid="director-analysis-period-go-current"
            aria-label="Volver al ciclo actual"
            onClick={() => onChange(buildCurrentCyclePeriod())}
          >
            <span aria-hidden="true">↺ </span>Ciclo actual
          </button>
        ) : null}
      </p>
    </section>
  )
}
