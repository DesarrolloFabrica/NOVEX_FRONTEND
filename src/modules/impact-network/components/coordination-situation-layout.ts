import type { ImpactIncident } from '@/modules/impact-network/types/impact-network.types'

export const MAX_VISIBLE_SITUATION_NODES = 8

export interface SituationNodeLayout {
  incident: ImpactIncident
  x: number
  y: number
  path: string
}

const CARD_WIDTH = 164
const CARD_HEIGHT = 100
const COLUMN_GAP = 18
const ROW_GAP = 112
const EDGE_PAD = 20
const SLOT = CARD_WIDTH + COLUMN_GAP

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function wingShare(count: number): { left: number; right: number; bottom: number } {
  if (count <= 2) return { left: 0, right: 0, bottom: count }
  if (count === 3) return { left: 1, right: 1, bottom: 1 }
  if (count === 4) return { left: 1, right: 1, bottom: 2 }
  if (count === 5) return { left: 2, right: 2, bottom: 1 }
  if (count === 6) return { left: 2, right: 2, bottom: 2 }
  if (count === 7) return { left: 3, right: 2, bottom: 2 }
  return { left: 3, right: 3, bottom: 2 }
}

function rowXs(
  count: number,
  originX: number,
  stageWidth: number,
): number[] {
  if (count <= 0) return []
  const totalWidth = count * CARD_WIDTH + Math.max(0, count - 1) * COLUMN_GAP
  const minStart = CARD_WIDTH / 2 + EDGE_PAD
  const maxStart = stageWidth - EDGE_PAD - totalWidth + CARD_WIDTH / 2
  const centered = originX - totalWidth / 2 + CARD_WIDTH / 2
  const startX = clamp(centered, minStart, Math.max(minStart, maxStart))
  return Array.from({ length: count }, (_, index) => startX + index * SLOT)
}

function canPlaceWings(
  originX: number,
  islandSize: number,
  stageWidth: number,
): boolean {
  const offset = islandSize * 0.52 + CARD_WIDTH / 2 + 28
  const leftX = originX - offset
  const rightX = originX + offset
  return leftX >= CARD_WIDTH / 2 + EDGE_PAD && rightX <= stageWidth - CARD_WIDTH / 2 - EDGE_PAD
}

export function buildSituationLayouts(
  incidents: readonly ImpactIncident[],
  origin: { x: number; y: number },
  islandSize: number,
  stageSize: { width: number; height: number },
): SituationNodeLayout[] {
  if (incidents.length === 0 || stageSize.width <= 0 || stageSize.height <= 0) {
    return []
  }

  const visible = incidents.slice(0, MAX_VISIBLE_SITUATION_NODES)
  const bottomReserve = stageSize.height < 620 ? 58 : 88
  const lastSafeY = stageSize.height - bottomReserve
  const minX = CARD_WIDTH / 2 + EDGE_PAD
  const maxX = stageSize.width - CARD_WIDTH / 2 - EDGE_PAD
  const linkOriginY = origin.y + islandSize * 0.28
  const useWings = canPlaceWings(origin.x, islandSize, stageSize.width)
  const share = useWings
    ? wingShare(visible.length)
    : { left: 0, right: 0, bottom: visible.length }

  const points: Array<{ incident: ImpactIncident; x: number; y: number }> = []
  const wingOffset = islandSize * 0.52 + CARD_WIDTH / 2 + 28
  const leftX = clamp(origin.x - wingOffset, minX, maxX)
  const rightX = clamp(origin.x + wingOffset, minX, maxX)
  const wingStartY = clamp(
    origin.y - ((Math.max(share.left, share.right) - 1) * ROW_GAP) / 2,
    CARD_HEIGHT / 2 + EDGE_PAD,
    lastSafeY,
  )

  visible.slice(0, share.left).forEach((incident, index) => {
    points.push({
      incident,
      x: leftX,
      y: clamp(wingStartY + index * ROW_GAP, CARD_HEIGHT / 2 + EDGE_PAD, lastSafeY),
    })
  })

  visible.slice(share.left, share.left + share.right).forEach((incident, index) => {
    points.push({
      incident,
      x: rightX,
      y: clamp(wingStartY + index * ROW_GAP, CARD_HEIGHT / 2 + EDGE_PAD, lastSafeY),
    })
  })

  const bottomIncidents = visible.slice(share.left + share.right)
  if (bottomIncidents.length > 0) {
    const perRow = Math.max(
      1,
      Math.min(4, Math.floor((stageSize.width - EDGE_PAD * 2) / SLOT)),
    )
    const bottomY = clamp(
      Math.max(
        origin.y + islandSize * 0.48 + CARD_HEIGHT / 2 + 18,
        wingStartY + Math.max(share.left, share.right) * ROW_GAP * 0.55,
      ),
      CARD_HEIGHT / 2 + EDGE_PAD,
      lastSafeY,
    )
    let cursor = 0
    let row = 0
    while (cursor < bottomIncidents.length) {
      const rowItems = bottomIncidents.slice(cursor, cursor + perRow)
      const xs = rowXs(rowItems.length, origin.x, stageSize.width)
      const y = clamp(bottomY + row * ROW_GAP, CARD_HEIGHT / 2 + EDGE_PAD, lastSafeY)
      rowItems.forEach((incident, columnIndex) => {
        points.push({ incident, x: xs[columnIndex] ?? origin.x, y })
      })
      cursor += rowItems.length
      row += 1
    }
  }

  return points.map(({ incident, x, y }) => {
    const controlY = linkOriginY + (y - linkOriginY) * 0.42
    const path = `M ${origin.x} ${linkOriginY} Q ${origin.x} ${controlY} ${x} ${y}`
    return { incident, x, y, path }
  })
}
