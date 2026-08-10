import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { ExecutiveOperationsContext } from '@/modules/executive-operations-center/context/executiveOperations.context'
import { loadOperationalCenterData } from '@/modules/executive-operations-center/services/operational-center.service'
import type {
  OperationalCenterData,
  OperationalCenterLoadStatus,
} from '@/modules/executive-operations-center/types/operational-center.types'
import { getErrorMessage } from '@/shared/utils/error'

export function ExecutiveOperationsProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<OperationalCenterData | null>(null)
  const [status, setStatus] = useState<OperationalCenterLoadStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const next = await loadOperationalCenterData()
      setData(next)
      setStatus(next.situations.length > 0 ? 'ready' : 'empty')
    } catch (loadError) {
      setData(null)
      setError(getErrorMessage(loadError))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo(
    () => ({ data, status, error, reload }),
    [data, error, reload, status],
  )

  return (
    <ExecutiveOperationsContext.Provider value={value}>
      {children}
    </ExecutiveOperationsContext.Provider>
  )
}
