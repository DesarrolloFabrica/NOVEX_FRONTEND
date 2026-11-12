// Capa: app (providers).
// Responsabilidad: componer los providers de estado global de la aplicación.

import type { ReactNode } from 'react'
import { AuthProvider } from '@/modules/auth/context/AuthContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>{children}</AuthProvider>
  )
}
