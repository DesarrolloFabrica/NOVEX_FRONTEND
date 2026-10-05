import { useEffect, useId, useRef, useState } from 'react'
import {
  analysisPeriodFromCycle,
  analysisPeriodFromMonth,
  analysisPeriodFromWeek,
  bogotaTodayYmd,
  buildCurrentWeekPeriod,
  canNavigateNext,
  formatYmd,
  isPeriodFullyFuture,
  listWeeksInBrowseMonth,
  MONTH_SHORT,
  monthsInCycleHalf,
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

function statusLineOf(period: AnalysisPeriod): string {
  if (period.isCurrent && period.isPartial) {
    if (period.kind === 'week') return 'Semana actual · En curso'
    if (period.kind === 'month') return 'Mes actual · En curso'
    return `${period.kindLabel} actual · En curso`
  }
  if (period.isCurrent) {
    if (period.kind === 'week') return 'Semana actual'
    if (period.kind === 'month') return 'Mes actual'
    return `${period.kindLabel} actual`
  }
  if (period.kind === 'week') return 'Semana'
  if (period.kind === 'month') return 'Mes'
  return period.kindLabel
}

function weekRangeShort(from: string, to: string): string {
  const [, mFrom, dFrom] = from.split('-').map(Number)
  const [, mTo, dTo] = to.split('-').map(Number)
  if (mFrom === mTo) {
    return `${dFrom} — ${dTo} ${MONTH_SHORT[mTo - 1]}`
  }
  return `${dFrom} ${MONTH_SHORT[mFrom - 1]} — ${dTo} ${MONTH_SHORT[mTo - 1]}`
}

export function DirectorAnalysisPeriodPicker({
  period,
  onChange,
}: {
  period: AnalysisPeriod
  onChange: (next: AnalysisPeriod) => void
}) {
  const rootId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const today = bogotaTodayParts()
  const [drill, setDrill] = useState<DrillState>(() => ({
    level: 'cycle',
    year: today.year,
    half: today.monthIndex <= 5 ? 1 : 2,
    monthIndex: today.monthIndex,
    direction: 1,
  }))

  const resetDrillToCycles = () => {
    const now = bogotaTodayParts()
    setDrill({
      level: 'cycle',
      year: now.year,
      half: now.monthIndex <= 5 ? 1 : 2,
      monthIndex: now.monthIndex,
      direction: 1,
    })
  }

  useEffect(() => {
    if (!open) return
    resetDrillToCycles()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
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
    setOpen(false)
  }

  const prev = () => onChange(shiftAnalysisPeriod(period, -1))
  const next = () => {
    if (!canNavigateNext(period)) return
    onChange(shiftAnalysisPeriod(period, 1))
  }
  const goCurrent = () => onChange(buildCurrentWeekPeriod())

  const currentWeek = buildCurrentWeekPeriod()
  const todayYmd = bogotaTodayYmd()
  const weeks = listWeeksInBrowseMonth(drill.year, drill.monthIndex)
  const monthIndexes = monthsInCycleHalf(drill.half)

  const goMonths = (year: number, half: 1 | 2) => {
    setDrill({
      level: 'month',
      year,
      half,
      monthIndex: half === 1 ? 0 : 6,
      direction: 1,
    })
  }

  const goWeeks = (year: number, half: 1 | 2, monthIndex: number) => {
    setDrill({
      level: 'week',
      year,
      half,
      monthIndex,
      direction: 1,
    })
  }

  const goBack = () => {
    if (drill.level === 'week') {
      setDrill((d) => ({ ...d, level: 'month', direction: -1 }))
      return
    }
    if (drill.level === 'month') {
      setDrill((d) => ({ ...d, level: 'cycle', direction: -1 }))
    }
  }

  return (
    <section
      ref={rootRef}
      className="director-analysis-period"
      data-testid="director-analysis-period"
      data-kind={period.kind}
      data-partial={period.isPartial ? 'true' : 'false'}
      data-current={period.isCurrent ? 'true' : 'false'}
      data-open={open ? 'true' : 'false'}
    >
      <p className="director-analysis-period__title">Periodo analizado</p>

      <div className="director-analysis-period__bar">
        <button
          type="button"
          className="director-analysis-period__nav director-analysis-period__nav--quiet"
          aria-label="Periodo anterior"
          data-testid="director-analysis-period-prev"
          onClick={prev}
        >
          ‹
        </button>

        <button
          type="button"
          className="director-analysis-period__trigger"
          data-testid="director-analysis-period-trigger"
          aria-expanded={open}
          aria-controls={`${rootId}-panel`}
          aria-label={period.accessibleLabel}
          onClick={() => setOpen((value) => !value)}
        >
          <span
            className="director-analysis-period__range"
            data-testid="director-analysis-period-range"
          >
            {period.rangeLabel}
          </span>
          <span className="director-analysis-period__status">
            {statusLineOf(period)}
            <span className="director-analysis-period__caret" aria-hidden="true">
              {' '}
              ▾
            </span>
          </span>
        </button>

        <button
          type="button"
          className="director-analysis-period__nav director-analysis-period__nav--quiet"
          aria-label="Periodo siguiente"
          data-testid="director-analysis-period-next"
          disabled={!canNavigateNext(period)}
          onClick={next}
        >
          ›
        </button>
      </div>

      {!period.isCurrent ? (
        <button
          type="button"
          className="director-analysis-period__current"
          data-testid="director-analysis-period-go-current"
          aria-label="Volver a semana actual"
          onClick={goCurrent}
        >
          Volver a semana actual
        </button>
      ) : null}

      {open ? (
        <div
          id={`${rootId}-panel`}
          className="director-analysis-period__panel"
          data-testid="director-analysis-period-panel"
          data-level={drill.level}
          data-direction={drill.direction === 1 ? 'forward' : 'back'}
          role="dialog"
          aria-label="Seleccionar periodo"
        >
          <p className="director-analysis-period__panel-title">
            Seleccionar periodo
          </p>

          {drill.level !== 'cycle' ? (
            <nav
              className="director-analysis-period__crumb"
              aria-label="Navegación del periodo"
              data-testid="director-analysis-period-crumb"
            >
              <button
                type="button"
                className="director-analysis-period__crumb-link"
                data-testid="director-analysis-period-crumb-cycle"
                onClick={() =>
                  setDrill((d) => ({ ...d, level: 'cycle', direction: -1 }))
                }
              >
                H{drill.half} {drill.year}
              </button>
              {drill.level === 'week' || drill.level === 'month' ? (
                <>
                  <span aria-hidden="true"> › </span>
                  {drill.level === 'week' ? (
                    <button
                      type="button"
                      className="director-analysis-period__crumb-link"
                      data-testid="director-analysis-period-crumb-month"
                      onClick={() =>
                        setDrill((d) => ({
                          ...d,
                          level: 'month',
                          direction: -1,
                        }))
                      }
                    >
                      {MONTH_SHORT[drill.monthIndex]}
                    </button>
                  ) : (
                    <span>Meses</span>
                  )}
                </>
              ) : null}
              {drill.level === 'week' ? (
                <>
                  <span aria-hidden="true"> › </span>
                  <span>Semanas</span>
                </>
              ) : null}
            </nav>
          ) : null}

          {drill.level === 'cycle' ? (
            <div
              className="director-analysis-period__level"
              data-testid="director-analysis-period-level-cycle"
            >
              <div className="director-analysis-period__browse">
                <button
                  type="button"
                  className="director-analysis-period__nav director-analysis-period__nav--quiet"
                  aria-label="Año anterior"
                  data-testid="director-analysis-period-year-prev"
                  onClick={() =>
                    setDrill((d) => ({ ...d, year: d.year - 1 }))
                  }
                >
                  ‹
                </button>
                <p className="director-analysis-period__browse-label">
                  {drill.year}
                </p>
                <button
                  type="button"
                  className="director-analysis-period__nav director-analysis-period__nav--quiet"
                  aria-label="Año siguiente"
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

              <ul className="director-analysis-period__acts">
                {([1, 2] as const).map((half) => {
                  const candidate = analysisPeriodFromCycle(drill.year, half)
                  const future = isPeriodFullyFuture(candidate.from)
                  const isActual =
                    candidate.isCurrent && drill.year === today.year
                  return (
                    <li
                      key={half}
                      className="director-analysis-period__act"
                      data-testid={`director-analysis-period-cycle-H${half}`}
                      data-future={future ? 'true' : 'false'}
                      data-current={isActual ? 'true' : 'false'}
                    >
                      <div className="director-analysis-period__act-copy">
                        <p className="director-analysis-period__act-title">
                          Ciclo H{half}
                          {isActual ? (
                            <span className="director-analysis-period__badge">
                              {' '}
                              · Actual
                            </span>
                          ) : null}
                        </p>
                        <p className="director-analysis-period__act-meta">
                          {half === 1 ? 'Enero — Junio' : 'Julio — Diciembre'}{' '}
                          {drill.year}
                        </p>
                      </div>
                      <div className="director-analysis-period__act-actions">
                        <button
                          type="button"
                          className="director-analysis-period__use"
                          data-testid={`director-analysis-period-use-cycle-H${half}`}
                          disabled={future}
                          onClick={() => select(candidate)}
                        >
                          Usar ciclo
                        </button>
                        <button
                          type="button"
                          className="director-analysis-period__drill"
                          data-testid={`director-analysis-period-drill-cycle-H${half}`}
                          disabled={future}
                          onClick={() => goMonths(drill.year, half)}
                        >
                          Meses →
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {drill.level === 'month' ? (
            <div
              className="director-analysis-period__level"
              data-testid="director-analysis-period-level-month"
            >
              <button
                type="button"
                className="director-analysis-period__back"
                data-testid="director-analysis-period-back"
                onClick={goBack}
              >
                ← Volver
              </button>
              <ul className="director-analysis-period__acts">
                {monthIndexes.map((monthIndex) => {
                  const candidate = analysisPeriodFromMonth(
                    drill.year,
                    monthIndex,
                  )
                  const future = isPeriodFullyFuture(candidate.from)
                  const isActual = candidate.isCurrent
                  const monthName = MONTH_SHORT[monthIndex]
                  return (
                    <li
                      key={monthIndex}
                      className="director-analysis-period__act"
                      data-testid={`director-analysis-period-month-${formatYmd(drill.year, monthIndex, 1)}`}
                      data-future={future ? 'true' : 'false'}
                      data-current={isActual ? 'true' : 'false'}
                    >
                      <div className="director-analysis-period__act-copy">
                        <p className="director-analysis-period__act-title">
                          {monthName} {drill.year}
                          {isActual ? (
                            <span className="director-analysis-period__badge">
                              {' '}
                              · Actual
                            </span>
                          ) : null}
                          {future ? (
                            <span className="director-analysis-period__badge">
                              {' '}
                              · Futuro
                            </span>
                          ) : null}
                        </p>
                        <p className="director-analysis-period__act-meta">
                          {candidate.rangeLabel}
                        </p>
                      </div>
                      <div className="director-analysis-period__act-actions">
                        <button
                          type="button"
                          className="director-analysis-period__use"
                          data-testid={`director-analysis-period-use-month-${monthIndex}`}
                          disabled={future}
                          onClick={() => select(candidate)}
                        >
                          Usar mes
                        </button>
                        <button
                          type="button"
                          className="director-analysis-period__drill"
                          data-testid={`director-analysis-period-drill-month-${monthIndex}`}
                          disabled={future}
                          onClick={() =>
                            goWeeks(drill.year, drill.half, monthIndex)
                          }
                        >
                          Semanas →
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {drill.level === 'week' ? (
            <div
              className="director-analysis-period__level"
              data-testid="director-analysis-period-level-week"
            >
              <button
                type="button"
                className="director-analysis-period__back"
                data-testid="director-analysis-period-back"
                onClick={goBack}
              >
                ← Volver
              </button>
              <ul className="director-analysis-period__acts">
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
                        data-active={selected ? 'true' : 'false'}
                        data-current={isActual ? 'true' : 'false'}
                        disabled={future}
                        aria-label={week.label}
                        onClick={() =>
                          select(analysisPeriodFromWeek(week.from))
                        }
                      >
                        <span>{weekRangeShort(week.from, week.to)}</span>
                        {isActual ? (
                          <span className="director-analysis-period__badge">
                            Actual
                          </span>
                        ) : null}
                        {future ? (
                          <span className="director-analysis-period__badge">
                            Futuro
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
