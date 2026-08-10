import { useCallback, useEffect, useState } from 'react'
import { fetchSituation } from '@/modules/api/situations.api'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import {
  normalizeRoleCode,
  seesInstitutionalSituationRegistry,
} from '@/modules/auth/utils/roleExperience'
import { SituationDetailModal } from '@/modules/operational-events/components/SituationDetailModal'
import { SituationModalShell } from '@/modules/operational-events/components/SituationModalShell'
import { AnalysisErrorState } from '@/modules/operational-events/components/analysis/AnalysisErrorState'
import { SituationDetailSkeleton } from '@/modules/operational-events/components/analysis/SituationDetailSkeleton'
import { splitSituationDescription } from '@/modules/operational-events/utils/parseSituationDescription'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import {
  formatManagementDate,
} from '@/modules/monitoring/utils/situation-management.presentation'
import {
  mapAnalysisToInterpretation,
  mapSituationToOperationalEvent,
} from '@/modules/services/mappers/analysisPresentation.mapper'
import { loadAnalysis } from '@/modules/services/situationAnalysis.service'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { situationOwnerLabel } from '@/modules/situations/utils/situationOwner'
import { getErrorMessage } from '@/shared/utils/error'
import { isValidUuid } from '@/shared/utils/uuid'

interface ConnectedSituationDetailModalProps {
  situationId: string
  onClose: () => void
  /** Título ya visible en la lista, para no abrir el expediente en blanco. */
  title?: string
}

function SituationWithoutAnalysisModal({
  situation,
  onClose,
  showAuditTrail,
}: {
  situation: SituationResponse
  onClose: () => void
  showAuditTrail: boolean
}) {
  const { narrative } = splitSituationDescription(situation.description)

  return (
    <SituationModalShell label="Expediente sin análisis IA" onClose={onClose}>
      <header>
        <p>Expediente operativo</p>
        <h2>{situation.title}</h2>
      </header>
      {showAuditTrail ? (
        <section
          className="novex-sit-audit novex-sit-audit--shell"
          aria-label="Información de auditoría"
        >
          <div className="novex-sit-audit__item">
            <span>Coordinación</span>
            <strong>{situationOwnerLabel(situation)}</strong>
          </div>
          <div className="novex-sit-audit__item">
            <span>Registró</span>
            <strong>{situation.createdByUserName || 'Sin autor'}</strong>
          </div>
          <div className="novex-sit-audit__item">
            <span>Registrada</span>
            <strong>{formatManagementDate(situation.createdAt)}</strong>
          </div>
        </section>
      ) : null}
      <p>{narrative}</p>
      <p>
        El análisis ejecutivo IA aún no está disponible. Consulte el expediente
        en Gestión de situaciones para ver el estado actual.
      </p>
      <button type="button" onClick={onClose}>
        Cerrar
      </button>
    </SituationModalShell>
  )
}

export function ConnectedSituationDetailModal({
  situationId,
  onClose,
  title,
}: ConnectedSituationDetailModalProps) {
  const { user } = useAuth()
  const showAuditTrail = seesInstitutionalSituationRegistry(
    normalizeRoleCode(user?.roleCode),
  )
  const [event, setEvent] = useState<OperationalEvent | null>(null)
  const [situationWithoutAnalysis, setSituationWithoutAnalysis] =
    useState<SituationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!isValidUuid(situationId)) {
      setEvent(null)
      setSituationWithoutAnalysis(null)
      setError('El identificador del expediente no es válido.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setSituationWithoutAnalysis(null)

    try {
      const [situation, analysis] = await Promise.all([
        fetchSituation(situationId),
        loadAnalysis(situationId),
      ])
      const interpretation = analysis
        ? mapAnalysisToInterpretation(analysis, situationId)
        : null

      if (!interpretation) {
        setEvent(null)
        setSituationWithoutAnalysis(situation)
        return
      }

      setEvent(mapSituationToOperationalEvent(situation, interpretation))
    } catch (loadError) {
      setEvent(null)
      setSituationWithoutAnalysis(null)
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [situationId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (loading) {
    return (
      <SituationModalShell
        label="Abriendo expediente"
        onClose={onClose}
        fullSize
      >
        <SituationDetailSkeleton title={title} onClose={onClose} />
      </SituationModalShell>
    )
  }

  if (error) {
    return (
      <SituationModalShell label="Error de análisis" onClose={onClose}>
        <AnalysisErrorState
          message={error}
          onRetry={() => {
            void loadData()
          }}
        />
      </SituationModalShell>
    )
  }

  if (situationWithoutAnalysis) {
    return (
      <SituationWithoutAnalysisModal
        situation={situationWithoutAnalysis}
        onClose={onClose}
        showAuditTrail={showAuditTrail}
      />
    )
  }

  if (!event) {
    return null
  }

  return (
    <SituationDetailModal
      event={event}
      onClose={onClose}
      showAuditTrail={showAuditTrail}
    />
  )
}
