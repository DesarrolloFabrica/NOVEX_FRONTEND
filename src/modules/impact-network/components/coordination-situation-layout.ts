import type { ImpactIncident } from '@/modules/impact-network/types/impact-network.types'

export const MAX_VISIBLE_SITUATION_NODES = 6

export interface SituationNodeLayout {
  incident: ImpactIncident
  x: number
  y: number
  path: string
}

const SITUATION_NODE_WIDTH = 168
const SITUATION_COLUMN_GAP = 28
const SITUATION_ROW_GAP = 78

export function buildSituationLayouts(
  incidents: readonly ImpactIncident[],
  origin: { x: number; y: number },
  islandSize: number,
  stageSize: { width: number; height: number },
): SituationNodeLayout[] {
  const visible = incidents.slice(0, MAX_VISIBLE_SITUATION_NODES)
  if (visible.length === 0) return []

  const rowCounts =
    visible.length <= 3
      ? [visible.length]
      : [Math.ceil(visible.length / 2), Math.floor(visible.length / 2)]
  const bottomReserve = stageSize.height < 600 ? 48 : 100
  const lastSafeY = stageSize.height - bottomReserve
  const desiredFirstY = origin.y + islandSize * 0.5 + 52
  const firstY = Math.min(
    desiredFirstY,
    lastSafeY - (rowCounts.length - 1) * SITUATION_ROW_GAP,
  )
  const linkOriginY = origin.y + islandSize * 0.36
  let visibleIndex = 0

  return rowCounts.flatMap((rowCount, rowIndex) => {
    const y = firstY + rowIndex * SITUATION_ROW_GAP
    const row = visible.slice(visibleIndex, visibleIndex + rowCount)
    visibleIndex += rowCount

    return row.map((incident, columnIndex) => {
      const offset = columnIndex - (rowCount - 1) / 2
      const unclampedX =
        origin.x + offset * (SITUATION_NODE_WIDTH + SITUATION_COLUMN_GAP)
      const x = Math.max(
        SITUATION_NODE_WIDTH / 2 + 18,
        Math.min(stageSize.width - SITUATION_NODE_WIDTH / 2 - 18, unclampedX),
      )
      const controlY = linkOriginY + (y - linkOriginY) * 0.48
      const path = `M ${origin.x} ${linkOriginY} Q ${origin.x} ${controlY} ${x} ${y}`
      return { incident, x, y, path }
    })
  })
}
