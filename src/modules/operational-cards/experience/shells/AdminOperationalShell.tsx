import { DeckOperationalLayout } from '@/modules/operational-cards/experience/layouts/DeckOperationalLayout'
import { useOperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'

/**
 * ADMIN: frontera de composición. Conserva la baraja de consulta actual.
 * No es la base conceptual de la experiencia ejecutiva DIRECTOR.
 */
export function AdminOperationalShell() {
  const model = useOperationalShellModel('admin')
  return <DeckOperationalLayout model={model} experience="admin" />
}
