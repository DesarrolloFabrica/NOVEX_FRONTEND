import { useState } from 'react'
import type { MyReport } from '@/modules/operational-cards/types/my-reports.types'
import type { MyReportsState } from '@/modules/operational-cards/types/operational-cards.state'
import { ProblemDossierCard } from '@/modules/operational-cards/components/ProblemDossierCard'
import {
  buildProblemRowAccessibleName,
  resolveProblemMark,
} from '@/modules/operational-cards/data/coordinationMark'
import {
  DOSSIER_HISTORY_STATUS_LABEL,
  DOSSIER_SEVERITY_LABEL,
  isDossierClosedStatus,
} from '@/modules/operational-cards/data/problemDossier'

/**
 * «MIS REPORTES»: lo que ESTE usuario ha reportado, en cualquier coordinación.
 *
 * Solo consulta y apertura de detalle. Los accesos de CREACIÓN viven en el
 * panel «Reportar o consultar» (idle), no aquí.
 */

export interface MyReportsPanelProps {
  myReports: MyReportsState
  selectedProblemId: string | null
  onSelect: (problemId: string, coordinationCode: string | null) => void
  onLoadMore: () => void
  /** Nombres de presentación por code, para la línea de origen. */
  labelByCode?: Readonly<Record<string, string>>
  /** Colores de overview por code (talón de identidad). */
  colorByCode?: Readonly<Record<string, string>>
}

function MyReportRow({
  report,
  selected,
  onSelect,
  labelByCode,
  colorByCode,
}: {
  report: MyReport
  selected: boolean
  onSelect: MyReportsPanelProps['onSelect']
  labelByCode?: MyReportsPanelProps['labelByCode']
  colorByCode?: MyReportsPanelProps['colorByCode']
}) {
  const mark = resolveProblemMark({
    reportKind: report.reportKind,
    coordinationCode: report.coordinationCode,
    affectedCoordinationCode: report.affectedCoordinationCode,
    viewpointCode: null,
    labelByCode,
    coordinationName: report.coordinationName,
    affectedCoordinationName: report.affectedCoordinationName,
  })
  const statusLabel =
    DOSSIER_HISTORY_STATUS_LABEL[report.status] ?? report.status
  const severityLabel = DOSSIER_SEVERITY_LABEL[report.severity]
  const closed = isDossierClosedStatus(report.status)

  return (
    <li>
      <ProblemDossierCard
        id={report.id}
        title={report.title}
        severity={report.severity}
        status={report.status}
        reportKind={report.reportKind}
        mark={mark}
        severityLabel={severityLabel}
        statusLabel={statusLabel}
        accessibleName={buildProblemRowAccessibleName({
          title: report.title,
          mark,
          severityLabel,
          statusLabel,
        })}
        selected={selected}
        closed={closed}
        colorByCode={colorByCode}
        surfaceClassName="my-reports__row"
        testId="my-report-row"
        originTestId="my-report-origin"
        severityTestId="my-report-severity"
        statusTestId="my-report-status"
        unassigned={report.coordinationCode === null}
        onClick={() =>
          onSelect(
            report.id,
            report.reportKind === 'INTER_COORDINATION'
              ? (report.affectedCoordinationCode ?? report.coordinationCode)
              : report.coordinationCode,
          )
        }
      />
    </li>
  )
}

export function MyReportsPanel({
  myReports,
  selectedProblemId,
  onSelect,
  onLoadMore,
  labelByCode,
  colorByCode,
}: MyReportsPanelProps) {
  const { status, items, total, loadingMore, errorMessage } = myReports
  const quedanMas = items.length < total
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="my-reports"
      data-testid="my-reports"
      data-surface="my-reports"
      data-status={status}
      data-expanded={expanded ? 'true' : undefined}
    >
      <header className="my-reports__header">
        <h2 className="my-reports__heading">Mis reportes</h2>
        {status === 'ready' && (
          <span className="my-reports__count" data-testid="my-reports-count">
            {total}
          </span>
        )}
      </header>

      {status === 'loading' && (
        <p className="my-reports__note" data-testid="my-reports-loading">
          Consultando sus reportes…
        </p>
      )}

      {status === 'error' && (
        <p
          className="my-reports__note my-reports__note--error"
          data-testid="my-reports-error"
          role="status"
        >
          {errorMessage ?? 'No pudimos cargar sus reportes.'}
        </p>
      )}

      {status === 'ready' && items.length === 0 && (
        <p className="my-reports__note" data-testid="my-reports-empty">
          Todavía no ha reportado ningún problema.
        </p>
      )}

      {items.length > 0 && (
        <ul className="my-reports__list" data-testid="my-reports-list">
          {items.map((report) => (
            <MyReportRow
              key={report.id}
              report={report}
              selected={report.id === selectedProblemId}
              onSelect={onSelect}
              labelByCode={labelByCode}
              colorByCode={colorByCode}
            />
          ))}
        </ul>
      )}

      {/* Carga incremental: nunca se descarga todo el historial de golpe. */}
      {items.length > 0 && quedanMas && (
        <button
          type="button"
          className="my-reports__more"
          data-testid="my-reports-more"
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Cargando…' : `Ver más (${total - items.length})`}
        </button>
      )}

      {/* Un fallo al pedir una página más no borra lo ya cargado. */}
      {items.length > 0 && errorMessage && (
        <p
          className="my-reports__note my-reports__note--error"
          data-testid="my-reports-partial-error"
          role="status"
        >
          {errorMessage}
        </p>
      )}

      {items.length > 0 && (
        <button
          type="button"
          className="panel-expand-toggle"
          data-testid="my-reports-expand"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Contraer' : 'Expandir'}
        </button>
      )}
    </div>
  )
}
