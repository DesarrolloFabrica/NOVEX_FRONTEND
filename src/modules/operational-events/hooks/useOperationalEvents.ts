// Capa: hook del módulo "operational-events".
// Responsabilidad: acceso ergonómico y seguro al OperationalEventsContext.
// Lanza un error claro si se usa fuera del provider.

import { useContext } from 'react'
import {
  OperationalEventsContext,
  type OperationalEventsContextValue,
} from '@/modules/operational-events/context/OperationalEventsContext'

export function useOperationalEvents(): OperationalEventsContextValue {
  const context = useContext(OperationalEventsContext)
  if (!context) {
    throw new Error(
      'useOperationalEvents debe usarse dentro de <OperationalEventsProvider>.',
    )
  }
  return context
}
