import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { SituationLifecycleTimeline } from '@/modules/monitoring/components/SituationLifecycleTimeline'
import { formatManagementDate } from '@/modules/monitoring/utils/situation-management.presentation'
import {
  formatSlaDeadlineLabel,
  getSituationSlaHealth,
  getSlaActionRecommendation,
} from '@/modules/situations/utils/situation-sla'

interface OperationalStatusPanelProps {
  situation: SituationResponse
}

/** Línea de vida del estado; la acción de actualizar vive en la barra superior. */
export function OperationalStatusPanel({
  situation,
}: OperationalStatusPanelProps) {
  const health =
    situation.slaHealth ??
    getSituationSlaHealth({
      dueAt: situation.dueAt,
      status: situation.status,
      severity: situation.severity,
    })
  const deadlineLabel = formatSlaDeadlineLabel(situation.dueAt, health)
  const recommendation = getSlaActionRecommendation({
    status: situation.status,
    health,
  })

  return (
    <section
      className="novex-ops-state novex-ops-dashboard-section"
      aria-label="Ciclo de estado operacional"
    >
      <div className="novex-ops-section-heading">
        <h2>Estado operacional</h2>
        <p className="novex-ops-state__hint">
          Situación seleccionada. Revise el expediente y actualice el estado cuando
          avance la atención.
        </p>
      </div>

      {situation.dueAt ? (
        <div className="novex-ops-sla" data-sla={health}>
          <div className="novex-ops-sla__copy">
            <small>Plazo operativo</small>
            <strong>{deadlineLabel}</strong>
            <span>
              Límite:{' '}
              {formatManagementDate(situation.dueAt)}
              {situation.closedOnTime === true
                ? ' · Cerrada a tiempo'
                : situation.closedOnTime === false
                  ? ' · Cerrada fuera de plazo'
                  : ''}
            </span>
          </div>
          {recommendation ? (
            <p className="novex-ops-sla__recommendation">{recommendation}</p>
          ) : null}
        </div>
      ) : null}

      <div className="novex-ops-state__body novex-ops-state__body--timeline">
        <SituationLifecycleTimeline status={situation.status} />
      </div>
    </section>
  )
}
