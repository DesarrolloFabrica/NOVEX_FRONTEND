import { useCallback, useEffect, useState } from 'react'
import {
  fetchOperationalKpiDirection,
  OperationalKpiContractError,
} from '@/modules/operational-cards/services/operational-kpi.service'
import type { OperationalKpiDirectionSnapshot } from '@/modules/operational-cards/types/operational-kpi.types'
import { getErrorMessage } from '@/shared/utils/error'

export type DirectorKpiLoadStatus = 'loading' | 'error' | 'success'

/**
 * Indicadores de la Dirección para el shell del DIRECTOR. Una sola lectura que
 * comparten el resumen, el panel central y el tablero de indicadores (antes el
 * tablero la repetía, y además se pedían los KPI de la coordinación observada
 * sin que ninguna vista los usara).
 */
export function useDirectorKpi() {
  const [directionStatus, setDirectionStatus] =
    useState<DirectorKpiLoadStatus>('loading')
  const [direction, setDirection] =
    useState<OperationalKpiDirectionSnapshot | null>(null)
  const [directionError, setDirectionError] = useState<string | null>(null)

  const reloadDirection = useCallback(() => {
    setDirectionStatus('loading')
    setDirectionError(null)
    void fetchOperationalKpiDirection()
      .then((response) => {
        setDirection(response.direction)
        setDirectionStatus('success')
      })
      .catch((cause: unknown) => {
        setDirection(null)
        setDirectionStatus('error')
        setDirectionError(
          cause instanceof OperationalKpiContractError
            ? cause.message
            : getErrorMessage(cause),
        )
      })
  }, [])

  useEffect(() => {
    reloadDirection()
  }, [reloadDirection])

  return {
    directionStatus,
    direction,
    directionError,
    reloadDirection,
  }
}

export type DirectorKpiModel = ReturnType<typeof useDirectorKpi>
