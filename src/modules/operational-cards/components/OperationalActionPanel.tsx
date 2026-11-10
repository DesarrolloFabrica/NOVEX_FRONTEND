import { ProblemDetail } from '@/modules/operational-cards/components/ProblemDetail'
import {
  ProblemActions,
  type SituationAdministrationHandlers,
} from '@/modules/operational-cards/components/ProblemActions'
import type { ProblemDetailProps } from '@/modules/operational-cards/components/ProblemDetail'
import { ReportProblemForm } from '@/modules/operational-cards/components/ReportProblemForm'
import type { ReportProblemFormProps } from '@/modules/operational-cards/components/ReportProblemForm'
import { ProblemHistoryPanel } from '@/modules/operational-cards/components/ProblemHistoryPanel'
import type { ConsequenceDraft } from '@/modules/operational-cards/services/problem-consequence.service'
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
  /** Registra una afectación del problema abierto; true si se confirmó. */
  onAddConsequence?: (draft: ConsequenceDraft) => Promise<boolean>
  /** Abre el formulario unificado de registro. */
  onReportSituation: () => void
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
  /**
   * Anulación / traslado administrativo. Independiente del ciclo de vida
   * operativo; solo el shell ADMIN lo cablea.
   */
  administration?: SituationAdministrationHandlers | null
  /**
   * Retiro de evidencias. Shells operativos; el historial retirado lo autoriza
   * el backend (ADMIN o UPDATE + alcance). `submission` lo aporta el panel.
   */
  evidenceActions?: Omit<
    NonNullable<ProblemDetailProps['evidenceActions']>,
    'submission'
  > | null
  /** Ámbito de borradores de motivo administrativo (id de usuario). */
  draftScope?: string | null
  /**
   * Análisis IA contextual. `null` = sin permiso de lectura; no se monta la
   * sección. `submission` lo aporta el panel.
   */
  analysisActions?: Omit<
    NonNullable<ProblemDetailProps['analysisActions']>,
    'submission'
  > | null
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
  onAddConsequence,
  onReportSituation,
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
  administration = null,
  evidenceActions = null,
  draftScope = null,
  analysisActions = null,
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
        data-tour="report-form"
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
        {/* La flecha de regreso vive en la primera línea del expediente. Puede
            volver a la lista o al historial, así que se nombra «Volver». */}
        <ProblemDetail
          level2={level2}
          onBack={onCloseDetail}
          backLabel="Volver"
          selectedCoordinationCode={selectedCoordinationCode}
          onToggleSection={onToggleSection}
          onRetrySection={onRetrySection}
          consequenceActions={
            // Shells de solo lectura (DIRECTOR / ADMIN) nunca escriben, aunque
            // el API enviara el indicador.
            allowLifecycleActions && onAddConsequence
              ? { submission, onSubmit: onAddConsequence }
              : null
          }
          evidenceActions={
            evidenceActions
              ? { ...evidenceActions, submission }
              : null
          }
          analysisActions={
            analysisActions
              ? { ...analysisActions, submission }
              : null
          }
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
            administration={administration}
            draftScope={draftScope}
            onRetryDetail={onRetryDetail}
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
                data-tour="history-open"
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
                <button
                  type="button"
                  className="action-panel__cta"
                  data-testid="report-situation-button"
                  data-tour="report-situation"
                  data-surface="report-situation"
                  onClick={onReportSituation}
                  disabled={!hasCoordination}
                >
                  Registrar situación
                </button>
              ) : null}

              {canViewHistory ? (
                <button
                  type="button"
                  className="action-panel__cta action-panel__cta--history"
                  data-testid="history-open-button"
                  data-tour="history-open"
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
