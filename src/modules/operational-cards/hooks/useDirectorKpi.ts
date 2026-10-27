import { useCallback, useEffect, useState } from 'react'
import {
  fetchOperationalKpiCoordination,
  fetchOperationalKpiDirection,
  OperationalKpiContractError,
} from '@/modules/operational-cards/services/operational-kpi.service'
import type {
  OperationalKpiCoordinationSnapshot,
  OperationalKpiDirectionSnapshot,
} from '@/modules/operational-cards/types/operational-kpi.types'
import { getErrorMessage } from '@/shared/utils/error'

export type DirectorKpiLoadStatus = 'loading' | 'error' | 'success'

export function useDirectorKpi(coordinationId: string | null) {
  const [directionStatus, setDirectionStatus] =
    useState<DirectorKpiLoadStatus>('loading')
  const [direction, setDirection] =
    useState<OperationalKpiDirectionSnapshot | null>(null)
  const [directionError, setDirectionError] = useState<string | null>(null)

  const [coordinationStatus, setCoordinationStatus] =
    useState<DirectorKpiLoadStatus>('success')
  const [coordination, setCoordination] =
    useState<OperationalKpiCoordinationSnapshot | null>(null)
  const [coordinationError, setCoordinationError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!coordinationId) {
      setCoordination(null)
      setCoordinationError(null)
      setCoordinationStatus('success')
      return
    }
    let active = true
    setCoordinationStatus('loading')
    setCoordinationError(null)
    void fetchOperationalKpiCoordination(coordinationId)
      .then((response) => {
        if (!active) return
        setCoordination(response.coordination)
        setCoordinationStatus('success')
      })
      .catch((cause: unknown) => {
        if (!active) return
        setCoordination(null)
        setCoordinationStatus('error')
        setCoordinationError(
          cause instanceof OperationalKpiContractError
            ? cause.message
            : getErrorMessage(cause),
        )
      })
    return () => {
      active = false
    }
  }, [coordinationId])

  return {
    directionStatus,
    direction,
    directionError,
    reloadDirection,
    coordinationStatus,
    coordination,
    coordinationError,
  }
}

export type DirectorKpiModel = ReturnType<typeof useDirectorKpi>
