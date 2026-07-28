import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchExecutionActionsRequest,
  updateExecutionActionStatusRequest,
} from '@/modules/execution-actions/services/execution-actions.service'
import { PREVIEW_EXECUTION_ACTIONS } from '@/modules/execution-actions/data/execution-actions.preview'
import type {
  ExecutionAction,
  UpdateExecutionActionStatusInput,
} from '@/modules/execution-actions/types/execution-action.types'
import { EXECUTION_STATUS_LABELS } from '@/modules/execution-actions/types/execution-action.types'
import { sortExecutionActions } from '@/modules/execution-actions/utils/execution-actions.utils'
import { ApiError } from '@/shared/api/http'

export function useExecutionActions() {
  const [items, setItems] = useState<ExecutionAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const actions = useMemo(() => sortExecutionActions(items), [items])
  const selectedAction = useMemo(
    () => actions.find((action) => action.id === selectedActionId) ?? null,
    [actions, selectedActionId],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchExecutionActionsRequest()
      setItems(response.items)
    } catch (err) {
      if (import.meta.env.DEV) {
        setItems(PREVIEW_EXECUTION_ACTIONS)
        setError(null)
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : 'No fue posible cargar las acciones recomendadas.',
        )
        setItems([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (loading) return
    setSelectedActionId((current) => {
      if (current && actions.some((action) => action.id === current)) {
        return current
      }
      return null
    })
  }, [actions, loading])

  const updateStatus = useCallback(
    async (input: UpdateExecutionActionStatusInput) => {
      if (!selectedAction) return
      setIsUpdating(true)
      setError(null)
      try {
        if (import.meta.env.DEV && selectedAction.id.startsWith('preview-')) {
          const now = new Date().toISOString()
          setItems((current) =>
            current.map((item) =>
              item.id === selectedAction.id
                ? {
                    ...item,
                    executionStatus: input.status,
                    statusNote: input.note ?? null,
                    observation: input.observation ?? null,
                    updatedAt: now,
                    startedAt:
                      input.status === 'in_progress'
                        ? item.startedAt ?? now
                        : item.startedAt,
                    completedAt:
                      input.status === 'executed' ||
                      input.status === 'not_executable'
                        ? now
                        : null,
                    timeline: [
                      ...item.timeline,
                      {
                        type: input.status,
                        at: now,
                        description: `Usuario cambió estado a ${EXECUTION_STATUS_LABELS[input.status]}`,
                        byUserName: input.byUserName ?? null,
                      },
                    ],
                  }
                : item,
            ),
          )
          return
        }

        const updated = await updateExecutionActionStatusRequest(
          selectedAction.id,
          input,
        )
        setItems((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        )
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'No fue posible actualizar el estado de ejecución.',
        )
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [selectedAction],
  )

  return {
    actions,
    selectedAction,
    selectedActionId,
    setSelectedActionId,
    loading,
    error,
    isUpdating,
    reload: load,
    updateStatus,
  }
}
