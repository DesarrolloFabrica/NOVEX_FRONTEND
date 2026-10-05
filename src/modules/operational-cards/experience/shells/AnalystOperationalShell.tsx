import { DeckOperationalLayout } from '@/modules/operational-cards/experience/layouts/DeckOperationalLayout'
import { useOperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'

/**
 * ANALISTA: operación actual (baraja, reportar, avance/cierre autorizados).
 * Independiente del shell DIRECTOR.
 */
export function AnalystOperationalShell() {
  const model = useOperationalShellModel('analyst')
  return <DeckOperationalLayout model={model} experience="analyst" />
}
