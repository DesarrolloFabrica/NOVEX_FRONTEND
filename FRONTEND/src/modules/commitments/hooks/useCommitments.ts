// Capa: hook del módulo "commitments".
// Responsabilidad: acceso ergonómico y seguro al CommitmentsContext.
// Lanza un error claro si se usa fuera del provider.

import { useContext } from 'react'
import {
  CommitmentsContext,
  type CommitmentsContextValue,
} from '@/modules/commitments/context/CommitmentsContext'

export function useCommitments(): CommitmentsContextValue {
  const context = useContext(CommitmentsContext)
  if (!context) {
    throw new Error('useCommitments debe usarse dentro de <CommitmentsProvider>.')
  }
  return context
}
