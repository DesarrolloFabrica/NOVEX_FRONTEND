import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

interface ViewportSize {
  width: number
  height: number
}

interface StatusBoardView {
  x: number
  y: number
  zoom: number
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

interface UseStatusBoardViewportOptions {
  contentWidth: number
  contentHeight: number
  fullscreenTargetRef?: RefObject<HTMLElement | null>
  reducedMotion?: boolean
}

export const STATUS_BOARD_MIN_ZOOM = 0.35
export const STATUS_BOARD_MAX_ZOOM = 1.5
export const STATUS_BOARD_ZOOM_STEP = 0.1

const DRAG_THRESHOLD = 4
const WHEEL_SENSITIVITY = 0.00125
const PAN_SLACK_RATIO = 0.12
const PAN_SLACK_MIN = 48
const PAN_SLACK_MAX = 112

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function getStatusBoardFitZoom(
  viewport: ViewportSize,
  content: ViewportSize,
): number {
  const horizontal = (viewport.width - 24) / Math.max(1, content.width)
  const vertical = (viewport.height - 24) / Math.max(1, content.height)
  return clamp(Math.min(0.96, horizontal, vertical), STATUS_BOARD_MIN_ZOOM, 0.96)
}

export function clampStatusBoardPan(
  view: StatusBoardView,
  viewport: ViewportSize,
  content: ViewportSize,
): StatusBoardView {
  const zoom = clamp(view.zoom, STATUS_BOARD_MIN_ZOOM, STATUS_BOARD_MAX_ZOOM)
  const slackX = clamp(
    viewport.width * PAN_SLACK_RATIO,
    PAN_SLACK_MIN,
    PAN_SLACK_MAX,
  )
  const slackY = clamp(
    viewport.height * PAN_SLACK_RATIO,
    PAN_SLACK_MIN,
    PAN_SLACK_MAX,
  )
  const limitX =
    Math.max(0, (content.width * zoom - viewport.width) / 2) + slackX
  const limitY =
    Math.max(0, (content.height * zoom - viewport.height) / 2) + slackY
  return {
    zoom,
    x: clamp(view.x, -limitX, limitX),
    y: clamp(view.y, -limitY, limitY),
  }
}

export function useStatusBoardViewport({
  contentWidth,
  contentHeight,
  fullscreenTargetRef,
  reducedMotion = false,
}: UseStatusBoardViewportOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const zoomLabelRef = useRef<HTMLSpanElement | null>(null)
  const sizeRef = useRef<ViewportSize>({ width: 960, height: 520 })
  const contentRef = useRef<ViewportSize>({
    width: contentWidth,
    height: contentHeight,
  })
  const dragRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const viewRef = useRef<StatusBoardView>({ x: 0, y: 0, zoom: 0.92 })
  const [size, setSize] = useState<ViewportSize>(sizeRef.current)
  const [view, setView] = useState<StatusBoardView>(viewRef.current)
  const [isDragging, setIsDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const commitView = useCallback((candidate: StatusBoardView) => {
    const next = clampStatusBoardPan(
      candidate,
      sizeRef.current,
      contentRef.current,
    )
    viewRef.current = next
    setView(next)
  }, [])

  const fitView = useCallback(() => {
    commitView({
      x: 0,
      y: 0,
      zoom: getStatusBoardFitZoom(sizeRef.current, contentRef.current),
    })
  }, [commitView])

  useEffect(() => {
    contentRef.current = { width: contentWidth, height: contentHeight }
    fitView()
  }, [contentHeight, contentWidth, fitView])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      const nextSize = {
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(300, Math.round(rect.height)),
      }
      sizeRef.current = nextSize
      setSize(nextSize)
      window.requestAnimationFrame(fitView)
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [fitView])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      const current = viewRef.current
      const zoom = clamp(
        current.zoom * Math.exp(-event.deltaY * WHEEL_SENSITIVITY),
        STATUS_BOARD_MIN_ZOOM,
        STATUS_BOARD_MAX_ZOOM,
      )
      const focusX = event.clientX - rect.left - rect.width / 2
      const focusY = event.clientY - rect.top - rect.height / 2
      const ratio = zoom / current.zoom
      commitView({
        zoom,
        x: focusX - (focusX - current.x) * ratio,
        y: focusY - (focusY - current.y) * ratio,
      })
    }

    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [commitView])

  useEffect(() => {
    const onFullscreenChange = () => {
      const target = fullscreenTargetRef?.current ?? containerRef.current
      setIsFullscreen(Boolean(target && document.fullscreenElement === target))
      window.requestAnimationFrame(fitView)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [fitView, fullscreenTargetRef])

  const zoomIn = useCallback(() => {
    commitView({ ...viewRef.current, zoom: viewRef.current.zoom + STATUS_BOARD_ZOOM_STEP })
  }, [commitView])

  const zoomOut = useCallback(() => {
    commitView({ ...viewRef.current, zoom: viewRef.current.zoom - STATUS_BOARD_ZOOM_STEP })
  }, [commitView])

  const toggleFullscreen = useCallback(async () => {
    const target = fullscreenTargetRef?.current ?? containerRef.current
    if (!target) return
    try {
      if (document.fullscreenElement === target) await document.exitFullscreen()
      else await target.requestFullscreen()
    } catch {
      // Zoom, pan y ajuste continúan disponibles si el host deniega fullscreen.
    }
  }, [fullscreenTargetRef])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      const target = event.target as HTMLElement
      const interactiveTarget = target.closest(
        'button, a, input, select, textarea, [data-operational-map-control="true"]',
      )
      if (
        interactiveTarget &&
        !interactiveTarget.classList.contains('impact-status-coordination')
      ) {
        return
      }

      suppressClickRef.current = false
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: viewRef.current.x,
        originY: viewRef.current.y,
        moved: false,
      }
    },
    [],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (
        !drag.moved &&
        (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
      ) {
        drag.moved = true
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsDragging(true)
      }
      if (!drag.moved) return
      commitView({
        ...viewRef.current,
        x: drag.originX + dx,
        y: drag.originY + dy,
      })
    },
    [commitView],
  )

  const endPointerGesture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragRef.current?.pointerId !== event.pointerId) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      suppressClickRef.current = dragRef.current.moved
      dragRef.current = null
      setIsDragging(false)
    },
    [],
  )

  const onClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!suppressClickRef.current) return
      suppressClickRef.current = false
      event.preventDefault()
      event.stopPropagation()
    },
    [],
  )

  const fitZoom = useMemo(
    () => getStatusBoardFitZoom(size, { width: contentWidth, height: contentHeight }),
    [contentHeight, contentWidth, size],
  )
  const hasCustomView =
    Math.abs(view.zoom - fitZoom) > 0.005 ||
    Math.abs(view.x) > 1 ||
    Math.abs(view.y) > 1

  return {
    containerRef,
    zoomLabelRef,
    size,
    view,
    isDragging,
    isFullscreen,
    hasCustomView,
    zoomIn,
    zoomOut,
    resetView: fitView,
    toggleFullscreen,
    onPointerDown,
    onPointerMove,
    onPointerUp: endPointerGesture,
    onPointerCancel: endPointerGesture,
    onClickCapture,
    transitionDuration: reducedMotion || isDragging ? '0ms' : '150ms',
  }
}
