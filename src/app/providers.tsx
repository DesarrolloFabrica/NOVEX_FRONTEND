// Capa: app (providers).
// Responsabilidad: componer los providers de estado global de la aplicación.

import type { ReactNode } from 'react'
import { AuthProvider } from '@/modules/auth/context/AuthContext'
import { OperationalEventsProvider } from '@/modules/operational-events/context/OperationalEventsContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <OperationalEventsProvider>{children}</OperationalEventsProvider>
    </AuthProvider>
  )
}
