import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  SituationDossier,
  SituationListItem,
  SituationManagementSummary,
} from '@/modules/api/types/situation-management.types'
import type { UpdateSituationStatusInput } from '@/modules/monitoring/utils/situation-lifecycle'
import {
  DEFAULT_SITUATION_QUEUE_QUERY,
  filterSituationsForQueue,
  paginateSituations,
  type SituationQueueQuery,
  type SituationQueueSeverityFilter,
  type SituationQueueSlaFilter,
  type SituationQueueStatusFilter,
} from '@/modules/monitoring/utils/situation-queue-query'
import { sortSituationsForQueue } from '@/modules/monitoring/utils/situation-management.presentation'
import {
  loadSituationDossier,
  loadSituationManagementList,
  updateSituationStatus as persistSituationStatus,
} from '@/modules/services/situationManagementData.service'
import { getErrorMessage } from '@/shared/utils/error'

interface UseSituationManagementResult {
  situations: SituationListItem[]
  filteredSituations: SituationListItem[]
  pageItems: SituationListItem[]
  summary: SituationManagementSummary
  queueQuery: SituationQueueQuery
  totalFiltered: number
  totalPages: number
  totalAvailable: number
  selectedSituationId: string | null
  dossier: SituationDossier | null
  loadingList: boolean
  loadingDossier: boolean
  updatingStatus: boolean
  listError: string | null
  dossierError: string | null
  updateError: string | null
  selectSituation: (situationId: string) => void
  setQueueSearch: (search: string) => void
  setQueueStatus: (status: SituationQueueStatusFilter) => void
  setQueueSeverity: (severity: SituationQueueSeverityFilter) => void
  setQueueSla: (sla: SituationQueueSlaFilter) => void
  setQueuePage: (page: number) => void
  setQueuePageSize: (pageSize: number) => void
  applySummaryFilter: (filter: SituationQueueStatusFilter | 'CRITICAL') => void
  refresh: () => Promise<void>
  updateStatus: (input: UpdateSituationStatusInput) => Promise<void>
}

const EMPTY_SUMMARY: SituationManagementSummary = {
  total: 0,
  open: 0,
  inProgress: 0,
  resolved: 0,
  closed: 0,
  critical: 0,
}

function isActiveSituation(item: SituationListItem): boolean {
  return item.status !== 'CLOSED'
}

export function useSituationManagement(): UseSituationManagementResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const situationFromUrl = searchParams.get('situation')
  const autoSelectDoneRef = useRef(false)

  const [situations, setSituations] = useState<SituationListItem[]>([])
  const [summary, setSummary] = useState<SituationManagementSummary>(EMPTY_SUMMARY)
  const [totalAvailable, setTotalAvailable] = useState(0)
  const [queueQuery, setQueueQuery] = useState<SituationQueueQuery>(
    DEFAULT_SITUATION_QUEUE_QUERY,
  )
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(
    situationFromUrl,
  )
  const [dossier, setDossier] = useState<SituationDossier | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDossier, setLoadingDossier] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [dossierError, setDossierError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const filteredSituations = useMemo(
    () => sortSituationsForQueue(filterSituationsForQueue(situations, queueQuery)),
    [queueQuery, situations],
  )

  const pagination = useMemo(
    () => paginateSituations(filteredSituations, queueQuery),
    [filteredSituations, queueQuery],
  )

  const selectSituation = useCallback(
    (situationId: string) => {
      setSelectedSituationId(situationId)
      setUpdateError(null)
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set('situation', situationId)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const refresh = useCallback(async () => {
    setLoadingList(true)
    setListError(null)
    try {
      const result = await loadSituationManagementList()
      const ordered = sortSituationsForQueue(result.situations)
      setSituations(ordered)
      setSummary(result.summary)
      setTotalAvailable(result.totalAvailable)

      setSelectedSituationId((current) => {
        if (current && ordered.some((item) => item.id === current)) {
          return current
        }

        if (situationFromUrl && ordered.some((item) => item.id === situationFromUrl)) {
          return situationFromUrl
        }

        if (!autoSelectDoneRef.current && !situationFromUrl) {
          autoSelectDoneRef.current = true
          const firstActive = ordered.find(isActiveSituation) ?? ordered[0] ?? null
          if (firstActive) {
            setSearchParams(
              (params) => {
                const next = new URLSearchParams(params)
                next.set('situation', firstActive.id)
                return next
              },
              { replace: true },
            )
            return firstActive.id
          }
        }

        return current
      })
    } catch (error) {
      setListError(getErrorMessage(error, 'No fue posible cargar la cola de situaciones.'))
      setSituations([])
      setSummary(EMPTY_SUMMARY)
      setTotalAvailable(0)
    } finally {
      setLoadingList(false)
    }
  }, [setSearchParams, situationFromUrl])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!situationFromUrl) return
    setSelectedSituationId(situationFromUrl)
  }, [situationFromUrl])

  useEffect(() => {
    if (!selectedSituationId) {
      setDossier(null)
      setDossierError(null)
      return
    }

    let cancelled = false
    setLoadingDossier(true)
    setDossierError(null)

    void loadSituationDossier(selectedSituationId)
      .then((nextDossier) => {
        if (cancelled) return
        setDossier(nextDossier)
      })
      .catch((error) => {
        if (cancelled) return
        setDossier(null)
        setDossierError(
          getErrorMessage(error, 'No fue posible cargar el expediente de la situación.'),
        )
      })
      .finally(() => {
        if (!cancelled) setLoadingDossier(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedSituationId])

  useEffect(() => {
    if (pagination.page !== queueQuery.page) {
      setQueueQuery((current) => ({ ...current, page: pagination.page }))
    }
  }, [pagination.page, queueQuery.page])

  const updateStatus = useCallback(
    async (input: UpdateSituationStatusInput) => {
      if (!selectedSituationId) {
        throw new Error('Seleccione una situación antes de actualizar el estado.')
      }
      setUpdatingStatus(true)
      setUpdateError(null)
      try {
        await persistSituationStatus(selectedSituationId, input)
        await refresh()
        const nextDossier = await loadSituationDossier(selectedSituationId)
        setDossier(nextDossier)
      } catch (error) {
        const message = getErrorMessage(
          error,
          'No fue posible actualizar el estado de la situación.',
        )
        setUpdateError(message)
        throw error instanceof Error ? error : new Error(message)
      } finally {
        setUpdatingStatus(false)
      }
    },
    [refresh, selectedSituationId],
  )

  const setQueueSearch = useCallback((search: string) => {
    setQueueQuery((current) => ({ ...current, search, page: 1 }))
  }, [])

  const setQueueStatus = useCallback((status: SituationQueueStatusFilter) => {
    setQueueQuery((current) => ({ ...current, status, page: 1 }))
  }, [])

  const setQueueSeverity = useCallback((severity: SituationQueueSeverityFilter) => {
    setQueueQuery((current) => ({ ...current, severity, page: 1 }))
  }, [])

  const setQueueSla = useCallback((sla: SituationQueueSlaFilter) => {
    setQueueQuery((current) => ({ ...current, sla, page: 1 }))
  }, [])

  const setQueuePage = useCallback((page: number) => {
    setQueueQuery((current) => ({ ...current, page }))
  }, [])

  const setQueuePageSize = useCallback((pageSize: number) => {
    setQueueQuery((current) => ({ ...current, pageSize, page: 1 }))
  }, [])

  const applySummaryFilter = useCallback(
    (filter: SituationQueueStatusFilter | 'CRITICAL') => {
      if (filter === 'CRITICAL') {
        setQueueQuery((current) => ({
          ...current,
          status: 'ACTIVE',
          severity: 'PRIORITY',
          page: 1,
        }))
        return
      }
      setQueueQuery((current) => ({
        ...current,
        status: filter,
        severity: 'ALL',
        page: 1,
      }))
    },
    [],
  )

  return {
    situations,
    filteredSituations,
    pageItems: pagination.items,
    summary,
    queueQuery: { ...queueQuery, page: pagination.page },
    totalFiltered: pagination.totalFiltered,
    totalPages: pagination.totalPages,
    totalAvailable,
    selectedSituationId,
    dossier,
    loadingList,
    loadingDossier,
    updatingStatus,
    listError,
    dossierError,
    updateError,
    selectSituation,
    setQueueSearch,
    setQueueStatus,
    setQueueSeverity,
    setQueueSla,
    setQueuePage,
    setQueuePageSize,
    applySummaryFilter,
    refresh,
    updateStatus,
  }
}
