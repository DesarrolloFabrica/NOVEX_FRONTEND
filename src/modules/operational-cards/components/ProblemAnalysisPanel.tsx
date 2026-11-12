import type { OperationalSubmissionState } from '@/modules/operational-cards/types/operational-cards.state'
import type { ProblemAnalysisSectionState } from '@/modules/operational-cards/types/problem-analysis.types'
import type { ProblemSectionId } from '@/modules/operational-cards/types/problem-detail.types'
import { ProblemDetailSection } from '@/modules/operational-cards/components/ProblemDetailSection'
import { isAnalyzableSituationStatus } from '@/modules/operational-cards/types/problem-analysis.types'

/**
 * Sección contextual «Análisis inteligente» dentro del detalle.
 *
 * Jerarquía secundaria frente a estado/responsable/acciones. Todo el contenido
 * se presenta como sugerencia de IA: no sustituye afectaciones confirmadas ni
 * cambia severidad, estado o responsable.
 *
 * Nunca renderiza `promptSnapshot` (ni para ADMIN): queda para auditoría.
 */

export interface ProblemAnalysisPanelProps {
  situationId: string
  situationStatus: string
  analysis: ProblemAnalysisSectionState
  expanded: readonly ProblemSectionId[]
  onToggleSection: (section: ProblemSectionId) => void
  canExecute: boolean
  submission: OperationalSubmissionState
  onExecute: () => void
  onRetry: () => void
  onRetryHistory: () => void
  /** Conteo de afectaciones confirmadas del expediente (hechos). */
  confirmedConsequenceCount: number
}

function severityLabel(value: string): string {
  switch (value) {
    case 'CRITICAL':
      return 'Crítica'
    case 'HIGH':
      return 'Alta'
    case 'MEDIUM':
      return 'Media'
    case 'LOW':
      return 'Baja'
    default:
      return value
  }
}

export function ProblemAnalysisPanel({
  situationId,
  situationStatus,
  analysis,
  expanded,
  onToggleSection,
  canExecute,
  submission,
  onExecute,
  onRetry,
  onRetryHistory,
  confirmedConsequenceCount,
}: ProblemAnalysisPanelProps) {
  const isExpanded = expanded.includes('ai-analysis')
  const executing =
    submission.status === 'sending' &&
    submission.kind === 'ai-analysis' &&
    submission.targetKey === situationId
  const executeError =
    submission.status === 'error' &&
    submission.kind === 'ai-analysis' &&
    submission.targetKey === situationId
      ? submission.errorMessage
      : null

  const latest = analysis.latest
  const closedLike = !isAnalyzableSituationStatus(situationStatus)
  const hint =
    analysis.status === 'ready' && latest
      ? `v${latest.analysisVersion}`
      : analysis.status === 'ready'
        ? 'Sin informe'
        : null

  return (
    <div
      className="problem-analysis"
      data-testid="problem-analysis"
      data-situation={situationId}
      data-analysis-status={analysis.status}
    >
      <ProblemDetailSection
        id="ai-analysis"
        title="Análisis inteligente"
        hint={hint}
        expanded={isExpanded}
        onToggle={onToggleSection}
      >
        <p className="problem-analysis__disclaimer" role="note">
          Sugerencias de inteligencia artificial. No modifican el estado, la
          severidad ni el responsable de la situación. Los hechos confirmados
          en su detalle siguen siendo la fuente operativa.
        </p>

        {analysis.status === 'loading' || analysis.status === 'idle' ? (
          <p
            className="problem-analysis__status"
            data-testid="analysis-loading"
          >
            Cargando análisis…
          </p>
        ) : null}

        {analysis.status === 'error' ? (
          <div className="problem-analysis__error" role="alert">
            <p data-testid="analysis-error">
              {analysis.errorMessage ?? 'No pudimos cargar el análisis.'}
            </p>
            <button
              type="button"
              className="problem-analysis__retry"
              data-testid="analysis-retry"
              onClick={onRetry}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {analysis.status === 'ready' && !latest ? (
          <p
            className="problem-analysis__status"
            data-testid="analysis-empty"
          >
            {closedLike
              ? 'Esta situación no tiene un análisis registrado.'
              : 'Aún no hay un análisis para esta situación.'}
          </p>
        ) : null}

        {analysis.status === 'ready' && latest ? (
          <div
            className="problem-analysis__body"
            data-testid="analysis-ready"
            data-version={latest.analysisVersion}
          >
            <p className="problem-analysis__meta">
              Versión {latest.analysisVersion}
              {latest.isLatest ? ' (vigente)' : ''} · confianza{' '}
              {Math.round(latest.confidenceOverall * 100)}% ·{' '}
              <span data-testid="analysis-suggestion-tag">Sugerencia de IA</span>
            </p>

            <section className="problem-analysis__block">
              <h5 className="problem-analysis__block-title">
                Resumen sugerido
              </h5>
              <p className="problem-analysis__headline">{latest.headline}</p>
              <p className="problem-analysis__summary">{latest.summary}</p>
              {latest.keyPoints.length > 0 ? (
                <ul className="problem-analysis__list">
                  {latest.keyPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section className="problem-analysis__block">
              <h5 className="problem-analysis__block-title">
                Impactos sugeridos
              </h5>
              <p className="problem-analysis__contrast">
                Afectaciones confirmadas en la situación:{' '}
                <strong data-testid="analysis-confirmed-count">
                  {confirmedConsequenceCount}
                </strong>
                . Lo siguiente son coordinaciones e impactos sugeridos por IA.
              </p>
              {latest.suggestedCoordinations.length === 0 ? (
                <p className="problem-analysis__status">
                  Sin coordinaciones sugeridas.
                </p>
              ) : (
                <ul
                  className="problem-analysis__list"
                  data-testid="analysis-suggested-coordinations"
                >
                  {latest.suggestedCoordinations.map((item) => (
                    <li key={`${item.coordinationCode}-${item.description}`}>
                      <span className="problem-analysis__chip">
                        sugerido
                      </span>{' '}
                      <strong>{item.coordinationCode}</strong> ·{' '}
                      {severityLabel(item.impactLevel)} — {item.description}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="problem-analysis__block">
              <h5 className="problem-analysis__block-title">
                Riesgos inmediatos (sugeridos)
              </h5>
              {latest.immediateRisks.length === 0 ? (
                <p className="problem-analysis__status">Sin riesgos listados.</p>
              ) : (
                <ul
                  className="problem-analysis__list"
                  data-testid="analysis-risks"
                >
                  {latest.immediateRisks.map((risk) => (
                    <li key={`${risk.title}-${risk.description}`}>
                      <strong>{risk.title}</strong> (
                      {severityLabel(risk.severity)}) — {risk.description}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="problem-analysis__block">
              <h5 className="problem-analysis__block-title">
                Recomendaciones (sugeridas)
              </h5>
              {latest.recommendations.length === 0 ? (
                <p className="problem-analysis__status">
                  Sin recomendaciones listadas.
                </p>
              ) : (
                <ul
                  className="problem-analysis__list"
                  data-testid="analysis-recommendations"
                >
                  {latest.recommendations.map((rec) => (
                    <li key={`${rec.title}-${rec.description}`}>
                      <strong>{rec.title}</strong> (
                      {severityLabel(rec.priority)}) — {rec.description}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        {canExecute ? (
          <div className="problem-analysis__actions">
            <button
              type="button"
              className="problem-analysis__execute"
              data-testid="analysis-execute"
              disabled={executing}
              aria-busy={executing}
              onClick={onExecute}
            >
              {executing
                ? 'Analizando…'
                : latest
                  ? 'Volver a analizar'
                  : 'Ejecutar análisis'}
            </button>
            {executeError ? (
              <p
                className="problem-analysis__error-inline"
                role="alert"
                data-testid="analysis-execute-error"
              >
                {executeError}
              </p>
            ) : null}
          </div>
        ) : closedLike ? (
          <p
            className="problem-analysis__status"
            data-testid="analysis-closed-note"
          >
            Las situaciones cerradas, resueltas o anuladas no admiten un nuevo
            análisis. Puede consultar el historial si existe.
          </p>
        ) : null}

        <section
          className="problem-analysis__history"
          data-testid="analysis-history"
          aria-label="Historial de versiones de análisis"
        >
          <h5 className="problem-analysis__block-title">
            Historial de versiones
          </h5>
          {analysis.historyStatus === 'loading' ||
          analysis.historyStatus === 'idle' ? (
            <p className="problem-analysis__status">Cargando historial…</p>
          ) : null}
          {analysis.historyStatus === 'error' ? (
            <div className="problem-analysis__error" role="alert">
              <p>
                {analysis.historyErrorMessage ??
                  'No pudimos cargar el historial.'}
              </p>
              <button
                type="button"
                className="problem-analysis__retry"
                data-testid="analysis-history-retry"
                onClick={onRetryHistory}
              >
                Reintentar historial
              </button>
            </div>
          ) : null}
          {analysis.historyStatus === 'ready' &&
          analysis.history.length === 0 ? (
            <p className="problem-analysis__status">Sin versiones previas.</p>
          ) : null}
          {analysis.historyStatus === 'ready' &&
          analysis.history.length > 0 ? (
            <ol className="problem-analysis__history-list">
              {analysis.history.map((item) => (
                <li key={item.sessionId}>
                  v{item.analysisVersion}
                  {item.isLatest ? ' · vigente' : ''} ·{' '}
                  {Math.round(item.confidence * 100)}% · {item.provider}
                  {/* promptSnapshot deliberadamente omitido */}
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      </ProblemDetailSection>
    </div>
  )
}
