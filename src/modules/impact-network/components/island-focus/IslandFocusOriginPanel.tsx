import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { SituationExecutiveReportBody } from '@/modules/operational-events/components/SituationExecutiveReportBody'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'

interface IslandFocusOriginPanelProps {
  event: OperationalEvent
  coordinationId: CoordinationId
}

export function IslandFocusOriginPanel({
  event,
}: IslandFocusOriginPanelProps) {
  return (
    <div className="island-focus-panel island-focus-panel--origin">
      <div className="island-focus-panel__scroll">
        <SituationExecutiveReportBody
          event={event}
          variant="compact"
          showExport={false}
        />
      </div>
    </div>
  )
}
