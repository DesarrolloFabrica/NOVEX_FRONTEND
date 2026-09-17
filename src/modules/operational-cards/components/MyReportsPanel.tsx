import type { MyReport } from '@/modules/operational-cards/types/my-reports.types'
import type { MyReportsState } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * «MIS REPORTES»: lo que ESTE usuario ha reportado, en cualquier coordinación.
 *
 * Es la única lista de la escena que NO depende de la carta seleccionada:
 * cambiar de coordinación no la recarga ni la filtra. Por eso vive en su propia
 * rama de estado y su contexto sobrevive a la navegación por cartas.
 *
 * Presentacional puro: recibe la rama ya cargada y emite selección. Quién es el
 * autor lo decide el backend con el usuario autenticado; aquí no hay ningún
 * identificador de autor que enviar ni con el que filtrar.
 */

const SEVERITY_LABEL = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
} as const

/** Incluye los estados cerrados: esta lista es el historial, no la bandeja. */
const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Registrada',
  IN_PROGRESS: 'En atención',
  RESOLVED: 'En atención',
  CLOSED: 'Solucionada',
}

export interface MyReportsPanelProps {
  myReports: MyReportsState
  selectedProblemId: string | null
  onSelect: (problemId: string, coordinationCode: string | null) => void
  onReportProblem: () => void
  onLoadMore: () => void
}

function MyReportRow({
  report,
  selected,
  onSelect,
}: {
  report: MyReport
  selected: boolean
  onSelect: MyReportsPanelProps['onSelect']
}) {
  /*
   * «Sin coordinación» es un estado LEGÍTIMO del dominio: los reportes
   * históricos de analista nacieron sin área responsable. Se rotula como tal y
   * no se les atribuye ninguna coordinación.
   */
  const coordinacion = report.coordinationName ?? 'Sin coordinación'

  return (
    <li>
      <button
        type="button"
        className="my-reports__row"
        data-testid="my-report-row"
        data-problem-id={report.id}
        data-severity={report.severity}
        data-status={report.status}
        data-unassigned={report.coordinationCode === null ? 'true' : undefined}
        /* `aria-current`: señala cuál se está mirando, no conmuta un ajuste. */
        aria-current={selected ? 'true' : undefined}
        aria-label={`${report.title}. ${coordinacion}. ${
          STATUS_LABEL[report.status] ?? report.status
        }. Severidad ${SEVERITY_LABEL[report.severity]}.`}
        onClick={() => onSelect(report.id, report.coordinationCode)}
      >
        <span className="my-reports__title">{report.title}</span>
        <span className="my-reports__meta">
          <span className="my-reports__coordination">{coordinacion}</span>
          <span className="my-reports__status">
            {STATUS_LABEL[report.status] ?? report.status}
          </span>
        </span>
        {/* Misma representación de severidad que las demás listas. */}
        <span className="my-reports__severity" data-severity={report.severity}>
          {SEVERITY_LABEL[report.severity]}
        </span>
      </button>
    </li>
  )
}

export function MyReportsPanel({
  myReports,
  selectedProblemId,
  onSelect,
  onReportProblem,
  onLoadMore,
}: MyReportsPanelProps) {
  const { status, items, total, loadingMore, errorMessage } = myReports
  const quedanMas = items.length < total

  return (
    <div
      className="my-reports"
      data-testid="my-reports"
      data-tour="my-reports"
      data-status={status}
    >
      <header className="my-reports__header">
        <h2 className="my-reports__heading">Mis reportes</h2>
        {status === 'ready' && (
          <span className="my-reports__count" data-testid="my-reports-count">
            {total}
          </span>
        )}
      </header>

      {/*
        El botón de reportar vive AQUÍ y está siempre visible, también con la
        lista vacía: es la entrada al flujo, no una acción sobre la lista.
      */}
      <button
        type="button"
        className="my-reports__cta"
        data-testid="report-problem-button"
        data-tour="report-problem"
        onClick={onReportProblem}
      >
        Reportar problema
      </button>

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
    </div>
  )
}
