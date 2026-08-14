import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

export interface OperationalMapPan {
  x: number
  y: number
}

export interface OperationalMapView {
  pan: OperationalMapPan
  zoom: number
}

interface OperationalMapSize {
  width: number
  height: number
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  startPan: OperationalMapPan
}

interface UseOperationalMapViewportOptions {
  fullscreenTargetRef?: RefObject<HTMLElement | null>
  reducedMotion?: boolean
}

export const OPERATIONAL_MAP_MIN_ZOOM = 0.55
export const OPERATIONAL_MAP_MAX_ZOOM = 1.6
/** Panorama de entrada: todas las coordinaciones legibles sin ser enormes. */
export const OPERATIONAL_MAP_DEFAULT_ZOOM = 0.92
export const OPERATIONAL_MAP_ZOOM_STEP = 0.1
/** Acercamiento discreto al seleccionar: nunca un zoom cinematográfico. */
export const OPERATIONAL_MAP_SELECTION_ZOOM = 0.98

const DRAG_THRESHOLD = 4
const WHEEL_SENSITIVITY = 0.00125
const BACKDROP_ZOOM_INFLUENCE = 0.06
const BACKDROP_PAN_INFLUENCE = 0.1

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clampOperationalMapZoom(value: number): number {
  return clamp(
    value,
    OPERATIONAL_MAP_MIN_ZOOM,
    OPERATIONAL_MAP_MAX_ZOOM,
  )
}

/**
 * Bounds amplios pero finitos. La cámara conserva recorrido incluso al alejarse,
 * igual que la escena de COORDINADOR, sin permitir perder el mapa indefinidamente.
 */
export function clampOperationalMapPan(
  pan: OperationalMapPan,
  zoom: number,
  size: OperationalMapSize,
): OperationalMapPan {
  const zoomOverflow = Math.max(0, zoom - 1)
  const zoomShrink = Math.max(0, 1 - zoom)
  const limitX =
    size.width * (0.18 + zoomOverflow * 0.55 + zoomShrink * 0.22)
  const limitY =
    size.height * (0.16 + zoomOverflow * 0.52 + zoomShrink * 0.18)

  return {
    x: clamp(pan.x, -limitX, limitX),
    y: clamp(pan.y, -limitY, limitY),
  }
}

export function useOperationalMapViewport({
  fullscreenTargetRef,
  reducedMotion = false,
}: UseOperationalMapViewportOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const zoomLabelRef = useRef<HTMLSpanElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const viewRef = useRef<OperationalMapView>({
    pan: { x: 0, y: 0 },
    zoom: OPERATIONAL_MAP_DEFAULT_ZOOM,
  })
  const sizeRef = useRef<OperationalMapSize>({ width: 960, height: 600 })
  const [size, setSize] = useState<OperationalMapSize>(sizeRef.current)
  const [view, setView] = useState<OperationalMapView>(viewRef.current)
  const [isDragging, setIsDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const writeView = useCallback((nextView: OperationalMapView) => {
    viewRef.current = nextView
    const stage = stageRef.current
    const container = containerRef.current
    stage?.style.setProperty('--operational-pan-x', `${nextView.pan.x}px`)
    stage?.style.setProperty('--operational-pan-y', `${nextView.pan.y}px`)
    stage?.style.setProperty('--operational-zoom', String(nextView.zoom))
    container?.style.setProperty(
      '--operational-backdrop-pan-x',
      `${nextView.pan.x * BACKDROP_PAN_INFLUENCE}px`,
    )
    container?.style.setProperty(
      '--operational-backdrop-pan-y',
      `${nextView.pan.y * BACKDROP_PAN_INFLUENCE}px`,
    )
    container?.style.setProperty(
      '--operational-backdrop-zoom',
      String(1 + (nextView.zoom - 1) * BACKDROP_ZOOM_INFLUENCE),
    )
    if (zoomLabelRef.current) {
      zoomLabelRef.current.textContent = `${Math.round(nextView.zoom * 100)}%`
    }
  }, [])

  const setStageInteracting = useCallback((active: boolean) => {
    if (stageRef.current) {
      stageRef.current.dataset.interacting = String(active)
    }
    if (containerRef.current) {
      containerRef.current.dataset.interacting = String(active)
    }
  }, [])

  const commitView = useCallback(
    (candidate: OperationalMapView) => {
      const zoom = clampOperationalMapZoom(candidate.zoom)
      const nextView = {
        zoom,
        pan: clampOperationalMapPan(candidate.pan, zoom, sizeRef.current),
      }
      writeView(nextView)
      setView(nextView)
    },
    [writeView],
  )

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      const nextSize = {
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(360, Math.round(rect.height)),
      }
      sizeRef.current = nextSize
      setSize(nextSize)
      commitView(viewRef.current)
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [commitView])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    let wheelCommitTimer: number | null = null
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      setStageInteracting(true)
      const rect = element.getBoundingClientRect()
      const current = viewRef.current
      const zoom = clampOperationalMapZoom(
        current.zoom * Math.exp(-event.deltaY * WHEEL_SENSITIVITY),
      )
      const focalX = event.clientX - rect.left - rect.width / 2
      const focalY = event.clientY - rect.top - rect.height / 2
      const ratio = zoom / current.zoom
      const pan = clampOperationalMapPan(
        {
          x: focalX - (focalX - current.pan.x) * ratio,
          y: focalY - (focalY - current.pan.y) * ratio,
        },
        zoom,
        sizeRef.current,
      )
      writeView({ pan, zoom })

      if (wheelCommitTimer !== null) window.clearTimeout(wheelCommitTimer)
      wheelCommitTimer = window.setTimeout(() => {
        commitView(viewRef.current)
        setStageInteracting(false)
      }, 90)
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      element.removeEventListener('wheel', handleWheel)
      if (wheelCommitTimer !== null) window.clearTimeout(wheelCommitTimer)
      setStageInteracting(false)
    }
  }, [commitView, setStageInteracting, writeView])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const target = fullscreenTargetRef?.current ?? containerRef.current
      setIsFullscreen(Boolean(target && document.fullscreenElement === target))
      window.requestAnimationFrame(() => {
        const element = containerRef.current
        if (!element) return
        const rect = element.getBoundingClientRect()
        const nextSize = {
          width: Math.max(320, Math.round(rect.width)),
          height: Math.max(360, Math.round(rect.height)),
        }
        sizeRef.current = nextSize
        setSize(nextSize)
        commitView(viewRef.current)
      })
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [commitView, fullscreenTargetRef])

  const applyZoomAtCenter = useCallback(
    (nextZoom: number) => {
      commitView({ ...viewRef.current, zoom: nextZoom })
    },
    [commitView],
  )

  const zoomIn = useCallback(() => {
    applyZoomAtCenter(viewRef.current.zoom + OPERATIONAL_MAP_ZOOM_STEP)
  }, [applyZoomAtCenter])

  const zoomOut = useCallback(() => {
    applyZoomAtCenter(viewRef.current.zoom - OPERATIONAL_MAP_ZOOM_STEP)
  }, [applyZoomAtCenter])

  const resetView = useCallback(() => {
    commitView({
      pan: { x: 0, y: 0 },
      zoom: OPERATIONAL_MAP_DEFAULT_ZOOM,
    })
  }, [commitView])

  /**
   * Mantiene visible un punto del lienzo con el menor desplazamiento posible.
   * La coordinación conserva su territorio: se mueve la cámara, no la isla.
   */
  const revealPoint = useCallback(
    (
      pointX: number,
      pointY: number,
      {
        paddingX = 0,
        paddingY = 0,
        minZoom,
      }: { paddingX?: number; paddingY?: number; minZoom?: number } = {},
    ) => {
      const current = viewRef.current
      const size = sizeRef.current
      const zoom = clampOperationalMapZoom(
        minZoom === undefined ? current.zoom : Math.max(current.zoom, minZoom),
      )
      const offsetX = (pointX - size.width / 2) * zoom
      const offsetY = (pointY - size.height / 2) * zoom
      const limitX = Math.max(0, size.width / 2 - paddingX)
      const limitY = Math.max(0, size.height / 2 - paddingY)

      commitView({
        zoom,
        pan: {
          x: clamp(current.pan.x, -limitX - offsetX, limitX - offsetX),
          y: clamp(current.pan.y, -limitY - offsetY, limitY - offsetY),
        },
      })
    },
    [commitView],
  )

  const toggleFullscreen = useCallback(async () => {
    const target = fullscreenTargetRef?.current ?? containerRef.current
    if (!target) return

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen()
      } else {
        await target.requestFullscreen()
      }
    } catch {
      // El navegador o el host embebido puede denegar fullscreen. El viewport
      // continúa operativo con zoom, pan y reset.
    }
  }, [fullscreenTargetRef])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      const target = event.target as HTMLElement
      if (
        target.closest(
          '.impact-executive-island, [data-operational-map-control="true"]',
        )
      ) {
        return
      }

      event.preventDefault()
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPan: { ...viewRef.current.pan },
      }
      setStageInteracting(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [setStageInteracting],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (
        !isDragging &&
        (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
      ) {
        setIsDragging(true)
      }

      const pan = clampOperationalMapPan(
        { x: drag.startPan.x + dx, y: drag.startPan.y + dy },
        viewRef.current.zoom,
        sizeRef.current,
      )
      writeView({ ...viewRef.current, pan })
    },
    [isDragging, writeView],
  )

  const endPointerGesture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragRef.current?.pointerId !== event.pointerId) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      dragRef.current = null
      setIsDragging(false)
      setStageInteracting(false)
      commitView(viewRef.current)
    },
    [commitView, setStageInteracting],
  )

  const hasCustomView =
    Math.abs(view.zoom - OPERATIONAL_MAP_DEFAULT_ZOOM) > 0.005 ||
    Math.abs(view.pan.x) > 1 ||
    Math.abs(view.pan.y) > 1

  return {
    containerRef,
    stageRef,
    zoomLabelRef,
    size,
    zoom: view.zoom,
    isDragging,
    isFullscreen,
    hasCustomView,
    zoomIn,
    zoomOut,
    resetView,
    revealPoint,
    toggleFullscreen,
    onPointerDown,
    onPointerMove,
    onPointerUp: endPointerGesture,
    onPointerCancel: endPointerGesture,
    transitionDuration: reducedMotion ? '0ms' : '150ms',
  }
}
