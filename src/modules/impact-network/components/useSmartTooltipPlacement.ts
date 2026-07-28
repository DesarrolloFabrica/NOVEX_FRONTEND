import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface PlacementResult {
  placement: TooltipPlacement
  visible: boolean
}

const PLACEMENT_ORDER: readonly TooltipPlacement[] = [
  'top',
  'bottom',
  'right',
  'left',
]

function fitsInViewport(
  islandRect: DOMRect,
  containerRect: DOMRect,
  placement: TooltipPlacement,
  tooltipWidth: number,
  tooltipHeight: number,
  gap: number,
): boolean {
  const islandCenterX = islandRect.left + islandRect.width / 2
  const islandCenterY = islandRect.top + islandRect.height / 2
  const islandRadius = Math.max(islandRect.width, islandRect.height) * 0.44

  let tooltipLeft = 0
  let tooltipTop = 0
  let tooltipRight = 0
  let tooltipBottom = 0

  switch (placement) {
    case 'top':
      tooltipLeft = islandCenterX - tooltipWidth / 2
      tooltipTop = islandRect.top - gap - tooltipHeight
      tooltipRight = tooltipLeft + tooltipWidth
      tooltipBottom = islandRect.top - gap
      break
    case 'bottom':
      tooltipLeft = islandCenterX - tooltipWidth / 2
      tooltipTop = islandRect.bottom + gap
      tooltipRight = tooltipLeft + tooltipWidth
      tooltipBottom = tooltipTop + tooltipHeight
      break
    case 'left':
      tooltipLeft = islandRect.left - gap - tooltipWidth
      tooltipTop = islandCenterY - tooltipHeight / 2
      tooltipRight = islandRect.left - gap
      tooltipBottom = tooltipTop + tooltipHeight
      break
    case 'right':
      tooltipLeft = islandRect.right + gap
      tooltipTop = islandCenterY - tooltipHeight / 2
      tooltipRight = tooltipLeft + tooltipWidth
      tooltipBottom = tooltipTop + tooltipHeight
      break
  }

  const overlapsIsland =
    tooltipRight > islandRect.left + islandRadius * 0.3 &&
    tooltipLeft < islandRect.right - islandRadius * 0.3 &&
    tooltipBottom > islandRect.top + islandRadius * 0.3 &&
    tooltipTop < islandRect.bottom - islandRadius * 0.3

  if (overlapsIsland) return false

  return (
    tooltipLeft >= containerRect.left + 4 &&
    tooltipTop >= containerRect.top + 4 &&
    tooltipRight <= containerRect.right - 4 &&
    tooltipBottom <= containerRect.bottom - 4
  )
}

export function useSmartTooltipPlacement(
  active: boolean,
  layoutRevision = 0,
) {
  const islandRef = useRef<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLSpanElement | null>(null)
  const [result, setResult] = useState<PlacementResult>({
    placement: 'top',
    visible: false,
  })

  const updatePlacement = useCallback(() => {
    const island = islandRef.current
    const tooltip = tooltipRef.current
    if (!island || !tooltip) return

    const container =
      island.closest('.propagation-scene') ?? document.documentElement
    const islandRect = island.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    const gap = 10

    const chosen =
      PLACEMENT_ORDER.find((placement) =>
        fitsInViewport(
          islandRect,
          containerRect,
          placement,
          tooltipRect.width || 160,
          tooltipRect.height || 40,
          gap,
        ),
      ) ?? 'top'

    setResult({ placement: chosen, visible: active })
  }, [active])

  useLayoutEffect(() => {
    if (!active) {
      setResult((current) => ({ ...current, visible: false }))
      return
    }
    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    const island = islandRef.current
    const container = island?.closest('.propagation-scene')
    const observer =
      container && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updatePlacement())
        : null
    if (container) observer?.observe(container)
    return () => {
      window.removeEventListener('resize', updatePlacement)
      observer?.disconnect()
    }
  }, [active, layoutRevision, updatePlacement])

  return { islandRef, tooltipRef, placement: result.placement, visible: result.visible }
}
