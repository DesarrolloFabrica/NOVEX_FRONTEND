import { CoordinatorOperationalLayout } from '@/modules/operational-cards/experience/layouts/CoordinatorOperationalLayout'
import { useOperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'

/**
 * COORDINADOR: misma composición de una coordinación, sin rediseño.
 */
export function CoordinatorOperationalShell() {
  const model = useOperationalShellModel('coordinator')
  return <CoordinatorOperationalLayout model={model} />
}
