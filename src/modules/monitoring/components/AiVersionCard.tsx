import { useMemo, useState } from 'react'
import {
  compareAnalysisVersions,
  type AnalysisHistoryResponse,
} from '@/modules/api/analysis.api'
import { formatManagementDate } from '@/modules/monitoring/utils/situation-management.presentation'
import { getErrorMessage } from '@/shared/utils/error'

interface AiVersionCardProps {
  situationId: string
  history: AnalysisHistoryResponse
}

export function AiVersionCard({
  situationId,
  history,
}: AiVersionCardProps) {
  const [comparing, setComparing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const sessions = useMemo(
    () =>
      [...history.items].sort(
        (left, right) => right.analysisVersion - left.analysisVersion,
      ),
    [history.items],
  )
  const current = sessions[0] ?? null
  const previous = sessions[1] ?? null

  const compare = async () => {
    if (!current || !previous) return
    setComparing(true)
    setFeedback(null)
    try {
      const response = await compareAnalysisVersions(
        situationId,
        previous.analysisVersion,
        current.analysisVersion,
      )
      const delta = response.differences.confidence.delta
      setFeedback(
        `v${previous.analysisVersion} → v${current.analysisVersion} · Δ confianza ${Math.round(delta * 100)} pts`,
      )
    } catch (error) {
      setFeedback(getErrorMessage(error))
    } finally {
      setComparing(false)
    }
  }

  return (
    <section className="novex-ops-version-card">
      <div className="novex-ops-section-heading">
        <h2>Versionado IA</h2>
      </div>
      {current ? (
        <>
          <dl>
            <div>
              <dt>Versión actual</dt>
              <dd>v{current.analysisVersion}</dd>
            </div>
            <div>
              <dt>Modelo</dt>
              <dd>{current.model}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{formatManagementDate(current.createdAt)}</dd>
            </div>
          </dl>
          <button
            type="button"
            disabled={!previous || comparing}
            onClick={() => void compare()}
          >
            {comparing ? 'Comparando…' : 'Comparar versiones'}
          </button>
          {feedback ? <small role="status">{feedback}</small> : null}
        </>
      ) : (
        <p className="novex-empty-signal">Sin versiones disponibles.</p>
      )}
    </section>
  )
}
