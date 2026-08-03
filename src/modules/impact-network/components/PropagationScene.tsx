import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'
import {
  resolveCoordinationId,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import {
  computeEdgeAnchors,
  computeRadialLayout,
  nodeBounds,
  nodeVisualSize,
} from '@/modules/impact-network/engine/radial-layout'
import type { FocusedPropagation } from '@/modules/impact-network/types/impact-network.types'
import type {
  OperationalEvent,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import {
  computeFocusCamera,
  IslandFocusDossier,
  ISLAND_REFOCUS_ANIMATION_MS,
  ISLAND_RESTORE_ANIMATION_MS,
  useIslandFocusCamera,
  type SceneView,
} from '@/modules/impact-network/components/island-focus'
import {
  ImpactMapGuide,
  ImpactMapTelemetry,
} from './ImpactMapChrome'
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
  allowIslandFocus?: boolean
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

interface SceneBackdropProps {
  /** Continuous ambient particles. Balanced mode uses ~10; reduced uses 0. */
  particleCount?: number
  /** Skip SVG feGaussianBlur on atlas links (cheaper for GPU). */
  softAtlasBlur?: boolean
  /** Hide continuous scanline/sparkle layers. */
  liteEffects?: boolean
}

export function SceneBackdrop({
  particleCount = 10,
  softAtlasBlur = false,
  liteEffects = true,
}: SceneBackdropProps = {}) {
  return (
    <div className="propagation-scene__backdrop" aria-hidden="true">
      <div className="propagation-scene__fog" />
      <div className="propagation-scene__grid" />
      <svg
        className="propagation-scene__atlas"
        viewBox="0 0 1200 760"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="impact-atlas-glow" cx="50%" cy="48%" r="54%">
            <stop offset="0%" stopColor="#17477c" stopOpacity=".3" />
            <stop offset="58%" stopColor="#08274b" stopOpacity=".12" />
            <stop offset="100%" stopColor="#020a15" stopOpacity="0" />
          </radialGradient>
          {softAtlasBlur ? (
            <filter id="impact-atlas-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ) : null}
          <clipPath id="impact-atlas-clip">
            <ellipse cx="600" cy="400" rx="520" ry="310" />
          </clipPath>
        </defs>

        <ellipse
          className="propagation-scene__atlas-glow"
          cx="600"
          cy="400"
          rx="520"
          ry="310"
          fill="url(#impact-atlas-glow)"
        />

        <g className="propagation-scene__atlas-sphere" clipPath="url(#impact-atlas-clip)">
          <ellipse cx="600" cy="400" rx="520" ry="310" />
          <ellipse cx="600" cy="400" rx="520" ry="228" />
          <ellipse cx="600" cy="400" rx="520" ry="142" />
          <ellipse cx="600" cy="400" rx="520" ry="62" />
          <path d="M600 89C451 163 389 265 389 400s62 237 211 310" />
          <path d="M600 89C749 163 811 265 811 400s-62 237-211 310" />
          <path d="M600 89C522 184 489 286 489 400s33 216 111 310" />
          <path d="M600 89C678 184 711 286 711 400s-33 216-111 310" />
        </g>

        <g className="propagation-scene__atlas-land">
          <path d="M178 290 218 238 276 218 329 237 346 270 325 297 291 301 270 334 225 337 199 316Z" />
          <path d="m300 350 49 18 32 44-8 57-34 38-19 67-29-24 5-65-23-45 12-51Z" />
          <path d="m498 265 42-25 53 10 30 30-19 25-48 5-22-16-42 6Z" />
          <path d="m542 322 63-13 67 30 7 54-29 44-20 81-48 31-35-64-37-42 12-69Z" />
          <path d="m628 250 65-31 99 13 61 35 77 5 76 38-30 42-84 6-51 44-45-10-34-40-55-9-35-38-54-14Z" />
          <path d="m878 485 49-25 58 23-5 45-51 20-57-24Z" />
          <path d="m986 390 28-8 18 18-16 18-31-8Z" />
        </g>

        <g
          className="propagation-scene__atlas-links"
          filter={softAtlasBlur ? 'url(#impact-atlas-soft-glow)' : undefined}
        >
          <path d="M205 311 318 378 520 292 664 355 850 293 970 500" />
          <path d="M315 492 542 399 704 276 926 314" />
          <path d="M359 260 520 292 605 475 878 505" />
          <circle cx="205" cy="311" r="3" />
          <circle cx="318" cy="378" r="2.5" />
          <circle cx="520" cy="292" r="3.2" />
          <circle cx="605" cy="475" r="2.7" />
          <circle cx="664" cy="355" r="3" />
          <circle cx="704" cy="276" r="2.4" />
          <circle cx="850" cy="293" r="3.1" />
          <circle cx="878" cy="505" r="2.6" />
          <circle cx="970" cy="500" r="3" />
        </g>

        <g className="propagation-scene__atlas-orbits">
          <ellipse cx="600" cy="400" rx="575" ry="346" transform="rotate(-8 600 400)" />
          <ellipse cx="600" cy="400" rx="448" ry="350" transform="rotate(18 600 400)" />
          <path d="M92 537C304 645 826 684 1112 458" />
          <path d="M126 195C378 75 868 83 1088 220" />
        </g>
      </svg>
      {!liteEffects ? <div className="propagation-scene__scanlines" /> : null}
      <div className="propagation-scene__orbits">
        <span className="propagation-scene__orbit propagation-scene__orbit--outer" />
        <span className="propagation-scene__orbit propagation-scene__orbit--mid" />
        <span className="propagation-scene__orbit propagation-scene__orbit--inner" />
      </div>
      {particleCount > 0 ? (
        <div className="propagation-scene__particles">
          {Array.from({ length: particleCount }, (_, index) => (
            <span key={index} style={{ '--particle-i': index } as CSSProperties} />
          ))}
        </div>
      ) : null}
      {!liteEffects ? (
        <>
          <div className="propagation-scene__sparkles" />
          <div className="propagation-scene__tech-stars" />
        </>
      ) : null}
      <div className="propagation-scene__coordinates">
        <span>LAT 04.7109 N</span>
        <span>RED NEX / 01</span>
        <span>ALT 2.640 M</span>
        <span>SYNC 12 / 12</span>
      </div>
    </div>
  )
}

const RISK_LADDER: readonly RiskLevel[] = [
  'low',
  'moderate',
  'high',
  'critical',
]

function attenuateRisk(
  risk: RiskLevel | null,
  steps: number,
): RiskLevel {
  const index = RISK_LADDER.indexOf(risk ?? 'moderate')
  return RISK_LADDER[Math.max(0, index - steps)]
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
  allowIslandFocus = true,
  onIslandFocusChange,
}: PropagationSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const zoomLabelRef = useRef<HTMLSpanElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const panRef = useRef<PanOffset>({ x: 0, y: 0 })
  const zoomRef = useRef(DEFAULT_ZOOM)
  const [size, setSize] = useState({ width: 960, height: 640 })
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [isDragging, setIsDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pageHidden, setPageHidden] = useState(false)
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

  const writeStageView = useCallback((nextPan: PanOffset, nextZoom: number) => {
    panRef.current = nextPan
    zoomRef.current = nextZoom
    const stage = stageRef.current
    if (stage) {
      stage.style.setProperty('--scene-pan-x', `${nextPan.x}px`)
      stage.style.setProperty('--scene-pan-y', `${nextPan.y}px`)
      stage.style.setProperty('--scene-zoom', String(nextZoom))
    }
    if (zoomLabelRef.current) {
      zoomLabelRef.current.textContent = `${Math.round(nextZoom * 100)}%`
    }
  }, [])

  const commitSceneView = useCallback(
    (view: SceneView) => {
      writeStageView(view.pan, view.zoom)
      setPan(view.pan)
      setZoom(view.zoom)
    },
    [writeStageView],
  )

  const applySceneViewLive = useCallback(
    (view: SceneView) => {
      writeStageView(view.pan, view.zoom)
    },
    [writeStageView],
  )

  const {
    focusOnNode,
    animateToView,
    clearSavedView,
    isAnimating: isCameraAnimating,
  } = useIslandFocusCamera({
    reducedMotion,
    onViewChange: applySceneViewLive,
    onViewCommit: commitSceneView,
  })

  useEffect(() => {
    writeStageView(pan, zoom)
  }, [pan, writeStageView, zoom])

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden)
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
      window.requestAnimationFrame(updateSize)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
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

  const assessedRiskByCoordination = useMemo(() => {
    const result = new Map<CoordinationId, RiskLevel>()
    const assessments =
      focusedEvent?.interpretation?.executiveReport?.affectedAreas ?? []

    for (const assessment of assessments) {
      const coordinationId = resolveCoordinationId(assessment.name)
      if (coordinationId) {
        result.set(coordinationId, assessment.affectationLevel)
      }
    }

    return result
  }, [focusedEvent])

  const getVisualRisk = useCallback(
    (
      coordinationId: CoordinationId,
      role: 'origin' | 'affected' | 'ambient',
      order = 0,
    ): RiskLevel => {
      const assessedRisk = assessedRiskByCoordination.get(coordinationId)
      if (assessedRisk) return assessedRisk
      if (role === 'origin') return riskLevel ?? 'moderate'

      // Replay can reveal areas that were not part of the first AI assessment.
      // Represent that additional reach as an attenuated ring of impact. The
      // first newly discovered hop is visually separated from assessed areas.
      return attenuateRisk(riskLevel, order === 0 || order > 2 ? 2 : 1)
    },
    [assessedRiskByCoordination, riskLevel],
  )

  const applyZoomAtPoint = useCallback(
    (nextZoom: number, clientX: number, clientY: number, commit = false) => {
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
      const nextPan = {
        x: focalX - (focalX - currentPan.x) * ratio,
        y: focalY - (focalY - currentPan.y) * ratio,
      }

      if (commit) {
        commitSceneView({ pan: nextPan, zoom: clamped })
      } else {
        writeStageView(nextPan, clamped)
      }
    },
    [commitSceneView, writeStageView],
  )

  const applyZoomAtCenter = useCallback(
    (nextZoom: number) => {
      const element = containerRef.current
      if (!element) {
        commitSceneView({ pan: panRef.current, zoom: clampZoom(nextZoom) })
        return
      }
      const rect = element.getBoundingClientRect()
      applyZoomAtPoint(
        nextZoom,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        true,
      )
    },
    [applyZoomAtPoint, commitSceneView],
  )

  useEffect(() => {
    setFocusIslandId(null)
    setIslandFocusOpen(false)
    setDossierVisible(false)
    savedSceneViewRef.current = null
    clearSavedView()
    commitSceneView({ pan: { x: 0, y: 0 }, zoom: DEFAULT_ZOOM })
    onIslandFocusChange?.(false)
  }, [
    clearSavedView,
    commitSceneView,
    onIslandFocusChange,
    propagation?.originCoordinationId,
    propagation?.affectedCoordinationIds,
  ])

  useEffect(() => {
    setFocusIslandId(null)
    setIslandFocusOpen(false)
    setDossierVisible(false)
    savedSceneViewRef.current = null
    clearSavedView()
    commitSceneView({ pan: { x: 0, y: 0 }, zoom: DEFAULT_ZOOM })
    onIslandFocusChange?.(false)
  }, [clearSavedView, commitSceneView, onIslandFocusChange, viewResetKey])

  useEffect(() => {
    const element = containerRef.current
    if (!element || !propagation || islandFocusOpen) return

    let wheelCommitTimer: number | null = null
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = Math.exp(-event.deltaY * ZOOM_WHEEL_SENSITIVITY)
      applyZoomAtPoint(zoomRef.current * factor, event.clientX, event.clientY, false)
      if (wheelCommitTimer !== null) window.clearTimeout(wheelCommitTimer)
      wheelCommitTimer = window.setTimeout(() => {
        commitSceneView({ pan: { ...panRef.current }, zoom: zoomRef.current })
      }, 140)
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      element.removeEventListener('wheel', handleWheel)
      if (wheelCommitTimer !== null) window.clearTimeout(wheelCommitTimer)
    }
  }, [applyZoomAtPoint, commitSceneView, islandFocusOpen, propagation])

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
        commitSceneView(targetView)
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
  }, [animateToView, commitSceneView, clearSavedView, onIslandFocusChange, size.width])

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
      if (
        !allowIslandFocus ||
        dragRef.current?.moved ||
        !propagation ||
        !layout ||
        !focusedEvent
      ) {
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
      allowIslandFocus,
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
      panX: panRef.current.x,
      panY: panRef.current.y,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [islandFocusOpen])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const element = containerRef.current
    if (!element) return

    const drag = dragRef.current
    if (drag && drag.pointerId === event.pointerId) {
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        drag.moved = true
        if (!isDragging) setIsDragging(true)
        event.preventDefault()
      }
      writeStageView(
        { x: drag.panX + dx, y: drag.panY + dy },
        zoomRef.current,
      )
      return
    }

    // Balanced mode skips continuous parallax to reduce style recalc cost.
    if (reducedMotion || isDragging) return
  }, [isDragging, reducedMotion, writeStageView])

  const endDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      dragRef.current = null
      commitSceneView({
        pan: { ...panRef.current },
        zoom: zoomRef.current,
      })
      setIsDragging(false)
    }
  }, [commitSceneView])

  const resetParallax = useCallback(() => {
    const element = containerRef.current
    if (!element) return
    element.style.setProperty('--scene-parallax-x', '0px')
    element.style.setProperty('--scene-parallax-y', '0px')
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const element = containerRef.current
    if (!element) return

    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen()
      } else {
        await element.requestFullscreen()
      }
    } catch {
      // Fullscreen can be denied by the browser or embedding host. The map
      // remains fully usable with pan and zoom when that happens.
    }
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
          tone: getVisualRisk(
            edge.targetCoordinationId as CoordinationId,
            'affected',
            edge.order,
          ),
          target: anchors.target,
        }
      })
      .filter(Boolean) as Array<{
      id: string
      path: string
      targetCoordinationId: CoordinationId
      order: number
      tone: RiskLevel
      target: { x: number; y: number }
    }>
  }, [getVisualRisk, layout, nodeSize, propagation])

  const relayPaths = useMemo(() => {
    if (!layout) return []
    const affectedNodes = layout.nodes
      .filter((node) => node.role === 'affected')
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))

    if (affectedNodes.length < 2) return []

    const paths: Array<{
      id: string
      path: string
      tone: RiskLevel
      kind: 'upper' | 'return'
    }> = affectedNodes.slice(0, -1).map((node, index) => {
      const next = affectedNodes[index + 1]
      const lift = Math.max(36, Math.abs(next.x - node.x) * 0.18)
      const controlX = (node.x + next.x) / 2
      const controlY = Math.min(node.y, next.y) - lift
      return {
        id: `relay-${node.coordinationId}-${next.coordinationId}`,
        path: `M ${node.x} ${node.y + nodeSize * 0.08} Q ${controlX} ${controlY} ${next.x} ${next.y + nodeSize * 0.08}`,
        tone: getVisualRisk(
          next.coordinationId,
          'affected',
          next.slotIndex ?? index + 1,
        ),
        kind: 'upper',
      }
    })

    const first = affectedNodes[0]
    const last = affectedNodes[affectedNodes.length - 1]
    paths.push({
      id: `relay-return-${last.coordinationId}-${first.coordinationId}`,
      path: `M ${last.x} ${last.y + nodeSize * 0.16} Q ${layout.center.x} ${layout.center.y + nodeSize * 1.5} ${first.x} ${first.y + nodeSize * 0.16}`,
      tone: 'low',
      kind: 'return',
    })

    return paths
  }, [getVisualRisk, layout, nodeSize])

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

  if (!propagation || !layout) {
    return (
      <div
        ref={containerRef}
        className="propagation-scene propagation-scene--empty"
        data-perf={reducedMotion ? 'reduced' : 'balanced'}
        data-page-hidden={pageHidden}
        data-reduced-motion={reducedMotion}
      >
        <SceneBackdrop
          particleCount={reducedMotion ? 0 : 10}
          softAtlasBlur={false}
          liteEffects
        />
        <ImpactMapGuide />
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
      data-perf={reducedMotion ? 'reduced' : 'balanced'}
      data-page-hidden={pageHidden}
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
      <SceneBackdrop
        particleCount={reducedMotion ? 0 : 10}
        softAtlasBlur={false}
        liteEffects
      />
      <ImpactMapGuide
        title="Nivel 03 · Mapa de impacto"
        description="Las conexiones iluminadas muestran la propagación. Use Volver en el encabezado o en el panel para regresar."
      />

      <div
        className="propagation-scene__zoom-controls"
        aria-label="Controles de zoom del mapa"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="propagation-scene__zoom-btn propagation-scene__zoom-btn--fullscreen"
          aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Ver mapa en pantalla completa'}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          onClick={() => void toggleFullscreen()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
          </svg>
        </button>
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
        <span
          ref={zoomLabelRef}
          className="propagation-scene__zoom-level"
          aria-live="polite"
        >
          {Math.round(zoom * 100)}%
        </span>
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
      </div>

      <div ref={stageRef} className="propagation-scene__stage">
        <div className="propagation-scene__halos" aria-hidden="true">
          {layout.nodes.map((node, index) => {
            const visual = nodeVisualSize(node, nodeSize)
            return (
              <span
                key={`halo-${node.coordinationId}`}
                className="propagation-scene__ambient-halo"
                data-role={node.role}
                style={
                  {
                    left: node.x,
                    top: node.y,
                    width: visual,
                    height: visual,
                    transform: 'translate3d(-50%, -50%, 0)',
                    '--island-order': index,
                    '--island-enter-delay': `${130 + index * 75}ms`,
                  } as CSSProperties
                }
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
          <g className="propagation-scene__relay-network">
            {relayPaths.map((relay, index) => (
              <g
                key={relay.id}
                className="propagation-relay"
                data-tone={relay.tone}
                data-kind={relay.kind}
              >
                <path
                  id={relay.id}
                  className="propagation-relay__glow"
                  d={relay.path}
                  pathLength={1}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className="propagation-relay__line"
                  d={relay.path}
                  pathLength={1}
                  vectorEffect="non-scaling-stroke"
                />
                {!reducedMotion ? (
                  <circle
                    className="propagation-relay__particle"
                    r={index === relayPaths.length - 1 ? 2.4 : 2.8}
                  >
                    <animateMotion
                      begin={`${index * 0.45}s`}
                      dur={`${3.4 + index * 0.35}s`}
                      repeatCount="indefinite"
                    >
                      <mpath href={`#${relay.id}`} />
                    </animateMotion>
                  </circle>
                ) : null}
              </g>
            ))}
          </g>
          {edgePaths.map((edge) => (
            <g key={edge.id}>
              <PropagationEdge
                id={edge.id}
                path={edge.path}
                state={getEdgeState(edge.id)}
                riskLevel={edge.tone}
                reducedMotion={reducedMotion}
                order={edge.order}
              />
              <circle
                className="propagation-edge__junction"
                data-tone={edge.tone}
                cx={edge.target.x}
                cy={edge.target.y}
                r="3.2"
              />
            </g>
          ))}
        </svg>

        <div className="propagation-scene__islands">
          {layout.nodes.map((node, index) => {
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
                visualRisk={getVisualRisk(
                  node.coordinationId,
                  node.role,
                  node.slotIndex ?? 0,
                )}
                impactState={impactState}
                selected={isFocusedIsland && islandFocusOpen}
                onSelect={allowIslandFocus ? handleSelectIsland : undefined}
                disabled={!allowIslandFocus}
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
                style={
                  {
                    left: node.x,
                    top: node.y,
                    width: visual,
                    height: visual,
                    transform: 'translate3d(-50%, -50%, 0)',
                    '--island-order': index,
                    '--island-enter-delay': `${130 + index * 75}ms`,
                  } as CSSProperties
                }
              />
            )
          })}
        </div>
      </div>

      <ImpactMapTelemetry
        propagation={propagation}
        event={focusedEvent ?? null}
        riskLevel={riskLevel}
        riskScore={focusedEvent?.interpretation?.riskScore ?? 0}
        propagationDurationLabel={propagationDurationLabel}
      />

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
