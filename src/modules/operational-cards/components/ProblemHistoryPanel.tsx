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
  emptyHistoryHint,
  emptyHistoryMessage,
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
  const resolver = entry.resolvedByUserName
    ? `Resuelto por ${entry.resolvedByUserName}`
    : 'Resolutor no registrado'

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
      <p className="problem-history__meta" data-testid="history-row-meta">
        <span>{closedLabel}</span>
        <span aria-hidden="true"> · </span>
        <span>{resolver}</span>
      </p>
      {entry.learningPreview ? (
        <p className="problem-history__learning" data-testid="history-row-learning">
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
}: ProblemHistoryPanelProps) {
  const { status, items, total, loadingMore, errorMessage, period } = history
  const quedanMas = items.length < total
  const summary =
    status === 'ready' ? summaryCountLabel(total, period) : null

  return (
    <div
      className="problem-history"
      data-testid="problem-history"
      data-surface="problem-history"
      data-status={status}
    >
      <header className="problem-history__header">
        <div className="problem-history__header-row">
          <h2 className="problem-history__heading">Historial de problemas</h2>
          <button
            type="button"
            className="problem-history__back"
            data-testid="history-back"
            onClick={onBack}
          >
            Volver
          </button>
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
          Consultando problemas cerrados…
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
          <p className="problem-history__empty-title">
            {emptyHistoryMessage()}
          </p>
          <p className="problem-history__empty-hint">
            {emptyHistoryHint(period)}
          </p>
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
