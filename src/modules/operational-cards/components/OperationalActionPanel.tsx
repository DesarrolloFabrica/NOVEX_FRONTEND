import { ProblemDetail } from '@/modules/operational-cards/components/ProblemDetail'
import { ProblemActions } from '@/modules/operational-cards/components/ProblemActions'
import { ReportProblemForm } from '@/modules/operational-cards/components/ReportProblemForm'
import type { ReportProblemFormProps } from '@/modules/operational-cards/components/ReportProblemForm'
import { ProblemHistoryPanel } from '@/modules/operational-cards/components/ProblemHistoryPanel'
import type {
  LazyProblemSectionId,
  ProblemSectionId,
} from '@/modules/operational-cards/types/problem-detail.types'
import type {
  OperationalCardsLevel2State,
  OperationalPanelMode,
  OperationalSubmissionState,
  ReportFormKind,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { ProblemHistoryState } from '@/modules/operational-cards/types/problem-history.types'
import type { ProblemHistoryPeriod } from '@/modules/operational-cards/types/problem-history.types'

/**
 * PANEL DERECHO:
 *
 *   idle     Título + accesos compactos (crear / historial) en zona segura.
 *   report   Formulario del tipo elegido.
 *   history  Lista CLOSED con filtro de closedAt.
 *   detail   Expediente; sin accesos de creación ni historial.
 */

export interface OperationalActionPanelProps {
  mode: OperationalPanelMode
  reportFormKind: ReportFormKind | null
  hasCoordination: boolean
  selectedCoordinationCode: string | null
  level2: OperationalCardsLevel2State
  submission: OperationalSubmissionState
  learningDraft: string
  history: ProblemHistoryState
  onToggleSection: (section: ProblemSectionId) => void
  onRetrySection: (section: LazyProblemSectionId) => void
  onLearningChange: (value: string) => void
  onResolve: () => void
  onAdvanceToInProgress: () => void
  onReportInternal: () => void
  onReportDependency: () => void
  onCancelReport: () => void
  onCloseDetail: () => void
  onRetryDetail: () => void
  onOpenHistory: () => void
  onCloseHistory: () => void
  onHistoryPeriodChange: (period: ProblemHistoryPeriod) => void
  onSelectHistoryProblem: (problemId: string) => void
  onLoadMoreHistory: () => void
  onRetryHistory: () => void
  reportForm: ReportProblemFormProps
  canCreate?: boolean
  /**
   * Avance y cierre en el detalle. False en shells de solo lectura
   * (DIRECTOR / ADMIN) aunque el API enviara flags de escritura.
   */
  allowLifecycleActions?: boolean
  /** Quien puede consultar situaciones ve el acceso al historial. */
  canViewHistory?: boolean
  idleHint?: string | null
  labelByCode?: Readonly<Record<string, string>>
  colorByCode?: Readonly<Record<string, string>>
}

export function OperationalActionPanel({
  mode,
  reportFormKind,
  hasCoordination,
  selectedCoordinationCode,
  level2,
  submission,
  learningDraft,
  history,
  onToggleSection,
  onRetrySection,
  onLearningChange,
  onResolve,
  onAdvanceToInProgress,
  onReportInternal,
  onReportDependency,
  onCancelReport,
  onCloseDetail,
  onRetryDetail,
  onOpenHistory,
  onCloseHistory,
  onHistoryPeriodChange,
  onSelectHistoryProblem,
  onLoadMoreHistory,
  onRetryHistory,
  reportForm,
  canCreate = false,
  allowLifecycleActions = true,
  canViewHistory = false,
  idleHint = null,
  labelByCode,
  colorByCode,
}: OperationalActionPanelProps) {
  if (mode === 'report' && reportFormKind && canCreate) {
    return (
      <div
        className="action-panel"
        data-testid="action-panel"
        data-surface="action-panel"
        data-mode="report"
        data-report-kind={reportFormKind}
      >
        <ReportProblemForm
          {...reportForm}
          reportKind={reportFormKind}
          onCancel={onCancelReport}
        />
      </div>
    )
  }

  if (mode === 'history') {
    return (
      <div
        className="action-panel"
        data-testid="action-panel"
        data-surface="action-panel"
        data-mode="history"
      >
        <ProblemHistoryPanel
          history={history}
          selectedProblemId={level2.problemId}
          labelByCode={labelByCode}
          colorByCode={colorByCode}
          onPeriodChange={onHistoryPeriodChange}
          onSelect={onSelectHistoryProblem}
          onLoadMore={onLoadMoreHistory}
          onRetry={onRetryHistory}
          onBack={onCloseHistory}
        />
      </div>
    )
  }

  if (mode === 'detail') {
    return (
      <div
        className="action-panel"
        data-testid="action-panel"
        data-surface="action-panel"
        data-mode="detail"
      >
        <div className="action-panel__detail-nav">
          <button
            type="button"
            className="action-panel__detail-back"
            data-testid="detail-back"
            onClick={onCloseDetail}
          >
            Volver
          </button>
        </div>
        <ProblemDetail
          level2={level2}
          selectedCoordinationCode={selectedCoordinationCode}
          onToggleSection={onToggleSection}
          onRetrySection={onRetrySection}
        />

        {level2.status === 'error' && (
          <div className="action-panel__retry">
            <button
              type="button"
              data-testid="detail-retry"
              onClick={onRetryDetail}
            >
              Reintentar
            </button>
          </div>
        )}

        {level2.status === 'ready' && level2.detail && (
          <ProblemActions
            detail={level2.detail}
            learningDraft={learningDraft}
            submission={submission}
            onLearningChange={onLearningChange}
            onResolve={onResolve}
            onAdvanceToInProgress={onAdvanceToInProgress}
            allowLifecycleActions={allowLifecycleActions}
          />
        )}
      </div>
    )
  }

  const defaultHint = canCreate
    ? hasCoordination
      ? 'También puede seleccionar un problema de las listas para consultar su detalle.'
      : 'Seleccione una coordinación en las cartas para registrar, o elija un reporte propio para consultar su detalle.'
    : hasCoordination
      ? 'Seleccione un problema de las listas para consultar su detalle.'
      : 'Seleccione una coordinación en las cartas para ver sus problemas, o un reporte propio para abrir su detalle.'

  const consultOnly = canViewHistory && !canCreate

  return (
    <div
      className="action-panel"
      data-testid="action-panel"
      data-surface="action-panel"
      data-mode="idle"
      data-can-create={canCreate ? 'true' : 'false'}
      data-can-view-history={canViewHistory ? 'true' : 'false'}
      data-consult-only={consultOnly ? 'true' : 'false'}
      data-allow-lifecycle={allowLifecycleActions ? 'true' : 'false'}
    >
      <div
        className={
          consultOnly
            ? 'action-panel__idle action-panel__idle--consult'
            : 'action-panel__idle'
        }
        data-testid="action-panel-idle"
      >
        <h2 className="action-panel__idle-heading">Reportar o consultar</h2>

        {consultOnly ? (
          <>
            <p className="action-panel__idle-text" data-testid="consult-idle-copy">
              {idleHint ??
                'Consulte problemas ya cerrados por período (semana, mes o ciclo) y revise el aprendizaje registrado.'}
            </p>
            <div className="action-panel__cta-safe" data-testid="report-cta-group">
              <button
                type="button"
                className="action-panel__cta action-panel__cta--history action-panel__cta--consult"
                data-testid="history-open-button"
                data-surface="history-open"
                onClick={onOpenHistory}
              >
                Historial de problemas
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="action-panel__cta-safe" data-testid="report-cta-group">
              {canCreate ? (
                <>
                  <button
                    type="button"
                    className="action-panel__cta"
                    data-testid="report-internal-button"
                    data-surface="report-internal"
                    onClick={onReportInternal}
                    disabled={!hasCoordination}
                  >
                    Problema interno
                  </button>
                  <button
                    type="button"
                    className="action-panel__cta action-panel__cta--secondary"
                    data-testid="report-dependency-button"
                    data-surface="report-dependency"
                    onClick={onReportDependency}
                    disabled={!hasCoordination}
                  >
                    Dependencia de otra coordinación
                  </button>
                </>
              ) : null}

              {canViewHistory ? (
                <button
                  type="button"
                  className="action-panel__cta action-panel__cta--history"
                  data-testid="history-open-button"
                  data-surface="history-open"
                  onClick={onOpenHistory}
                >
                  Historial de problemas
                </button>
              ) : null}

              {canCreate && !hasCoordination ? (
                <p
                  className="action-panel__cta-note"
                  data-testid="report-cta-need-card"
                >
                  Seleccione una coordinación en las cartas para reportar.
                </p>
              ) : null}
            </div>

            <p className="action-panel__idle-text">{idleHint ?? defaultHint}</p>
          </>
        )}
      </div>
    </div>
  )
}
