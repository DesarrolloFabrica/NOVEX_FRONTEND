// Capa: app (providers).
// Responsabilidad: componer los providers de estado global de la aplicación.
// Orden: AuthProvider envuelve a CommitmentsProvider, de modo que cualquier
// consumidor de compromisos también tenga acceso a la sesión.

import type { ReactNode } from 'react'
import { AuthProvider } from '@/modules/auth/context/AuthContext'
import { CommitmentsProvider } from '@/modules/commitments/context/CommitmentsContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <CommitmentsProvider>{children}</CommitmentsProvider>
    </AuthProvider>
  )
}
