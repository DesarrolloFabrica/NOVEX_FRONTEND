// Capa: hook del módulo "auth".
// Responsabilidad: acceso ergonómico y seguro al AuthContext desde componentes.
// Lanza un error claro si se usa fuera del provider (evita estados inválidos).

import { useContext } from 'react'
import {
  AuthContext,
  type AuthContextValue,
} from '@/modules/auth/context/AuthContext'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }
  return context
}
