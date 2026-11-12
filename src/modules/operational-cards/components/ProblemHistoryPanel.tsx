import { ProblemDossierCard } from '@/modules/operational-cards/components/ProblemDossierCard'
import { HistoryPeriodPicker } from '@/modules/operational-cards/components/HistoryPeriodPicker'
import {
  buildProblemRowAccessibleName,
  resolveProblemMark,
} from '@/modules/operational-cards/data/coordinationMark'
import {
  DOSSIER_HISTORY_STATUS_LABEL,
  DOSSIER_SEVERITY_LABEL,
} from '@/modules/operational-cards/data/problemDossier'
import {
  bogotaTodayParts,
  buildCyclePeriod,
  summaryCountLabel,
} from '@/modules/operational-cards/data/problemHistoryPeriod'
import type {
  ProblemHistoryEntry,
  ProblemHistoryPeriod,
  ProblemHistoryState,
} from '@/modules/operational-cards/types/problem-history.types'

/**
 * Vista `history` del panel: situaciones CLOSED filtradas por closedAt.
 */

export interface ProblemHistoryPanelProps {
  history: ProblemHistoryState
  selectedProblemId: string | null
  labelByCode?: Readonly<Record<string, string>>
  colorByCode?: Readonly<Record<string, string>>
  onPeriodChange: (period: ProblemHistoryPeriod) => void
  onSelect: (problemId: string) => void
  onLoadMore: () => void
  onRetry: () => void
  onBack: () => void
  /** Alcance que se nombra en la cabecera («mi coordinación», «todas…»). */
  scopeLabel?: string
}

/** Ciclo vigente y el anterior, para salir de un período vacío en un clic. */
function cycleShortcuts(period: ProblemHistoryPeriod): ProblemHistoryPeriod[] {
  const { year, monthIndex } = bogotaTodayParts()
  const half: 1 | 2 = monthIndex < 6 ? 1 : 2
  const current = buildCyclePeriod(year, half)
  const previous = half === 1 ? buildCyclePeriod(year - 1, 2) : buildCyclePeriod(year, 1)
  return [current, previous].filter((option) => option.key !== period.key)
}

function formatClosedAt(value: string | null): string {
  if (!value) return 'Fecha de cierre no disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha de cierre no disponible'
  return date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function HistoryRow({
  entry,
  selected,
  onSelect,
  labelByCode,
  colorByCode,
}: {
  entry: ProblemHistoryEntry
  selected: boolean
  onSelect: (id: string) => void
  labelByCode?: Readonly<Record<string, string>>
  colorByCode?: Readonly<Record<string, string>>
}) {
  const mark = resolveProblemMark({
    reportKind: entry.reportKind,
    coordinationCode: entry.coordinationCode,
    affectedCoordinationCode: entry.affectedCoordinationCode,
    viewpointCode: null,
    labelByCode,
    coordinationName: entry.coordinationName,
    affectedCoordinationName: entry.affectedCoordinationName,
  })
  const statusLabel =
    DOSSIER_HISTORY_STATUS_LABEL[entry.status] ?? entry.status
  const severityLabel = DOSSIER_SEVERITY_LABEL[entry.severity]
  const closedLabel = formatClosedAt(entry.closedAt)
  const resolver = entry.resolvedByUserName ?? 'No registrado'

  return (
    <li>
      <ProblemDossierCard
        id={entry.id}
        title={entry.title}
        severity={entry.severity}
        status={entry.status}
        reportKind={entry.reportKind}
        mark={mark}
        severityLabel={severityLabel}
        statusLabel={statusLabel}
        accessibleName={buildProblemRowAccessibleName({
          title: entry.title,
          mark,
          severityLabel,
          statusLabel,
        })}
        selected={selected}
        closed
        colorByCode={colorByCode}
        surfaceClassName="problem-history__row"
        testId="history-row"
        originTestId="history-row-origin"
        severityTestId="history-row-severity"
        statusTestId="history-row-status"
        onClick={() => onSelect(entry.id)}
      />
      <dl className="problem-history__meta" data-testid="history-row-meta">
        <div>
          <dt>Cerrada</dt>
          <dd>{closedLabel}</dd>
        </div>
        <div>
          <dt>Resuelta por</dt>
          <dd>{resolver}</dd>
        </div>
      </dl>
      {entry.learningPreview ? (
        <p className="problem-history__learning" data-testid="history-row-learning">
          <span className="problem-history__learning-label">Lección registrada</span>
          {entry.learningPreview}
        </p>
      ) : null}
    </li>
  )
}

export function ProblemHistoryPanel({
  history,
  selectedProblemId,
  labelByCode,
  colorByCode,
  onPeriodChange,
  onSelect,
  onLoadMore,
  onRetry,
  onBack,
  scopeLabel,
}: ProblemHistoryPanelProps) {
  const { status, items, total, loadingMore, errorMessage, period } = history
  const quedanMas = items.length < total
  const summary =
    status === 'ready' ? summaryCountLabel(total, period) : null

  return (
    <div
      className="problem-history"
      data-testid="problem-history"
      data-tour="problem-history"
      data-surface="problem-history"
      data-status={status}
    >
      <header className="problem-history__header">
        <div className="problem-history__topline">
          <button
            type="button"
            className="problem-history__back"
            data-testid="history-back"
            onClick={onBack}
            aria-label="Volver"
            title="Volver"
          >
            Volver
          </button>
          <span className="problem-history__eyebrow">
            Consulta · {scopeLabel ?? 'situaciones cerradas'}
          </span>
        </div>
        <div className="problem-history__title-row">
          <span className="problem-history__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="4.5" width="14" height="17" rx="2" />
              <path d="M9 3h6v3H9z" />
              <path d="M9 11h6M9 14.5h6M9 18h4" />
            </svg>
          </span>
          <div>
            <h2 className="problem-history__title">Historial</h2>
            <p className="problem-history__subtitle">
              Situaciones ya cerradas, con su fecha de cierre, quién las resolvió
              y la lección registrada.
            </p>
          </div>
        </div>

        <HistoryPeriodPicker
          period={period}
          onChange={onPeriodChange}
          disabled={status === 'loading' && items.length === 0}
        />

        {summary ? (
          <p className="problem-history__summary" data-testid="history-summary">
            {summary}
          </p>
        ) : null}
      </header>

      {status === 'loading' && items.length === 0 && (
        <p className="problem-history__note" data-testid="history-loading">
          Consultando situaciones cerradas…
        </p>
      )}

      {status === 'error' && (
        <div className="problem-history__error" role="status">
          <p data-testid="history-error">
            {errorMessage ?? 'No pudimos cargar el historial.'}
          </p>
          <button
            type="button"
            data-testid="history-retry"
            onClick={onRetry}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div
          className="problem-history__empty"
          data-testid="history-empty"
          role="status"
        >
          <span className="problem-history__empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="15" rx="2" />
              <path d="M8 3v4M16 3v4M4 10h16" />
            </svg>
          </span>
          <p className="problem-history__empty-title">
            Sin situaciones cerradas {period.summaryPhrase}
          </p>
          <p className="problem-history__empty-hint">
            Pruebe con un período más amplio para consultar cierres anteriores.
          </p>
          <div className="problem-history__empty-actions">
            {cycleShortcuts(period).map((option) => (
              <button
                key={option.key}
                type="button"
                className="problem-history__empty-action"
                onClick={() => onPeriodChange(option)}
              >
                Ver {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ul className="problem-history__list" data-testid="history-list">
          {items.map((entry) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              selected={entry.id === selectedProblemId}
              onSelect={onSelect}
              labelByCode={labelByCode}
              colorByCode={colorByCode}
            />
          ))}
        </ul>
      )}

      {items.length > 0 && quedanMas && (
        <button
          type="button"
          className="problem-history__more"
          data-testid="history-more"
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Cargando…' : `Ver más (${total - items.length})`}
        </button>
      )}
    </div>
  )
}
