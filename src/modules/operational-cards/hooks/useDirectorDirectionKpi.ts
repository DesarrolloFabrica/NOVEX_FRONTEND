import { useCallback, useEffect, useState } from 'react'
import {
  fetchOperationalKpiDirection,
  OperationalKpiContractError,
} from '@/modules/operational-cards/services/operational-kpi.service'
import type { OperationalKpiDirectionSnapshot } from '@/modules/operational-cards/types/operational-kpi.types'
import { getErrorMessage } from '@/shared/utils/error'

export type DirectorDirectionLoadStatus = 'loading' | 'error' | 'success'

export function useDirectorDirectionKpi() {
  const [status, setStatus] = useState<DirectorDirectionLoadStatus>('loading')
  const [snapshot, setSnapshot] = useState<OperationalKpiDirectionSnapshot | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const reload = useCallback(() => {
    setStatus('loading')
    setError(null)
    void fetchOperationalKpiDirection()
      .then((response) => {
        setSnapshot(response.direction)
        setStatus('success')
      })
      .catch((cause: unknown) => {
        setSnapshot(null)
        setStatus('error')
        setError(
          cause instanceof OperationalKpiContractError
            ? cause.message
            : getErrorMessage(cause),
        )
      })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const selectCoordination = useCallback((code: string | null) => {
    setSelectedCode(code)
  }, [])

  return {
    status,
    snapshot,
    error,
    selectedCode,
    selectCoordination,
    reload,
  }
}
