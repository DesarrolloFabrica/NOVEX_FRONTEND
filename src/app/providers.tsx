// Capa: app (providers).
// Responsabilidad: componer los providers de estado global de la aplicación.
// Orden: Auth → OperationalEvents (dominio principal) → Commitments (legado).

import type { ReactNode } from 'react'
import { AuthProvider } from '@/modules/auth/context/AuthContext'
import { CommitmentsProvider } from '@/modules/commitments/context/CommitmentsContext'
import { OperationalEventsProvider } from '@/modules/operational-events/context/OperationalEventsContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <OperationalEventsProvider>
        <CommitmentsProvider>{children}</CommitmentsProvider>
      </OperationalEventsProvider>
    </AuthProvider>
  )
}
