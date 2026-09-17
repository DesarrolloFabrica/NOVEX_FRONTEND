import { ProblemDetail } from '@/modules/operational-cards/components/ProblemDetail'
import { ProblemActions } from '@/modules/operational-cards/components/ProblemActions'
import { ReportProblemForm } from '@/modules/operational-cards/components/ReportProblemForm'
import type { ReportProblemFormProps } from '@/modules/operational-cards/components/ReportProblemForm'
import type { ProblemSectionId } from '@/modules/operational-cards/types/problem-detail.types'
import type {
  OperationalCardsLevel2State,
  OperationalPanelMode,
  OperationalSubmissionState,
} from '@/modules/operational-cards/types/operational-cards.state'

/**
 * PANEL DERECHO: dos flujos y un reposo.
 *
 *   idle    Indicación breve de qué se puede hacer. NO es un tercer formulario.
 *   report  Formulario de reporte para la coordinación seleccionada.
 *   detail  Detalle completo del problema, con sus acciones debajo.
 *
 * El modo llega decidido desde el estado y NO se deduce de la selección: pulsar
 * una carta no abre el formulario, eso lo hace «Reportar problema».
 *
 * REUTILIZA `ProblemDetail` tal cual, con su carga por secciones y sus
 * servicios. No se duplica su lógica: lo que se añade son las ACCIONES, en un
 * componente aparte que vive debajo.
 *
 * Mientras un detalle carga o falla, el panel CONSERVA el modo detalle y muestra
 * su estado. Nunca cambia solo al formulario, que borraría el contexto de lo que
 * el usuario estaba intentando abrir.
 */

export interface OperationalActionPanelProps {
  mode: OperationalPanelMode
  /** Hay una coordinación seleccionada en las cartas. */
  hasCoordination: boolean
  level2: OperationalCardsLevel2State
  submission: OperationalSubmissionState
  learningDraft: string
  onToggleSection: (section: ProblemSectionId) => void
  onLearningChange: (value: string) => void
  onResolve: () => void
  onReportAnother: () => void
  onRetryDetail: () => void
  reportForm: ReportProblemFormProps
}

export function OperationalActionPanel({
  mode,
  hasCoordination,
  level2,
  submission,
  learningDraft,
  onToggleSection,
  onLearningChange,
  onResolve,
  onReportAnother,
  onRetryDetail,
  reportForm,
}: OperationalActionPanelProps) {
  if (mode === 'report') {
    return (
      <div
        className="action-panel"
        data-testid="action-panel"
        data-tour="action-panel"
        data-mode="report"
      >
        <ReportProblemForm {...reportForm} />
      </div>
    )
  }

  if (mode === 'detail') {
    return (
      <div
        className="action-panel"
        data-testid="action-panel"
        data-tour="action-panel"
        data-mode="detail"
      >
        {/* El detalle, con su propia carga y sus secciones perezosas. */}
        <ProblemDetail level2={level2} onToggleSection={onToggleSection} />

        {/*
          Un fallo al cargar el detalle NO devuelve al formulario: se conserva
          el contexto y se ofrece reintentar el mismo problema.
        */}
        {level2.status === 'error' && (
          <div className="action-panel__retry">
            <button
              type="button"
              data-testid="detail-retry"
              onClick={onRetryDetail}
            >
              Reintentar
            </button>
            <button
              type="button"
              className="action-panel__secondary"
              data-testid="report-another-button"
              onClick={onReportAnother}
            >
              Reportar otro problema
            </button>
          </div>
        )}

        {/* Las acciones solo existen con el detalle ya cargado. */}
        {level2.status === 'ready' && level2.detail && (
          <ProblemActions
            detail={level2.detail}
            learningDraft={learningDraft}
            submission={submission}
            onLearningChange={onLearningChange}
            onResolve={onResolve}
            onReportAnother={onReportAnother}
          />
        )}
      </div>
    )
  }

  // ---------- REPOSO ----------
  return (
    <div
      className="action-panel"
      data-testid="action-panel"
      data-tour="action-panel"
      data-mode="idle"
    >
      <div className="action-panel__idle" data-testid="action-panel-idle">
        <h2 className="action-panel__idle-heading">Reportar o consultar</h2>
        <p className="action-panel__idle-text">
          {hasCoordination
            ? 'Elija un problema de la lista para ver su detalle, o pulse «Reportar problema» para registrar uno nuevo en esta coordinación.'
            : 'Seleccione una coordinación en las cartas para ver sus problemas, o pulse «Reportar problema» para registrar uno nuevo.'}
        </p>
      </div>
    </div>
  )
}
