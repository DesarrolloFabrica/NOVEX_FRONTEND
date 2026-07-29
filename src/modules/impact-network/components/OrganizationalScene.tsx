import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'
import { motion } from 'motion/react'
import { createPortal } from 'react-dom'
import {
  getCoordinationIslandAsset,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import { CoordinationSituationNodes } from '@/modules/impact-network/components/CoordinationSituationNodes'
import { ImpactMapTelemetry } from '@/modules/impact-network/components/ImpactMapChrome'
import { IslandNode } from '@/modules/impact-network/components/IslandNode'
import {
  PropagationEdge,
  buildPropagationEdgePath,
  type PropagationEdgeState,
} from '@/modules/impact-network/components/PropagationEdge'
import {
  IslandFocusDossier,
  computeFocusCamera,
  ISLAND_FOCUS_ANIMATION_MS,
  ISLAND_RESTORE_ANIMATION_MS,
  useIslandFocusCamera,
  type SceneView,
} from '@/modules/impact-network/components/island-focus'
import { SceneBackdrop } from '@/modules/impact-network/components/PropagationScene'
import { buildStructureLayout } from '@/modules/impact-network/engine/structure-layout'
import type {
  FocusedPropagation,
  ImpactIncident,
} from '@/modules/impact-network/types/impact-network.types'
import type {
  OperationalEvent,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

interface OrganizationalSceneProps {
  coordinationIds: readonly CoordinationId[]
  selectedCoordinationId: CoordinationId | null
  assignedCoordinationId?: CoordinationId | null
  coordinatorMode?: boolean
  reducedMotion?: boolean
  loading?: boolean
  error?: string | null
  viewResetKey?: number
  propagation?: FocusedPropagation | null
  focusedEvent?: OperationalEvent | null
  illuminatedCoordinationIds?: readonly CoordinationId[]
  predictedCoordinationIds?: readonly CoordinationId[]
  predictionVisible?: boolean
  activeEdgeId?: string | null
  propagatingCoordinationId?: CoordinationId | null
  riskLevel?: RiskLevel | null
  showAllIlluminated?: boolean
  propagationDurationLabel?: string
  coordinationSituations?: readonly ImpactIncident[]
  onIslandFocusChange?: (active: boolean) => void
  onSelectCoordination: (coordinationId: CoordinationId) => void
  onSelectSituation?: (eventId: string) => void
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  panX: number
  panY: number
}

const MIN_ZOOM = 0.48
const MAX_ZOOM = 2.4
const ZOOM_STEP = 0.2
interface StructureVisual {
  rgb: string
  hue: string
}

const STRUCTURE_VISUALS: Record<CoordinationId, StructureVisual> = {
  'coord-general': { rgb: '88 135 255', hue: '28deg' },
  'coord-b2b': { rgb: '35 214 218', hue: '-12deg' },
  'coord-bellas-artes': { rgb: '255 111 94', hue: '174deg' },
  'coord-desarrollo-profesional': { rgb: '42 185 255', hue: '10deg' },
  'coord-social-lab': { rgb: '246 203 65', hue: '-144deg' },
  'coord-empresarial': { rgb: '255 79 142', hue: '148deg' },
  'coord-especializaciones': { rgb: '47 185 145', hue: '-34deg' },
  'coord-ingenierias': { rgb: '109 178 92', hue: '-62deg' },
  'coord-operaciones-academicas': { rgb: '149 105 255', hue: '70deg' },
  'coord-proyeccion-social': { rgb: '205 92 255', hue: '102deg' },
  'coord-saber-pro': { rgb: '255 181 64', hue: '-154deg' },
  'coord-transversales': { rgb: '64 197 255', hue: '0deg' },
  'coord-negocios': { rgb: '44 220 190', hue: '-22deg' },
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function getImpactState(
  coordinationId: CoordinationId,
  propagation: FocusedPropagation | null,
  illuminatedCoordinationIds: readonly CoordinationId[],
  propagatingCoordinationId: CoordinationId | null,
  showAllIlluminated: boolean,
) {
  if (!propagation) return 'idle' as const
  const isConnected =
    coordinationId === propagation.originCoordinationId ||
    propagation.affectedCoordinationIds.includes(coordinationId)

  if (showAllIlluminated && isConnected) return 'illuminated' as const
  if (propagatingCoordinationId === coordinationId) return 'impacted' as const
  if (illuminatedCoordinationIds.includes(coordinationId)) {
    return 'illuminated' as const
  }
  return 'idle' as const
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
    </svg>
  )
}

function OrganizationalSceneView({
  coordinationIds,
  selectedCoordinationId,
  assignedCoordinationId = null,
  coordinatorMode = false,
  reducedMotion = false,
  loading = false,
  error = null,
  viewResetKey = 0,
  propagation = null,
  focusedEvent = null,
  illuminatedCoordinationIds = [],
  predictedCoordinationIds = [],
  predictionVisible = false,
  activeEdgeId = null,
  propagatingCoordinationId = null,
  riskLevel = null,
  showAllIlluminated = false,
  propagationDurationLabel = '—',
  coordinationSituations = [],
  onIslandFocusChange,
  onSelectCoordination,
  onSelectSituation,
}: OrganizationalSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 960, height: 640 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [focusIslandId, setFocusIslandId] = useState<CoordinationId | null>(null)
  const [islandFocusOpen, setIslandFocusOpen] = useState(false)
  const [dossierVisible, setDossierVisible] = useState(false)
  const islandFocusOpenRef = useRef(false)
  const focusStartedRef = useRef(false)
  const focusSequenceRef = useRef(0)
  const savedSceneViewRef = useRef<SceneView | null>(null)
  const dossierPortalTargetRef = useRef<HTMLElement | null>(null)
  const isClosingFocusRef = useRef(false)

  const applySceneView = useCallback((view: SceneView) => {
    setPan(view.pan)
    setZoom(view.zoom)
  }, [])

  const {
    animateToView,
    clearSavedView,
    isAnimating: isCameraAnimating,
  } = useIslandFocusCamera({
    reducedMotion,
    onViewChange: applySceneView,
  })

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const update = () => {
      const rect = element.getBoundingClientRect()
      setSize({
        width: Math.max(320, rect.width),
        height: Math.max(360, rect.height),
      })
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

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

  const zoomAtCenter = useCallback(
    (nextZoom: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      applyZoomAtPoint(
        nextZoom,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      )
    },
    [applyZoomAtPoint],
  )

  const recenter = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    recenter()
  }, [recenter, selectedCoordinationId, viewResetKey])

  useEffect(() => {
    const element = containerRef.current
    if (!element || islandFocusOpen) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = Math.exp(-event.deltaY * 0.0012)
      applyZoomAtPoint(zoomRef.current * factor, event.clientX, event.clientY)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [applyZoomAtPoint, islandFocusOpen])

  const visibleCoordinationIds = useMemo(
    () =>
      coordinatorMode && assignedCoordinationId && !focusedEvent
        ? [assignedCoordinationId]
        : coordinationIds,
    [
      assignedCoordinationId,
      coordinationIds,
      coordinatorMode,
      focusedEvent,
    ],
  )

  const layout = useMemo(
    () =>
      buildStructureLayout(
        visibleCoordinationIds,
        selectedCoordinationId,
        size.width,
        size.height,
      ),
    [selectedCoordinationId, size.height, size.width, visibleCoordinationIds],
  )

  const stageStyle = {
    '--scene-pan-x': `${pan.x}px`,
    '--scene-pan-y': `${pan.y}px`,
    '--scene-zoom': String(zoom),
  } as CSSProperties

  const directionAsset = getCoordinationIslandAsset('coord-general')
  const { center, nodes } = layout
  const visibleNodeCount = selectedCoordinationId
    ? propagation
      ? new Set([
          propagation.originCoordinationId,
          ...propagation.affectedCoordinationIds,
        ]).size
      : 1
    : coordinationIds.length
  const propagationEdges = useMemo(() => {
    if (!propagation || !selectedCoordinationId) return []
    const origin = nodes.find(
      (node) => node.coordinationId === propagation.originCoordinationId,
    )
    if (!origin) return []

    return propagation.edges
      .map((edge) => {
        const target = nodes.find(
          (node) => node.coordinationId === edge.targetCoordinationId,
        )
        if (!target) return null
        const curvature = (edge.order % 2 === 0 ? 1 : -1) *
          (0.12 + (edge.order % 3) * 0.035)
        return {
          ...edge,
          targetCoordinationId: edge.targetCoordinationId as CoordinationId,
          path: buildPropagationEdgePath(origin, target, curvature),
        }
      })
      .filter(Boolean) as Array<{
      id: string
      targetCoordinationId: CoordinationId
      order: number
      path: string
    }>
  }, [nodes, propagation, selectedCoordinationId])

  const predictedEdges = useMemo(() => {
    if (
      !predictionVisible ||
      !propagation ||
      !selectedCoordinationId ||
      predictedCoordinationIds.length === 0
    ) {
      return []
    }

    const origin = nodes.find(
      (node) => node.coordinationId === propagation.originCoordinationId,
    )
    if (!origin) return []

    return predictedCoordinationIds
      .map((targetCoordinationId, order) => {
        const target = nodes.find(
          (node) => node.coordinationId === targetCoordinationId,
        )
        if (!target) return null
        const curvature = (order % 2 === 0 ? -1 : 1) * (0.16 + (order % 3) * 0.04)
        return {
          id: `predicted:${propagation.originCoordinationId}-->${targetCoordinationId}`,
          targetCoordinationId,
          order,
          path: buildPropagationEdgePath(origin, target, curvature),
        }
      })
      .filter(Boolean) as Array<{
      id: string
      targetCoordinationId: CoordinationId
      order: number
      path: string
    }>
  }, [
    nodes,
    predictedCoordinationIds,
    predictionVisible,
    propagation,
    selectedCoordinationId,
  ])

  const getEdgeState = useCallback(
    (edgeId: string, targetCoordinationId: CoordinationId): PropagationEdgeState => {
      if (showAllIlluminated) return 'completed'
      if (activeEdgeId === edgeId) return 'active'
      if (illuminatedCoordinationIds.includes(targetCoordinationId)) {
        return 'completed'
      }
      return 'dormant'
    },
    [activeEdgeId, illuminatedCoordinationIds, showAllIlluminated],
  )

  useEffect(() => {
    islandFocusOpenRef.current = islandFocusOpen
  }, [islandFocusOpen])

  useEffect(() => {
    focusSequenceRef.current += 1
    focusStartedRef.current = false
    savedSceneViewRef.current = null
    dossierPortalTargetRef.current = null
    setFocusIslandId(null)
    setIslandFocusOpen(false)
    setDossierVisible(false)
    clearSavedView()
    onIslandFocusChange?.(false)
  }, [clearSavedView, focusedEvent?.id, onIslandFocusChange])

  useEffect(() => {
    if (
      !islandFocusOpen ||
      !focusIslandId ||
      focusStartedRef.current
    ) {
      return
    }

    const node = nodes.find(
      (candidate) => candidate.coordinationId === focusIslandId,
    )
    if (!node) return

    focusStartedRef.current = true
    const sequence = focusSequenceRef.current
    const currentView = {
      pan: { ...panRef.current },
      zoom: zoomRef.current,
    }
    const workspaceBounds =
      dossierPortalTargetRef.current?.getBoundingClientRect()
    const targetVisualSize = Math.min(
      360,
      Math.max(300, size.height * 0.44),
    )
    const targetZoom = targetVisualSize / Math.max(1, node.size)
    const targetXRatio = workspaceBounds
      ? Math.min(
          0.38,
          Math.max(0.18, (workspaceBounds.width * 0.2) / size.width),
        )
      : 0.2
    const targetView = computeFocusCamera(
      node.x,
      node.y,
      size.width,
      size.height,
      targetZoom,
      targetXRatio,
    )

    void animateToView(
      currentView,
      targetView,
      ISLAND_FOCUS_ANIMATION_MS,
    ).then(() => {
      if (
        sequence === focusSequenceRef.current &&
        islandFocusOpenRef.current
      ) {
        setDossierVisible(true)
      }
    })
  }, [
    focusIslandId,
    animateToView,
    islandFocusOpen,
    nodes,
    size.height,
    size.width,
  ])

  const finishIslandFocusClose = useCallback(async () => {
    if (isClosingFocusRef.current) return
    isClosingFocusRef.current = true
    focusSequenceRef.current += 1

    try {
      const savedView = savedSceneViewRef.current
      if (savedView) {
        await animateToView(
          { pan: { ...panRef.current }, zoom: zoomRef.current },
          savedView,
          ISLAND_RESTORE_ANIMATION_MS,
        )
      }

      setDossierVisible(false)
      setIslandFocusOpen(false)
      setFocusIslandId(null)
      savedSceneViewRef.current = null
      dossierPortalTargetRef.current = null
      focusStartedRef.current = false
      clearSavedView()
      onIslandFocusChange?.(false)
    } finally {
      isClosingFocusRef.current = false
    }
  }, [animateToView, clearSavedView, onIslandFocusChange])

  const closeIslandFocus = useCallback(() => {
    setDossierVisible(false)
  }, [])

  const handleDossierExitComplete = useCallback(() => {
    if (!islandFocusOpenRef.current || isClosingFocusRef.current) return
    void finishIslandFocusClose()
  }, [finishIslandFocusClose])

  const handleSelectIsland = useCallback(
    (coordinationId: CoordinationId) => {
      if (
        !propagation ||
        !focusedEvent ||
        islandFocusOpenRef.current ||
        isClosingFocusRef.current
      ) {
        return
      }

      const node = nodes.find(
        (candidate) => candidate.coordinationId === coordinationId,
      )
      const isRelated =
        coordinationId === propagation.originCoordinationId ||
        propagation.affectedCoordinationIds.includes(coordinationId)
      if (!node || !isRelated) return

      dossierPortalTargetRef.current =
        containerRef.current?.closest<HTMLElement>(
          '.impact-network__workspace',
        ) ?? null
      savedSceneViewRef.current = {
        pan: { ...panRef.current },
        zoom: zoomRef.current,
      }
      focusSequenceRef.current += 1
      focusStartedRef.current = false
      setFocusIslandId(coordinationId)
      setIslandFocusOpen(true)
      onIslandFocusChange?.(true)
    },
    [
      focusedEvent,
      nodes,
      onIslandFocusChange,
      propagation,
    ],
  )

  return (
    <div
      ref={containerRef}
      className={[
        'propagation-scene organizational-scene',
        dragging ? 'propagation-scene--dragging' : '',
        islandFocusOpen ? 'propagation-scene--island-focus' : '',
        dossierVisible ? 'propagation-scene--dossier-visible' : '',
        isCameraAnimating ? 'propagation-scene--camera-animating' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-level={
        focusedEvent
          ? 'situation'
          : selectedCoordinationId
            ? 'coordination'
            : 'institutional'
      }
      data-risk={riskLevel ?? 'moderate'}
      data-focused={Boolean(selectedCoordinationId)}
      data-dossier-active={islandFocusOpen}
      data-role-view={coordinatorMode ? 'coordinator' : 'director'}
      data-reduced-motion={reducedMotion}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || islandFocusOpen) return
        const target = event.target as HTMLElement
        if (
          target.closest(
            '.propagation-island, .coordination-situation-node, button',
          )
        ) {
          return
        }
        event.preventDefault()
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          panX: pan.x,
          panY: pan.y,
        }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        setDragging(true)
        setPan({
          x: drag.panX + event.clientX - drag.startX,
          y: drag.panY + event.clientY - drag.startY,
        })
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
        dragRef.current = null
        setDragging(false)
      }}
      onPointerCancel={() => {
        dragRef.current = null
        setDragging(false)
      }}
    >
      <SceneBackdrop />

      <section className="organizational-scene__guide" aria-live="polite">
        <span>
          {focusedEvent
            ? 'Nivel 03 · Mapa de impacto'
            : selectedCoordinationId
              ? 'Nivel 02 · Mapa de conexiones'
              : 'Nivel 01 · Mapa organizacional'}
        </span>
        <h2>
          {focusedEvent
            ? 'Propagación de la situación'
            : selectedCoordinationId
              ? 'Coordinación focalizada'
              : 'Estructura institucional'}
        </h2>
        <p>
          {focusedEvent
            ? 'Use Volver para regresar a la coordinación sin perder el contexto.'
            : selectedCoordinationId
              ? coordinationSituations.length > 0
                ? 'Pulse una mini isla debajo para abrir la situación, o use el panel derecho.'
                : 'Esta coordinación no tiene situaciones activas. Use Volver a la Dirección.'
              : 'Seleccione una coordinación para avanzar al siguiente nivel del flujo.'}
        </p>
        <div>
          <i aria-hidden="true" />
          {focusedEvent
            ? `${visibleNodeCount} nodos relacionados visibles`
            : selectedCoordinationId
              ? coordinationSituations.length > 0
                ? `${coordinationSituations.length} ${
                    coordinationSituations.length === 1
                      ? 'situación seleccionable'
                      : 'situaciones seleccionables'
                  }`
                : 'coordinación sin situaciones activas'
              : `${visibleNodeCount} coordinaciones sincronizadas`}
        </div>
      </section>

      <div
        className="propagation-scene__zoom-controls"
        aria-label="Controles de zoom del mapa"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="propagation-scene__zoom-btn propagation-scene__zoom-btn--fullscreen"
          aria-label={
            isFullscreen
              ? 'Salir de pantalla completa'
              : 'Ver mapa en pantalla completa'
          }
          onClick={() => {
            const element = containerRef.current
            if (!element) return
            void (document.fullscreenElement
              ? document.exitFullscreen()
              : element.requestFullscreen())
          }}
        >
          <FullscreenIcon />
        </button>
        <button
          type="button"
          className="propagation-scene__zoom-btn"
          aria-label="Alejar mapa"
          disabled={zoom <= MIN_ZOOM + 0.01}
          onClick={() => zoomAtCenter(zoom - ZOOM_STEP)}
        >
          −
        </button>
        <span className="propagation-scene__zoom-level" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="propagation-scene__zoom-btn"
          aria-label="Acercar mapa"
          disabled={zoom >= MAX_ZOOM - 0.01}
          onClick={() => zoomAtCenter(zoom + ZOOM_STEP)}
        >
          +
        </button>
      </div>

      <div
        className="propagation-scene__stage organizational-scene__stage"
        style={stageStyle}
      >
        <svg
          className="organizational-scene__connections propagation-scene__edges"
          data-focused={Boolean(selectedCoordinationId)}
          data-focus-hidden={islandFocusOpen}
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-hidden="true"
        >
          <g className="organizational-scene__structural-network">
            {nodes.map((node, index) => {
              const controlY = (center.y + node.y) / 2
              const path = `M ${center.x} ${center.y} C ${center.x} ${controlY} ${node.x} ${controlY} ${node.x} ${node.y}`
              const pathId = `structure-link-${node.coordinationId}`
              const visual = STRUCTURE_VISUALS[node.coordinationId]
              return (
                <g
                  key={node.coordinationId}
                  data-selected={node.selected}
                  style={
                    {
                      '--island-glow-rgb': visual.rgb,
                    } as CSSProperties
                  }
                >
                  <motion.path
                    className="organizational-scene__connection-glow"
                    animate={{ d: path }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.68,
                      ease: [0.22, 0.61, 0.36, 1],
                    }}
                  />
                  <motion.path
                    className="organizational-scene__connection-rail"
                    animate={{ d: path }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.68,
                      ease: [0.22, 0.61, 0.36, 1],
                    }}
                  />
                  <motion.path
                    id={pathId}
                    className="organizational-scene__connection"
                    animate={{ d: path }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.68,
                      ease: [0.22, 0.61, 0.36, 1],
                    }}
                  />
                  <circle
                    className="organizational-scene__connection-node"
                    cx={node.x}
                    cy={node.y}
                    r="8"
                  />
                  <circle
                    className="organizational-scene__connection-node-core"
                    cx={node.x}
                    cy={node.y}
                    r="2.6"
                  />
                  {!reducedMotion ? (
                    <circle
                      className="organizational-scene__connection-particle"
                      r="2.1"
                    >
                      <animateMotion
                        begin={`${index * 0.18}s`}
                        dur={`${3.2 + (index % 4) * 0.35}s`}
                        repeatCount="indefinite"
                      >
                        <mpath href={`#${pathId}`} />
                      </animateMotion>
                    </circle>
                  ) : null}
                </g>
              )
            })}
          </g>

          <g className="organizational-scene__impact-network">
            {propagationEdges.map((edge) => (
              <PropagationEdge
                key={edge.id}
                id={edge.id}
                path={edge.path}
                state={getEdgeState(edge.id, edge.targetCoordinationId)}
                riskLevel={riskLevel}
                reducedMotion={reducedMotion}
                order={edge.order}
              />
            ))}
            {predictedEdges.map((edge) => (
              <PropagationEdge
                key={edge.id}
                id={edge.id}
                path={edge.path}
                state="predicted"
                riskLevel={riskLevel}
                reducedMotion={reducedMotion}
                order={edge.order}
              />
            ))}
          </g>
        </svg>

        <div
          className="organizational-scene__direction-hub"
          data-context={Boolean(selectedCoordinationId)}
          style={{ left: center.x, top: center.y }}
          aria-label="Dirección de Operaciones"
          aria-hidden={selectedCoordinationId ? true : undefined}
        >
          <span className="organizational-scene__direction-orbit" aria-hidden="true" />
          <span className="organizational-scene__direction-pulse" aria-hidden="true" />
          <span className="organizational-scene__direction-base" aria-hidden="true" />
          <span className="organizational-scene__direction-scan" aria-hidden="true" />
          <img src={directionAsset} alt="" aria-hidden="true" draggable={false} />
          <span className="organizational-scene__direction-label">
            <small>Nodo institucional</small>
            <strong>Dirección de Operaciones</strong>
          </span>
        </div>

        <div className="propagation-scene__islands organizational-scene__islands">
          {nodes.map((node, index) => {
            const visual = STRUCTURE_VISUALS[node.coordinationId]
            const isAssigned =
              !coordinatorMode || node.coordinationId === assignedCoordinationId
            const role = !propagation
              ? 'ambient'
              : node.coordinationId === propagation.originCoordinationId
                ? 'origin'
                : propagation.affectedCoordinationIds.includes(
                      node.coordinationId,
                    )
                  ? 'affected'
                  : predictionVisible &&
                      predictedCoordinationIds.includes(node.coordinationId)
                    ? 'predicted'
                    : 'ambient'
            const impactState =
              role === 'predicted'
                ? 'illuminated'
                : getImpactState(
                    node.coordinationId,
                    propagation,
                    illuminatedCoordinationIds,
                    propagatingCoordinationId,
                    showAllIlluminated,
                  )
            const isDimmed =
              Boolean(selectedCoordinationId) &&
              !node.selected &&
              impactState === 'idle' &&
              role !== 'predicted'
            const isUnrelated =
              Boolean(selectedCoordinationId) &&
              !node.selected &&
              role === 'ambient'
            const isFocusedIsland =
              islandFocusOpen && focusIslandId === node.coordinationId
            const hideDuringDossier =
              islandFocusOpen && !isFocusedIsland
            return (
              <IslandNode
                key={node.coordinationId}
                coordinationId={node.coordinationId}
                role={role}
                riskLevel={riskLevel}
                visualRisk={
                  role === 'ambient'
                    ? 'low'
                    : role === 'predicted'
                      ? 'moderate'
                      : riskLevel
                }
                impactState={impactState}
                selected={isFocusedIsland}
                sceneZoom={zoom}
                disabled={!isAssigned || isUnrelated || islandFocusOpen}
                labelPlacement={node.labelPlacement}
                onSelect={
                  focusedEvent && propagation
                    ? handleSelectIsland
                    : onSelectCoordination
                }
                className={[
                  'organizational-scene__island propagation-scene__island',
                  node.selected ? 'organizational-scene__island--selected' : '',
                  isDimmed ? 'organizational-scene__island--dimmed' : '',
                  isUnrelated
                    ? 'organizational-scene__island--unrelated'
                    : '',
                  hideDuringDossier ? 'propagation-scene__island--hidden' : '',
                  isFocusedIsland
                    ? 'propagation-scene__island--focus-active'
                    : '',
                  !isAssigned ? 'organizational-scene__island--locked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  {
                    left: node.x,
                    top: node.y,
                    width: node.size,
                    height: node.size,
                    zIndex: node.depth,
                    transform: 'translate3d(-50%, -50%, 0)',
                    '--island-order': index,
                    '--island-enter-delay': `${index * 35}ms`,
                    '--island-glow-rgb': visual.rgb,
                    '--island-hue': visual.hue,
                  } as CSSProperties
                }
              />
            )
          })}
        </div>

        {selectedCoordinationId &&
        !focusedEvent &&
        !islandFocusOpen &&
        onSelectSituation &&
        coordinationSituations.length > 0
          ? (() => {
              const selectedNode = nodes.find((node) => node.selected)
              if (!selectedNode) return null
              return (
                <CoordinationSituationNodes
                  incidents={coordinationSituations}
                  origin={{ x: selectedNode.x, y: selectedNode.y }}
                  islandSize={selectedNode.size}
                  stageSize={size}
                  reducedMotion={reducedMotion}
                  onSelectSituation={onSelectSituation}
                />
              )
            })()
          : null}
      </div>

      {propagation && focusedEvent ? (
        <ImpactMapTelemetry
          propagation={propagation}
          event={focusedEvent}
          riskLevel={riskLevel}
          riskScore={focusedEvent.interpretation?.riskScore ?? 0}
          propagationDurationLabel={propagationDurationLabel}
        />
      ) : null}

      {propagation &&
      focusedEvent &&
      focusIslandId &&
      dossierPortalTargetRef.current
        ? createPortal(
            <IslandFocusDossier
              open={dossierVisible}
              coordinationId={focusIslandId}
              propagation={propagation}
              event={focusedEvent}
              reducedMotion={reducedMotion}
              onClose={closeIslandFocus}
              onExitComplete={handleDossierExitComplete}
            />,
            dossierPortalTargetRef.current,
          )
        : null}

      {loading || error ? (
        <div
          className="organizational-scene__status"
          role={error ? 'alert' : 'status'}
        >
          <i aria-hidden="true" />
          {error
            ? `Sincronización suspendida: ${error}`
            : 'Preparando estructura operacional…'}
        </div>
      ) : null}
    </div>
  )
}

export const OrganizationalScene = memo(OrganizationalSceneView)
