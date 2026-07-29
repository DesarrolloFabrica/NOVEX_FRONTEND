import { useCallback, useEffect, useRef, useState } from 'react'

export interface SceneView {
  pan: { x: number; y: number }
  zoom: number
}

const FOCUS_ZOOM = 1.82
/** Horizontal center of the left dossier column (40% width → center at 20%). */
const FOCUS_X_RATIO = 0.2

export const ISLAND_FOCUS_ANIMATION_MS = 1040
export const ISLAND_RESTORE_ANIMATION_MS = 620
export const ISLAND_REFOCUS_ANIMATION_MS = 560

function clampZoom(value: number): number {
  return Math.min(4, Math.max(0.45, value))
}

export function computeFocusCamera(
  nodeX: number,
  nodeY: number,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number = FOCUS_ZOOM,
  targetXRatio: number = FOCUS_X_RATIO,
): SceneView {
  const focusZoom = clampZoom(zoom)
  const panX =
    canvasWidth * (targetXRatio - 0.5 + 0.5 * focusZoom) - nodeX * focusZoom
  const panY = (canvasHeight * 0.5 - nodeY) * focusZoom

  return {
    pan: { x: panX, y: panY },
    zoom: focusZoom,
  }
}

/** Smooth cinematic ease — slow start and soft landing. */
function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2
}

function interpolateView(from: SceneView, to: SceneView, progress: number): SceneView {
  const eased = easeInOutQuart(progress)
  return {
    pan: {
      x: from.pan.x + (to.pan.x - from.pan.x) * eased,
      y: from.pan.y + (to.pan.y - from.pan.y) * eased,
    },
    zoom: from.zoom + (to.zoom - from.zoom) * eased,
  }
}

interface UseIslandFocusCameraOptions {
  reducedMotion?: boolean
  onViewChange: (view: SceneView) => void
}

export function useIslandFocusCamera({
  reducedMotion = false,
  onViewChange,
}: UseIslandFocusCameraOptions) {
  const savedViewRef = useRef<SceneView | null>(null)
  const animationRef = useRef<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const cancelAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsAnimating(false)
  }, [])

  const animateToView = useCallback(
    (from: SceneView, to: SceneView, durationMs: number = ISLAND_FOCUS_ANIMATION_MS) => {
      cancelAnimation()

      if (reducedMotion) {
        onViewChange(to)
        return Promise.resolve()
      }

      setIsAnimating(true)
      const startedAt = performance.now()

      return new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const progress = Math.min(1, (now - startedAt) / durationMs)
          onViewChange(interpolateView(from, to, progress))

          if (progress < 1) {
            animationRef.current = window.requestAnimationFrame(tick)
            return
          }

          animationRef.current = null
          setIsAnimating(false)
          resolve()
        }

        animationRef.current = window.requestAnimationFrame(tick)
      })
    },
    [cancelAnimation, onViewChange, reducedMotion],
  )

  const focusOnNode = useCallback(
    async (
      currentView: SceneView,
      nodeX: number,
      nodeY: number,
      canvasWidth: number,
      canvasHeight: number,
    ) => {
      if (!savedViewRef.current) {
        savedViewRef.current = currentView
      }
      const target = computeFocusCamera(
        nodeX,
        nodeY,
        canvasWidth,
        canvasHeight,
      )
      await animateToView(currentView, target, ISLAND_FOCUS_ANIMATION_MS)
    },
    [animateToView],
  )

  const restoreView = useCallback(
    async (currentView: SceneView) => {
      const saved = savedViewRef.current
      if (!saved) return
      await animateToView(currentView, saved, ISLAND_RESTORE_ANIMATION_MS)
      savedViewRef.current = null
    },
    [animateToView],
  )

  const peekSavedView = useCallback((): SceneView | null => {
    return savedViewRef.current ? { ...savedViewRef.current } : null
  }, [])

  const clearSavedView = useCallback(() => {
    savedViewRef.current = null
  }, [])

  useEffect(() => cancelAnimation, [cancelAnimation])

  return {
    focusOnNode,
    restoreView,
    animateToView,
    peekSavedView,
    clearSavedView,
    isAnimating,
  }
}
