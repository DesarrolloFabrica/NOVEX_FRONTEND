import { useEffect, useId, useRef, useState } from 'react'
import type { ProblemHistoryPeriod } from '@/modules/operational-cards/types/problem-history.types'
import {
  bogotaTodayParts,
  buildMonthPeriod,
  listCyclePeriods,
  listMonthPeriods,
  listWeekPeriodsInMonth,
} from '@/modules/operational-cards/data/problemHistoryPeriod'

/**
 * Control único «Período»: semanas / meses / ciclos en calendario Colombia.
 * Al elegir una opción actualiza el historial de inmediato (sin «Aplicar»).
 */

type PickerTab = 'week' | 'month' | 'cycle'

export interface HistoryPeriodPickerProps {
  period: ProblemHistoryPeriod
  onChange: (period: ProblemHistoryPeriod) => void
  disabled?: boolean
}

export function HistoryPeriodPicker({
  period,
  onChange,
  disabled = false,
}: HistoryPeriodPickerProps) {
  const rootId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const today = bogotaTodayParts()
  const [browseYear, setBrowseYear] = useState(
    Number(period.from.slice(0, 4)) || today.year,
  )
  const [browseMonth, setBrowseMonth] = useState(
    period.kind === 'month'
      ? Number(period.key.slice(5, 7)) - 1
      : today.monthIndex,
  )
  const [tab, setTab] = useState<PickerTab>(period.kind)

  useEffect(() => {
    if (!open) return
    setBrowseYear(Number(period.from.slice(0, 4)) || today.year)
    if (period.kind === 'month') {
      setBrowseMonth(Number(period.key.slice(5, 7)) - 1)
    }
    setTab(period.kind)
  }, [open, period, today.year])

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

  const weeks = listWeekPeriodsInMonth(browseYear, browseMonth)
  const months = listMonthPeriods(browseYear)
  const cycles = listCyclePeriods(browseYear)
  const monthLabel = buildMonthPeriod(browseYear, browseMonth).label

  const select = (next: ProblemHistoryPeriod) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <div
      className="history-period-picker"
      data-testid="history-period-picker"
      ref={rootRef}
    >
      <span className="history-period-picker__label" id={`${rootId}-label`}>
        Período
      </span>
      <button
        type="button"
        className="history-period-picker__trigger"
        data-testid="history-period-trigger"
        aria-labelledby={`${rootId}-label`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="history-period-picker__value">{period.label}</span>
        <span className="history-period-picker__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div
          className="history-period-picker__panel"
          data-testid="history-period-panel"
          role="listbox"
          aria-label="Elegir período de cierre"
        >
          <div className="history-period-picker__year-row">
            <button
              type="button"
              className="history-period-picker__nav"
              data-testid="history-period-year-prev"
              aria-label="Año anterior"
              onClick={() => setBrowseYear((year) => year - 1)}
            >
              ‹
            </button>
            <span className="history-period-picker__year" data-testid="history-period-year">
              {browseYear}
            </span>
            <button
              type="button"
              className="history-period-picker__nav"
              data-testid="history-period-year-next"
              aria-label="Año siguiente"
              onClick={() => setBrowseYear((year) => year + 1)}
            >
              ›
            </button>
          </div>

          <div className="history-period-picker__tabs" role="tablist">
            {(
              [
                ['week', 'Semanas'],
                ['month', 'Meses'],
                ['cycle', 'Ciclos'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className="history-period-picker__tab"
                data-testid={`history-period-tab-${id}`}
                data-active={tab === id ? 'true' : undefined}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'week' ? (
            <div className="history-period-picker__section">
              <div className="history-period-picker__month-row">
                <button
                  type="button"
                  className="history-period-picker__nav"
                  data-testid="history-period-month-prev"
                  aria-label="Mes anterior"
                  onClick={() => {
                    if (browseMonth === 0) {
                      setBrowseYear((year) => year - 1)
                      setBrowseMonth(11)
                    } else {
                      setBrowseMonth((month) => month - 1)
                    }
                  }}
                >
                  ‹
                </button>
                <span className="history-period-picker__month-label">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  className="history-period-picker__nav"
                  data-testid="history-period-month-next"
                  aria-label="Mes siguiente"
                  onClick={() => {
                    if (browseMonth === 11) {
                      setBrowseYear((year) => year + 1)
                      setBrowseMonth(0)
                    } else {
                      setBrowseMonth((month) => month + 1)
                    }
                  }}
                >
                  ›
                </button>
              </div>
              <ul className="history-period-picker__options">
                {weeks.map((option) => (
                  <li key={option.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={period.key === option.key}
                      className="history-period-picker__option"
                      data-testid="history-period-option"
                      data-period-key={option.key}
                      data-selected={period.key === option.key ? 'true' : undefined}
                      onClick={() => select(option)}
                    >
                      <span className="history-period-picker__option-title">
                        {option.label}
                      </span>
                      <span className="history-period-picker__option-range">
                        {option.from} → {option.to}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {tab === 'month' ? (
            <ul className="history-period-picker__options history-period-picker__options--grid">
              {months.map((option) => (
                <li key={option.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={period.key === option.key}
                    className="history-period-picker__option"
                    data-testid="history-period-option"
                    data-period-key={option.key}
                    data-selected={period.key === option.key ? 'true' : undefined}
                    onClick={() => select(option)}
                  >
                    <span className="history-period-picker__option-title">
                      {option.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {tab === 'cycle' ? (
            <ul className="history-period-picker__options">
              {cycles.map((option) => (
                <li key={option.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={period.key === option.key}
                    className="history-period-picker__option"
                    data-testid="history-period-option"
                    data-period-key={option.key}
                    data-selected={period.key === option.key ? 'true' : undefined}
                    onClick={() => select(option)}
                  >
                    <span className="history-period-picker__option-title">
                      {option.label}
                    </span>
                    <span className="history-period-picker__option-range">
                      {option.from} → {option.to}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
