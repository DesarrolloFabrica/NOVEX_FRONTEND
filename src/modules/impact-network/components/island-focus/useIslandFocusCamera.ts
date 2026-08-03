import { useCallback, useEffect, useRef, useState } from 'react'

export interface SceneView {
  pan: { x: number; y: number }
  zoom: number
}

const FOCUS_ZOOM = 1.82
/** Horizontal center of the left dossier column (40% width → center at 20%). */
const FOCUS_X_RATIO = 0.2
const FOCUS_Y_RATIO = 0.5

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
  targetYRatio: number = FOCUS_Y_RATIO,
): SceneView {
  const focusZoom = clampZoom(zoom)
  const panX =
    canvasWidth * (targetXRatio - 0.5 + 0.5 * focusZoom) - nodeX * focusZoom
  const panY = (canvasHeight * targetYRatio - nodeY) * focusZoom

  return {
    pan: { x: panX, y: panY },
    zoom: focusZoom,
  }
}

/* Geometría del escenario izquierdo del dossier. Los valores deben mantenerse
   sincronizados con `.island-focus-dossier__stage` en impact-network.css. */
const STAGE_COLUMN_RATIO = 0.4
const STAGE_SIDE_PADDING = 20
const STAGE_PADDING_TOP = 28
const STAGE_PADDING_BOTTOM = 24
const STAGE_CARD_MAX_HEIGHT = 164
const STAGE_CARD_MAX_RATIO = 0.26
const STAGE_CARD_CLEARANCE = 14
/** El arte de la isla desborda su caja de layout (`.propagation-island__body`). */
const ISLAND_ART_OVERFLOW = 1.2
const ISLAND_MIN_VISUAL_SIZE = 150
const ISLAND_MAX_VISUAL_SIZE = 360

export interface IslandStageFrame {
  /** Centro vertical de la franja libre entre ambas tarjetas, en píxeles. */
  centerY: number
  /** Tamaño de nodo más grande que cabe sin quedar tapado por las tarjetas. */
  maxVisualSize: number
}

export function computeIslandStageFrame(
  stageWidth: number,
  stageHeight: number,
): IslandStageFrame {
  const cardHeight = Math.min(
    STAGE_CARD_MAX_HEIGHT,
    stageHeight * STAGE_CARD_MAX_RATIO,
  )
  const bandTop = STAGE_PADDING_TOP + cardHeight + STAGE_CARD_CLEARANCE
  const bandBottom =
    stageHeight - STAGE_PADDING_BOTTOM - cardHeight - STAGE_CARD_CLEARANCE
  const bandHeight = Math.max(0, bandBottom - bandTop)
  const columnWidth = Math.max(
    0,
    stageWidth * STAGE_COLUMN_RATIO - STAGE_SIDE_PADDING * 2,
  )
  const available = Math.min(bandHeight, columnWidth) / ISLAND_ART_OVERFLOW

  return {
    centerY: (bandTop + bandBottom) / 2,
    maxVisualSize: Math.min(
      ISLAND_MAX_VISUAL_SIZE,
      Math.max(ISLAND_MIN_VISUAL_SIZE, available),
    ),
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
  /** Live camera frames (prefer DOM/CSS updates; avoid React setState). */
  onViewChange: (view: SceneView) => void
  /** Final settled view — safe to sync React state here. */
  onViewCommit?: (view: SceneView) => void
}

export function useIslandFocusCamera({
  reducedMotion = false,
  onViewChange,
  onViewCommit,
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
        onViewCommit?.(to)
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
          onViewChange(to)
          onViewCommit?.(to)
          setIsAnimating(false)
          resolve()
        }

        animationRef.current = window.requestAnimationFrame(tick)
      })
    },
    [cancelAnimation, onViewChange, onViewCommit, reducedMotion],
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
