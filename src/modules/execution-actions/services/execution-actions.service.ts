import { apiRequest } from '@/shared/api/http'
import type {
  ExecutionAction,
  ExecutionActionsListResult,
  ExecutionActionStatus,
  UpdateExecutionActionStatusInput,
} from '@/modules/execution-actions/types/execution-action.types'

interface ApiListResponse {
  items: ExecutionAction[]
  total: number
  page: number
  limit: number
  progress: { executed: number; total: number }
}

export async function fetchExecutionActionsRequest(params?: {
  areaId?: string
  status?: ExecutionActionStatus
}): Promise<ExecutionActionsListResult> {
  const search = new URLSearchParams()
  search.set('limit', '100')
  if (params?.areaId) search.set('areaId', params.areaId)
  if (params?.status) search.set('status', params.status)

  const query = search.toString()
  const response = await apiRequest<ApiListResponse>(
    `/recommended-actions${query ? `?${query}` : ''}`,
  )

  return {
    items: response.items ?? [],
    total: response.total ?? 0,
    page: response.page ?? 1,
    limit: response.limit ?? 100,
    progress: response.progress ?? { executed: 0, total: 0 },
  }
}

export async function updateExecutionActionStatusRequest(
  id: string,
  input: UpdateExecutionActionStatusInput,
): Promise<ExecutionAction> {
  return apiRequest<ExecutionAction>(`/recommended-actions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: input.status,
      note: input.note,
      observation: input.observation,
      byUserId: input.byUserId,
      byUserName: input.byUserName,
    }),
  })
}
