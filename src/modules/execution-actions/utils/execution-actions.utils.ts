import type {
  ExecutionAction,
} from '@/modules/execution-actions/types/execution-action.types'

const PRIORITY_WEIGHT: Record<ExecutionAction['priority'], number> = {
  immediate: 4,
  high: 3,
  medium: 2,
  scheduled: 1,
}

export function sortExecutionActions(
  actions: ExecutionAction[],
): ExecutionAction[] {
  return [...actions].sort((a, b) => {
    const priorityDiff =
      PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    return a.createdAt.localeCompare(b.createdAt)
  })
}

