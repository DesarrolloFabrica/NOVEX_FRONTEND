import { DirectorDirectionView } from '@/modules/operational-cards/experience/director/DirectorDirectionView'
import {
  CircusScene,
  ShellBottom,
} from '@/modules/operational-cards/experience/layouts/OperationalCenterChrome'
import type { DirectorDirectionLoadStatus } from '@/modules/operational-cards/hooks/useDirectorDirectionKpi'
import type { OperationalKpiDirectionSnapshot } from '@/modules/operational-cards/types/operational-kpi.types'
import '@/styles/director-direction.css'

const DIRECTOR_TICKET_THEME = 'operacion-academica' as const

/**
 * Panorama tabular DIRECTOR (Fase 7). No es la home.
 * Conservado para una vista secundaria «Panorama completo».
 */
export function DirectorDirectionLayout({
  status,
  snapshot,
  error,
  selectedCode,
  onSelect,
  onRetry,
}: {
  status: DirectorDirectionLoadStatus
  snapshot: OperationalKpiDirectionSnapshot | null
  error: string | null
  selectedCode: string | null
  onSelect: (code: string) => void
  onRetry: () => void
}) {
  return (
    <div
      className="operational-shell"
      data-testid="operational-shell"
      data-surface="operational-shell"
      data-shell-layout="director-direction"
      data-shell-experience="director"
      data-ticket-theme={DIRECTOR_TICKET_THEME}
      data-selected-coordination={selectedCode ?? ''}
    >
      <CircusScene />
      <div className="operational-shell__main" data-testid="shell-main">
        <DirectorDirectionView
          status={status}
          snapshot={snapshot}
          error={error}
          selectedCode={selectedCode}
          onSelect={onSelect}
          onRetry={onRetry}
        />
      </div>
      <ShellBottom />
    </div>
  )
}
