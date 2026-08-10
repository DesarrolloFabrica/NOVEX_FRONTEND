import { useContext } from 'react'
import {
  ExecutiveOperationsContext,
  type ExecutiveOperationsContextValue,
} from '@/modules/executive-operations-center/context/executiveOperations.context'

export function useExecutiveOperations(): ExecutiveOperationsContextValue {
  const context = useContext(ExecutiveOperationsContext)
  if (!context) {
    throw new Error(
      'useExecutiveOperations debe usarse dentro de ExecutiveOperationsProvider',
    )
  }
  return context
}
