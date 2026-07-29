import { useMemo, useState } from 'react'
import type { AnalysisHistoryResponse } from '@/modules/api/analysis.api'
import { compareAnalysisVersions } from '@/modules/api/analysis.api'
import type { SituationAIAnalysisResponse } from '@/modules/api/types/analysis.types'
import type { SituationImpactAssessmentResponse } from '@/modules/situations/types/situation.types'
import { AiRecommendationsReadOnly } from '@/modules/monitoring/components/AiRecommendationsReadOnly'
import type { SituationRecommendation } from '@/modules/api/recommendations.api'
import {
  formatManagementDate,
  SITUATION_SEVERITY_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'
import { getErrorMessage } from '@/shared/utils/error'

interface AiIntelligenceSectionProps {
  situationId: string
  analysis: SituationAIAnalysisResponse | null
  impact: SituationImpactAssessmentResponse | null
  recommendations: SituationRecommendation[]
  analysisHistory: AnalysisHistoryResponse
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${Math.round(value * 100)}%`
}

export function AiIntelligenceSection({
  situationId,
  analysis,
  impact,
  recommendations,
  analysisHistory,
}: AiIntelligenceSectionProps) {
  const [compareError, setCompareError] = useState<string | null>(null)
  const [compareSummary, setCompareSummary] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)

  const result = analysis?.analysis
  const sessions = analysisHistory.items

  const comparePair = useMemo(() => {
    if (sessions.length < 2) return null
    const sorted = [...sessions].sort(
      (a, b) => b.analysisVersion - a.analysisVersion,
    )
    return {
      fromVersion: sorted[1].analysisVersion,
      toVersion: sorted[0].analysisVersion,
    }
  }, [sessions])

  const handleCompare = async () => {
    if (!comparePair) return
    setComparing(true)
    setCompareError(null)
    try {
      const response = await compareAnalysisVersions(
        situationId,
        comparePair.fromVersion,
        comparePair.toVersion,
      )
      const confidenceDelta = response.differences?.confidence?.delta
      setCompareSummary(
        `Comparación v${comparePair.fromVersion} → v${comparePair.toVersion}` +
          (typeof confidenceDelta === 'number'
            ? ` · Δ confianza ${Math.round(confidenceDelta * 100)} pts`
            : ''),
      )
    } catch (error) {
      setCompareSummary(null)
      setCompareError(getErrorMessage(error))
    } finally {
      setComparing(false)
    }
  }

  return (
    <section className="novex-ops-section novex-ops-intelligence">
      <header>
        <h3>Inteligencia IA</h3>
        <p>Asesoría estratégica para apoyar la decisión operacional.</p>
      </header>

      {!result ? (
        <p className="novex-empty-signal">
          Esta situación aún no tiene un análisis IA disponible.
        </p>
      ) : (
        <div className="novex-ops-intelligence__grid">
          <article>
            <h4>Resumen ejecutivo</h4>
            <p>{result.executiveSummary.summary}</p>
            {result.executiveSummary.keyPoints?.length ? (
              <ul>
                {result.executiveSummary.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
          </article>

          <article>
            <h4>Impacto</h4>
            <p>{impact?.summary ?? result.impactAssessment.summary}</p>
            <small>
              Severidad IA:{' '}
              {SITUATION_SEVERITY_LABEL[
                result.incidentClassification.operationalSeverity
              ] ?? result.incidentClassification.operationalSeverity}
              {' · '}
              Confianza: {formatConfidence(result.confidence.overall)}
            </small>
          </article>

          <article>
            <h4>Causa raíz</h4>
            <p>{result.rootCause.summary}</p>
          </article>

          <article>
            <h4>Hipótesis</h4>
            {result.rootCause.hypotheses.length === 0 ? (
              <p className="novex-empty-signal">Sin hipótesis registradas.</p>
            ) : (
              <ul>
                {result.rootCause.hypotheses.map((hypothesis) => (
                  <li key={hypothesis.statement}>
                    <strong>{hypothesis.statement}</strong>
                    <span>Probabilidad: {hypothesis.likelihood}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="novex-ops-intelligence__conclusion">
            <h4>Conclusión</h4>
            <p>{result.executiveConclusion.conclusion}</p>
            {result.executiveConclusion.recommendedNextStep ? (
              <small>
                Siguiente paso: {result.executiveConclusion.recommendedNextStep}
              </small>
            ) : null}
          </article>
        </div>
      )}

      <AiRecommendationsReadOnly recommendations={recommendations} />

      <section className="novex-ops-versioning">
        <header>
          <h4>Versionado IA</h4>
          <p>Historial y comparación de análisis.</p>
        </header>
        {sessions.length === 0 ? (
          <p className="novex-empty-signal">Sin historial de análisis.</p>
        ) : (
          <ul className="novex-ops-versioning__list">
            {sessions.map((session) => (
              <li key={session.sessionId}>
                <div>
                  <strong>Versión {session.analysisVersion}</strong>
                  <span>{formatManagementDate(session.createdAt)}</span>
                </div>
                <p>
                  {session.provider} · {session.model}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="novex-ops-versioning__actions">
          <button
            type="button"
            disabled={!comparePair || comparing}
            onClick={() => void handleCompare()}
          >
            {comparing ? 'Comparando…' : 'Comparar versiones'}
          </button>
          {compareSummary ? <span role="status">{compareSummary}</span> : null}
          {compareError ? (
            <span role="alert">{compareError}</span>
          ) : null}
        </div>
      </section>
    </section>
  )
}
