import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import {
  computeEdgeAnchors,
  computeRadialLayout,
  nodeBounds,
  nodeVisualSize,
} from '@/modules/impact-network/engine/radial-layout'
import type { FocusedPropagation } from '@/modules/impact-network/types/impact-network.types'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'
import {
  computeFocusCamera,
  IslandFocusDossier,
  ISLAND_REFOCUS_ANIMATION_MS,
  ISLAND_RESTORE_ANIMATION_MS,
  useIslandFocusCamera,
  type SceneView,
} from '@/modules/impact-network/components/island-focus'
import { IslandNode, type IslandImpactState } from './IslandNode'
import {
  PropagationEdge,
  buildPropagationEdgePath,
  type PropagationEdgeState,
} from './PropagationEdge'

export interface PropagationSceneProps {
  propagation: FocusedPropagation | null
  illuminatedCoordinationIds?: readonly CoordinationId[]
  activeEdgeId?: string | null
  propagatingCoordinationId?: CoordinationId | null
  riskLevel?: RiskLevel | null
  reducedMotion?: boolean
  showAllIlluminated?: boolean
  propagationDurationLabel?: string
  loading?: boolean
  error?: string | null
  viewResetKey?: number
  focusedEvent?: OperationalEvent | null
  onIslandFocusChange?: (active: boolean) => void
}

interface PanOffset {
  x: number
  y: number
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  panX: number
  panY: number
  moved: boolean
}

const DRAG_THRESHOLD = 5
const MIN_ZOOM = 0.45
const MAX_ZOOM = 2.5
const DEFAULT_ZOOM = 1
const ZOOM_WHEEL_SENSITIVITY = 0.0012
const ZOOM_BUTTON_STEP = 0.2

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

async function waitForCanvasResize(
  element: HTMLElement | null,
  predicate: (width: number) => boolean,
  timeoutMs = 520,
): Promise<void> {
  const deadline = performance.now() + timeoutMs

  await new Promise<void>((resolve) => {
    const tick = () => {
      const width = element
        ? Math.max(320, element.getBoundingClientRect().width)
        : 0

      if (predicate(width) || performance.now() >= deadline) {
        resolve()
        return
      }

      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  })

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function getIslandImpactState(
  coordinationId: CoordinationId,
  propagation: FocusedPropagation,
  illuminatedCoordinationIds: readonly CoordinationId[],
  propagatingCoordinationId: CoordinationId | null,
  showAllIlluminated: boolean,
): IslandImpactState {
  if (showAllIlluminated) {
    return coordinationId === propagation.originCoordinationId ||
      propagation.affectedCoordinationIds.includes(coordinationId)
      ? 'illuminated'
      : 'idle'
  }

  if (propagatingCoordinationId === coordinationId) return 'impacted'
  if (illuminatedCoordinationIds.includes(coordinationId)) {
    return 'illuminated'
  }
  return 'idle'
}

function SceneBackdrop() {
  return (
    <div className="propagation-scene__backdrop" aria-hidden="true">
      <div className="propagation-scene__fog" />
      <div className="propagation-scene__grid" />
      <div className="propagation-scene__scanlines" />
      <div className="propagation-scene__orbits">
        <span className="propagation-scene__orbit propagation-scene__orbit--outer" />
        <span className="propagation-scene__orbit propagation-scene__orbit--mid" />
        <span className="propagation-scene__orbit propagation-scene__orbit--inner" />
      </div>
      <div className="propagation-scene__particles">
        {Array.from({ length: 48 }, (_, index) => (
          <span key={index} style={{ '--particle-i': index } as CSSProperties} />
        ))}
      </div>
      <div className="propagation-scene__sparkles" />
      <div className="propagation-scene__tech-stars" />
    </div>
  )
}

export function PropagationScene({
  propagation,
  illuminatedCoordinationIds = [],
  activeEdgeId = null,
  propagatingCoordinationId = null,
  riskLevel = null,
  reducedMotion = false,
  showAllIlluminated = false,
  propagationDurationLabel = '—',
  loading = false,
  error = null,
  viewResetKey = 0,
  focusedEvent = null,
  onIslandFocusChange,
}: PropagationSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const panRef = useRef<PanOffset>({ x: 0, y: 0 })
  const zoomRef = useRef(DEFAULT_ZOOM)
  const [size, setSize] = useState({ width: 960, height: 640 })
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [isDragging, setIsDragging] = useState(false)
  const [focusIslandId, setFocusIslandId] = useState<CoordinationId | null>(null)
  const [islandFocusOpen, setIslandFocusOpen] = useState(false)
  const [dossierVisible, setDossierVisible] = useState(false)
  const preFocusWidthRef = useRef<number | null>(null)
  const focusFrameRef = useRef('')
  const islandFocusOpenRef = useRef(false)
  const isClosingFocusRef = useRef(false)
  const savedSceneViewRef = useRef<SceneView | null>(null)
  const closeRequestRef = useRef(0)
  const [focusLayoutRetry, setFocusLayoutRetry] = useState(0)

  const applySceneView = useCallback((view: SceneView) => {
    setPan(view.pan)
    setZoom(view.zoom)
  }, [])

  const {
    focusOnNode,
    animateToView,
    clearSavedView,
    isAnimating: isCameraAnimating,
  } = useIslandFocusCamera({
    reducedMotion,
    onViewChange: applySceneView,
  })

  const updateSize = useCallback(() => {
    const element = containerRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    setSize({
      width: Math.max(320, rect.width),
      height: Math.max(320, rect.height),
    })
  }, [])

  useEffect(() => {
    updateSize()
    const element = containerRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => updateSize())
    observer.observe(element)
    return () => observer.disconnect()
  }, [updateSize])

  const layout = useMemo(() => {
    if (!propagation) return null
    return computeRadialLayout(
      propagation.originCoordinationId as CoordinationId,
      propagation.affectedCoordinationIds as CoordinationId[],
      size,
      { includeConstellation: false },
    )
  }, [propagation, size])

  const nodeSize = layout?.nodeSize ?? 120

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  const applyZoomAtPoint = useCallback(
    (nextZoom: number, clientX: number, clientY: number) => {
      const element = containerRef.current
      if (!element) return

      const clamped = clampZoom(nextZoom)
      const currentZoom = zoomRef.current
      if (Math.abs(clamped - currentZoom) < 0.001) return

      const rect = element.getBoundingClientRect()
      const focalX = clientX - rect.left - rect.width / 2
      const focalY = clientY - rect.top - rect.height / 2
      const ratio = clamped / currentZoom
      const currentPan = panRef.current

      setPan({
        x: focalX - (focalX - currentPan.x) * ratio,
        y: focalY - (focalY - currentPan.y) * ratio,
      })
      setZoom(clamped)
    },
    [],
  )

  const applyZoomAtCenter = useCallback(
    (nextZoom: number) => {
      const element = containerRef.current
      if (!element) {
        setZoom(clampZoom(nextZoom))
        return
      }
      const rect = element.getBoundingClientRect()
      applyZoomAtPoint(
        nextZoom,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      )
    },
    [applyZoomAtPoint],
  )

  useEffect(() => {
    setFocusIslandId(null)
    setIslandFocusOpen(false)
    setDossierVisible(false)
    savedSceneViewRef.current = null
    clearSavedView()
    setPan({ x: 0, y: 0 })
    setZoom(DEFAULT_ZOOM)
    onIslandFocusChange?.(false)
  }, [clearSavedView, onIslandFocusChange, propagation?.originCoordinationId, propagation?.affectedCoordinationIds])

  useEffect(() => {
    setFocusIslandId(null)
    setIslandFocusOpen(false)
    setDossierVisible(false)
    savedSceneViewRef.current = null
    clearSavedView()
    setPan({ x: 0, y: 0 })
    setZoom(DEFAULT_ZOOM)
    onIslandFocusChange?.(false)
  }, [clearSavedView, onIslandFocusChange, viewResetKey])

  useEffect(() => {
    const element = containerRef.current
    if (!element || !propagation || islandFocusOpen) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = Math.exp(-event.deltaY * ZOOM_WHEEL_SENSITIVITY)
      applyZoomAtPoint(zoomRef.current * factor, event.clientX, event.clientY)
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [applyZoomAtPoint, islandFocusOpen, propagation])

  useEffect(() => {
    islandFocusOpenRef.current = islandFocusOpen
  }, [islandFocusOpen])

  const finishIslandFocusClose = useCallback(async () => {
    if (isClosingFocusRef.current) return
    isClosingFocusRef.current = true

    const targetView = savedSceneViewRef.current
    const wideWidth = size.width

    try {
      if (targetView) {
        const currentView = { pan: panRef.current, zoom: zoomRef.current }
        await animateToView(currentView, targetView, ISLAND_RESTORE_ANIMATION_MS)
      }

      onIslandFocusChange?.(false)

      const element = containerRef.current
      await waitForCanvasResize(
        element,
        (width) => width < wideWidth - 60,
        320,
      )

      if (targetView) {
        applySceneView(targetView)
      }

      setIslandFocusOpen(false)
      setDossierVisible(false)
      setFocusIslandId(null)
      preFocusWidthRef.current = null
      focusFrameRef.current = ''
      savedSceneViewRef.current = null
      clearSavedView()
    } finally {
      isClosingFocusRef.current = false
    }
  }, [animateToView, applySceneView, clearSavedView, onIslandFocusChange, size.width])

  const closeIslandFocus = useCallback(() => {
    if (dossierVisible) {
      const requestId = closeRequestRef.current + 1
      closeRequestRef.current = requestId
      setDossierVisible(false)

      window.setTimeout(() => {
        if (closeRequestRef.current !== requestId) return
        if (!islandFocusOpenRef.current || isClosingFocusRef.current) return
        void finishIslandFocusClose()
      }, 480)

      return
    }

    void finishIslandFocusClose()
  }, [dossierVisible, finishIslandFocusClose])

  const handleDossierExitComplete = useCallback(() => {
    if (!islandFocusOpenRef.current || isClosingFocusRef.current) return
    closeRequestRef.current += 1
    void finishIslandFocusClose()
  }, [finishIslandFocusClose])

  const smoothRefocus = useCallback(
    (nodeX: number, nodeY: number) => {
      const currentView = { pan: panRef.current, zoom: zoomRef.current }
      const target = computeFocusCamera(nodeX, nodeY, size.width, size.height)
      void animateToView(currentView, target, ISLAND_REFOCUS_ANIMATION_MS)
    },
    [animateToView, size.height, size.width],
  )

  useEffect(() => {
    if (isClosingFocusRef.current || !islandFocusOpen || !focusIslandId || !layout) return

    const baseline = preFocusWidthRef.current
    if (baseline !== null && size.width < baseline + 80) {
      return
    }

    const node = layout.nodes.find(
      (item) => item.coordinationId === focusIslandId,
    )
    if (!node) return

    const frameKey = `${size.width}x${size.height}:${Math.round(node.x)}:${Math.round(node.y)}`
    if (focusFrameRef.current === frameKey) return

    const isInitialFocus = focusFrameRef.current === ''
    focusFrameRef.current = frameKey
    preFocusWidthRef.current = null

    if (isInitialFocus) {
      const currentView = { pan: panRef.current, zoom: zoomRef.current }
      void focusOnNode(currentView, node.x, node.y, size.width, size.height).then(
        () => {
          if (islandFocusOpenRef.current) {
            setDossierVisible(true)
          }
        },
      )
      return
    }

    if (!isCameraAnimating) {
      smoothRefocus(node.x, node.y)
    }
  }, [
    focusIslandId,
    focusOnNode,
    islandFocusOpen,
    isCameraAnimating,
    layout,
    size.height,
    size.width,
    focusLayoutRetry,
    smoothRefocus,
  ])

  useEffect(() => {
    if (
      isClosingFocusRef.current ||
      isCameraAnimating ||
      !islandFocusOpen ||
      !focusIslandId ||
      !layout
    ) {
      return
    }
    if (focusFrameRef.current === '') return

    const node = layout.nodes.find(
      (item) => item.coordinationId === focusIslandId,
    )
    if (!node) return

    const frameKey = `${size.width}x${size.height}:${Math.round(node.x)}:${Math.round(node.y)}`
    if (focusFrameRef.current === frameKey) return

    focusFrameRef.current = frameKey
    smoothRefocus(node.x, node.y)
  }, [
    focusIslandId,
    isCameraAnimating,
    islandFocusOpen,
    layout,
    size.height,
    size.width,
    smoothRefocus,
  ])

  const handleSelectIsland = useCallback(
    (coordinationId: CoordinationId) => {
      if (dragRef.current?.moved || !propagation || !layout || !focusedEvent) {
        return
      }

      if (focusIslandId === coordinationId && islandFocusOpen) {
        void closeIslandFocus()
        return
      }

      const element = containerRef.current
      preFocusWidthRef.current = element
        ? Math.max(320, element.getBoundingClientRect().width)
        : size.width
      focusFrameRef.current = ''
      savedSceneViewRef.current = {
        pan: { ...panRef.current },
        zoom: zoomRef.current,
      }

      setFocusIslandId(coordinationId)
      setIslandFocusOpen(true)
      onIslandFocusChange?.(true)

      window.setTimeout(() => {
        if (preFocusWidthRef.current === null) return
        preFocusWidthRef.current = null
        setFocusLayoutRetry((value) => value + 1)
      }, 420)
    },
    [
      closeIslandFocus,
      focusIslandId,
      focusedEvent,
      islandFocusOpen,
      layout,
      onIslandFocusChange,
      propagation,
      size.width,
    ],
  )

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || islandFocusOpen) return
    const target = event.target as HTMLElement
    if (target.closest('.propagation-island')) return

    // Starting a pan on a text/HUD layer must never enter the browser's
    // native text-selection gesture.
    event.preventDefault()

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [islandFocusOpen, pan.x, pan.y])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const element = containerRef.current
    if (!element) return

    const drag = dragRef.current
    if (drag && drag.pointerId === event.pointerId) {
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        drag.moved = true
        setIsDragging(true)
        event.preventDefault()
      }
      setPan({ x: drag.panX + dx, y: drag.panY + dy })
      return
    }

    if (reducedMotion || isDragging) return
    const bounds = element.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    element.style.setProperty('--scene-parallax-x', `${(x * 3).toFixed(2)}px`)
    element.style.setProperty('--scene-parallax-y', `${(y * 2).toFixed(2)}px`)
  }, [isDragging, reducedMotion])

  const endDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      dragRef.current = null
      setIsDragging(false)
    }
  }, [])

  const resetParallax = useCallback(() => {
    const element = containerRef.current
    if (!element) return
    element.style.setProperty('--scene-parallax-x', '0px')
    element.style.setProperty('--scene-parallax-y', '0px')
  }, [])

  const edgePaths = useMemo(() => {
    if (!propagation || !layout) return []
    const originNode = layout.nodes.find((node) => node.role === 'origin')
    if (!originNode) return []

    const originBounds = nodeBounds(originNode, nodeSize)

    return propagation.edges
      .map((edge) => {
        const targetNode = layout.nodes.find(
          (node) => node.coordinationId === edge.targetCoordinationId,
        )
        if (!targetNode) return null

        const targetBounds = nodeBounds(targetNode, nodeSize)
        const anchors = computeEdgeAnchors(originBounds, targetBounds)
        const curvature = 0.16 + (edge.order % 3) * 0.05
        const direction = edge.order % 2 === 0 ? 1 : -1

        return {
          id: edge.id,
          path: buildPropagationEdgePath(
            anchors.source,
            anchors.target,
            curvature * direction,
          ),
          targetCoordinationId: edge.targetCoordinationId,
          order: edge.order,
        }
      })
      .filter(Boolean) as Array<{
      id: string
      path: string
      targetCoordinationId: CoordinationId
      order: number
    }>
  }, [layout, nodeSize, propagation])

  const getEdgeState = useCallback(
    (edgeId: string): PropagationEdgeState => {
      if (showAllIlluminated) return 'completed'
      if (activeEdgeId === edgeId) return 'active'
      if (
        illuminatedCoordinationIds.some((id) => edgeId.endsWith(`-->${id}`))
      ) {
        return 'completed'
      }
      return 'dormant'
    },
    [activeEdgeId, illuminatedCoordinationIds, showAllIlluminated],
  )

  const stageStyle = {
    '--scene-pan-x': `${pan.x}px`,
    '--scene-pan-y': `${pan.y}px`,
    '--scene-zoom': String(zoom),
  } as CSSProperties

  if (!propagation || !layout) {
    return (
      <div
        ref={containerRef}
        className="propagation-scene propagation-scene--empty"
      >
        <SceneBackdrop />
        <div
          className={[
            'propagation-scene__status',
            error ? 'propagation-scene__status--error' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role={error ? 'alert' : 'status'}
        >
          {loading ? (
            <>
              <span className="propagation-scene__status-signal" aria-hidden="true" />
              <p>Sincronizando situaciones operacionales…</p>
            </>
          ) : error ? (
            <>
              <span
                className="propagation-scene__status-signal propagation-scene__status-signal--error"
                aria-hidden="true"
              />
              <p>Monitoreo suspendido. {error}</p>
            </>
          ) : (
            <p className="propagation-scene__empty-copy">
              Selecciona una situación del panel derecho para observar su
              propagación.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={[
        'propagation-scene',
        isDragging ? 'propagation-scene--dragging' : '',
        islandFocusOpen ? 'propagation-scene--island-focus' : '',
        dossierVisible ? 'propagation-scene--dossier-visible' : '',
        isCameraAnimating ? 'propagation-scene--camera-animating' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-risk={riskLevel ?? 'moderate'}
      data-reduced-motion={reducedMotion}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        // Pointer capture keeps an active pan alive while the cursor crosses
        // the scene boundary; only a real pointerup/cancel ends the gesture.
        if (!dragRef.current) resetParallax()
      }}
    >
      <SceneBackdrop />

      <div className="propagation-scene__hud" aria-hidden="true">
        <span className="propagation-scene__hud-kicker">IMPACT NETWORK / LIVE FIELD</span>
        <span className="propagation-scene__hud-status">
          <i /> SIGNAL LOCKED · {layout.nodes.length.toString().padStart(2, '0')} NODES
        </span>
      </div>

      <div
        className="propagation-scene__zoom-controls"
        aria-label="Controles de zoom del mapa"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="propagation-scene__zoom-btn"
          aria-label="Acercar mapa"
          title="Acercar (rueda del mouse)"
          disabled={zoom >= MAX_ZOOM - 0.01}
          onClick={() => applyZoomAtCenter(zoom + ZOOM_BUTTON_STEP)}
        >
          +
        </button>
        <span className="propagation-scene__zoom-level" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="propagation-scene__zoom-btn"
          aria-label="Alejar mapa"
          title="Alejar (rueda del mouse)"
          disabled={zoom <= MIN_ZOOM + 0.01}
          onClick={() => applyZoomAtCenter(zoom - ZOOM_BUTTON_STEP)}
        >
          −
        </button>
      </div>

      <aside className="propagation-scene__focus-overlay" aria-label="Resumen de propagación">
        <div>
          <span>Origen</span>
          <strong>{propagation.originName}</strong>
        </div>
        <div>
          <span>Impacto</span>
          <strong>{propagation.affectedCoordinationIds.length} coordinaciones</strong>
        </div>
        <div>
          <span>Riesgo</span>
          <strong data-risk={riskLevel ?? 'moderate'}>{riskLevel ?? 'moderate'}</strong>
        </div>
        <div>
          <span>Tiempo</span>
          <strong>{propagationDurationLabel}</strong>
        </div>
      </aside>

      <div className="propagation-scene__stage" style={stageStyle}>
        <div className="propagation-scene__halos" aria-hidden="true">
          {layout.nodes.map((node) => {
            const visual = nodeVisualSize(node, nodeSize)
            return (
              <span
                key={`halo-${node.coordinationId}`}
                className="propagation-scene__ambient-halo"
                data-role={node.role}
                style={{
                  left: node.x,
                  top: node.y,
                  width: visual,
                  height: visual,
                  transform: 'translate3d(-50%, -50%, 0)',
                }}
              />
            )
          })}
        </div>

        <svg
          className="propagation-scene__edges"
          data-focus-hidden={islandFocusOpen}
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-hidden="true"
        >
          {edgePaths.map((edge) => (
            <PropagationEdge
              key={edge.id}
              id={edge.id}
              path={edge.path}
              state={getEdgeState(edge.id)}
              riskLevel={riskLevel}
              reducedMotion={reducedMotion}
              order={edge.order}
            />
          ))}
        </svg>

        <div className="propagation-scene__islands">
          {layout.nodes.map((node) => {
            const impactState = getIslandImpactState(
              node.coordinationId,
              propagation,
              illuminatedCoordinationIds as CoordinationId[],
              propagatingCoordinationId,
              showAllIlluminated,
            )
            const visual = nodeVisualSize(node, nodeSize)

            const isFocusedIsland = focusIslandId === node.coordinationId
            const hideIsland = islandFocusOpen && !isFocusedIsland

            return (
              <IslandNode
                key={node.coordinationId}
                coordinationId={node.coordinationId}
                role={node.role}
                riskLevel={riskLevel}
                impactState={impactState}
                selected={isFocusedIsland && islandFocusOpen}
                onSelect={handleSelectIsland}
                scale={node.scale}
                sceneZoom={zoom}
                className={[
                  'propagation-scene__island',
                  hideIsland ? 'propagation-scene__island--hidden' : '',
                  isFocusedIsland && islandFocusOpen
                    ? 'propagation-scene__island--focus-active'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: node.x,
                  top: node.y,
                  width: visual,
                  height: visual,
                  transform: 'translate3d(-50%, -50%, 0)',
                }}
              />
            )
          })}
        </div>
      </div>

      {focusedEvent && focusIslandId && propagation ? (
        <IslandFocusDossier
          open={dossierVisible}
          coordinationId={focusIslandId}
          propagation={propagation}
          event={focusedEvent}
          reducedMotion={reducedMotion}
          onClose={closeIslandFocus}
          onExitComplete={handleDossierExitComplete}
        />
      ) : null}
    </div>
  )
}
