import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { SituationLifecycleTimeline } from '@/modules/monitoring/components/SituationLifecycleTimeline'

interface OperationalStatusPanelProps {
  situation: SituationResponse
}

/** Línea de vida del estado; la acción de actualizar vive en la barra superior. */
export function OperationalStatusPanel({
  situation,
}: OperationalStatusPanelProps) {
  return (
    <section
      className="novex-ops-state novex-ops-dashboard-section"
      aria-label="Ciclo de estado operacional"
    >
      <div className="novex-ops-section-heading">
        <h2>Estado operacional</h2>
      </div>
      <div className="novex-ops-state__body novex-ops-state__body--timeline">
        <SituationLifecycleTimeline status={situation.status} />
      </div>
    </section>
  )
}
