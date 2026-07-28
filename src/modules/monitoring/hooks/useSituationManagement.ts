import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  SituationDossier,
  SituationListItem,
  SituationManagementSummary,
} from '@/modules/api/types/situation-management.types'
import type { UpdateSituationRecommendationPayload } from '@/modules/api/recommendations.api'
import {
  loadSituationDossier,
  loadSituationManagementList,
  updateRecommendationStatus,
  updateSituationStatus,
} from '@/modules/services/situationManagementData.service'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { getErrorMessage } from '@/shared/utils/error'

export function useSituationManagement() {
  const [situations, setSituations] = useState<SituationListItem[]>([])
  const [summary, setSummary] = useState<SituationManagementSummary>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    critical: 0,
  })
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(
    null,
  )
  const [dossier, setDossier] = useState<SituationDossier | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [dossierLoading, setDossierLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [dossierError, setDossierError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const loadList = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const response = await loadSituationManagementList()
      setSituations(response.situations)
      setSummary(response.summary)
    } catch (error) {
      setSituations([])
      setListError(getErrorMessage(error))
    } finally {
      setListLoading(false)
    }
  }, [])

  const loadDossier = useCallback(async (situationId: string) => {
    setDossierLoading(true)
    setDossierError(null)
    try {
      const next = await loadSituationDossier(situationId)
      setDossier(next)
    } catch (error) {
      setDossier(null)
      setDossierError(getErrorMessage(error))
    } finally {
      setDossierLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (!selectedSituationId) {
      setDossier(null)
      setDossierError(null)
      return
    }
    void loadDossier(selectedSituationId)
  }, [loadDossier, selectedSituationId])

  const selectedSituation = useMemo(
    () => situations.find((item) => item.id === selectedSituationId) ?? null,
    [selectedSituationId, situations],
  )

  const updateSituation = useCallback(
    async (status: SituationResponse['status']) => {
      if (!selectedSituationId) return
      setIsUpdating(true)
      try {
        const updated = await updateSituationStatus(selectedSituationId, status)
        setSituations((current) =>
          current.map((item) =>
            item.id === updated.id
              ? {
                  ...item,
                  status: updated.status,
                  updatedAt: updated.updatedAt,
                }
              : item,
          ),
        )
        await loadDossier(selectedSituationId)
      } finally {
        setIsUpdating(false)
      }
    },
    [loadDossier, selectedSituationId],
  )

  const updateRecommendation = useCallback(
    async (
      recommendationId: string,
      payload: UpdateSituationRecommendationPayload,
    ) => {
      if (!selectedSituationId) return
      setIsUpdating(true)
      try {
        await updateRecommendationStatus(recommendationId, payload)
        await loadDossier(selectedSituationId)
      } finally {
        setIsUpdating(false)
      }
    },
    [loadDossier, selectedSituationId],
  )

  return {
    situations,
    summary,
    selectedSituationId,
    selectedSituation,
    dossier,
    listLoading,
    dossierLoading,
    listError,
    dossierError,
    isUpdating,
    setSelectedSituationId,
    reloadList: loadList,
    reloadDossier: () =>
      selectedSituationId ? loadDossier(selectedSituationId) : Promise.resolve(),
    updateSituation,
    updateRecommendation,
  }
}
