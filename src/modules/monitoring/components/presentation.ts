import type { ExecutionActionStatus } from '@/modules/execution-actions/types/execution-action.types'
import { CRYSTAL_STATUS_CHIP_BASE } from '@/modules/monitoring/constants/materialTheme'

const INK_STATUS_FRAME =
  'px-1 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]'

export const EXECUTION_STATUS_BADGE_CLASSES: Record<
  ExecutionActionStatus,
  string
> = {
  pending: `${CRYSTAL_STATUS_CHIP_BASE} ${INK_STATUS_FRAME} text-sky-800 shadow-[inset_0_0_0_1px_rgba(3,105,161,0.45)]`,
  in_progress: `${CRYSTAL_STATUS_CHIP_BASE} ${INK_STATUS_FRAME} text-violet-800 shadow-[inset_0_0_0_1px_rgba(109,40,217,0.45)]`,
  executed: `${CRYSTAL_STATUS_CHIP_BASE} ${INK_STATUS_FRAME} text-emerald-800 shadow-[inset_0_0_0_1px_rgba(4,120,87,0.45)]`,
  not_executable: `${CRYSTAL_STATUS_CHIP_BASE} ${INK_STATUS_FRAME} text-red-800 shadow-[inset_0_0_0_1px_rgba(185,28,28,0.45)]`,
}

export const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  immediate: 'cunmark-priority-chip cunmark-priority-chip--immediate',
  high: 'cunmark-priority-chip cunmark-priority-chip--high',
  medium: 'cunmark-priority-chip cunmark-priority-chip--medium',
  scheduled: 'cunmark-priority-chip cunmark-priority-chip--scheduled',
}
