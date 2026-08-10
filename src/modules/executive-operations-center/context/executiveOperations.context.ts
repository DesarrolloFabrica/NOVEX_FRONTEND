import { createContext } from 'react'
import type {
  OperationalCenterData,
  OperationalCenterLoadStatus,
} from '@/modules/executive-operations-center/types/operational-center.types'

export interface ExecutiveOperationsContextValue {
  data: OperationalCenterData | null
  status: OperationalCenterLoadStatus
  error: string | null
  reload: () => Promise<void>
}

export const ExecutiveOperationsContext =
  createContext<ExecutiveOperationsContextValue | null>(null)
