import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useReducedMotion } from 'motion/react'
import { PropagationScene } from '@/modules/impact-network/components/PropagationScene'
import { SituationCommandPanel } from '@/modules/impact-network/components/SituationCommandPanel'
import type { LiveTimelineStep } from '@/modules/impact-network/components/LiveTimelineOverlay'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import {
  DEFAULT_IMPACT_FILTERS,
  IMPACT_TOPOLOGY,
  buildStarPropagationFrames,
  deriveNetworkStatus,
  impactNetworkDataProvider,
  selectFocusedPropagation,
  selectImpactIncidents,
  type ImpactNetworkFilters,
  type ImpactPrediction,
  type ImpactTopology,
  type IncidentReplay,
} from '@/modules/impact-network'
import {
  IMPACT_NETWORK_MOCK_EVENTS,
  IMPACT_NETWORK_MOCK_FALLBACK_ENABLED,
} from '@/modules/impact-network/data/impact-network-events.mock'
import { ImpactNetworkToolbar } from '@/modules/impact-network/experience/ImpactNetworkToolbar'
import { usePropagationSequence } from '@/modules/impact-network/hooks/usePropagationSequence'
import { useOperationalEvents } from '@/modules/operational-events'
import { CunmarkRoom } from '@/modules/room'
import '@/styles/impact-network.css'

type ReplayPhase = 'idle' | 'playing' | 'paused' | 'complete'
type SimulationPhase = 'idle' | 'loading' | 'visible'

const STEP_DETAIL = {
  detected: 'Señal inicial confirmada',
  area_impacted: 'Impacto operacional confirmado',
  communication: 'Comunicación institucional',
  mitigation: 'Acción de contención',
  recovery: 'Recuperación operacional',
} as const

const clockFormatter = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
})

function formatClock(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : clockFormatter.format(parsed)
}

function toTimelineSteps(
  replay: IncidentReplay | null,
  propagation: ReturnType<typeof selectFocusedPropagation>,
): LiveTimelineStep[] {
  if (!replay) return []
  return replay.steps.map((step) => ({
    id: step.id,
    type: step.type,
    time: formatClock(step.at),
    label: step.label,
    detail: STEP_DETAIL[step.type],
    areaName: step.areaId
      ? propagation?.affectedNames[
          propagation.affectedCoordinationIds.findIndex(
            (id) => id === step.areaId,
          )
        ]
      : undefined,
  }))
}

function formatPropagationDuration(replay: IncidentReplay | null): string {
  if (!replay || replay.steps.length === 0) return '—'
  const lastOffset = Math.max(...replay.steps.map((step) => step.offsetMs))
  const minutes = Math.round(lastOffset / 60_000)
  if (minutes <= 0) return 'Inmediato'
  return `${minutes} min`
}

function getEnvironment(
  loading: boolean,
  error: string | null,
  status: ReturnType<typeof deriveNetworkStatus>,
) {
  if (loading || error) return 'pending' as const
  if (status === 'stable') return 'healthy' as const
  return status
}

function cloneDefaultFilters(): ImpactNetworkFilters {
  return {
    ...DEFAULT_IMPACT_FILTERS,
    statuses: [],
    sourceAreaIds: [],
    riskLevels: [],
  }
}

export function ImpactNetworkExperience() {
  const {
    items,
    loading: eventsLoading,
    error: eventsError,
    loadOperationalEvents,
  } = useOperationalEvents()
  const reduceMotion = useReducedMotion()
  const [topology, setTopology] = useState<ImpactTopology>(IMPACT_TOPOLOGY)
  const [topologyLoading, setTopologyLoading] = useState(true)
  const [topologyError, setTopologyError] = useState<string | null>(null)
  const [lastReadAt, setLastReadAt] = useState<number | null>(null)
  const [filters, setFilters] = useState<ImpactNetworkFilters>(
    cloneDefaultFilters,
  )
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)
  const [replay, setReplay] = useState<IncidentReplay | null>(null)
  const [replayPhase, setReplayPhase] = useState<ReplayPhase>('idle')
  const [, setPrediction] = useState<ImpactPrediction | null>(null)
  const [simulationPhase, setSimulationPhase] =
    useState<SimulationPhase>('idle')
  const [mapViewResetKey, setMapViewResetKey] = useState(0)
  const [islandFocusActive, setIslandFocusActive] = useState(false)
  const [replayAvailability, setReplayAvailability] = useState<
    Record<string, boolean>
  >({})
  const [predictionAvailability, setPredictionAvailability] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    let active = true

    async function loadNetwork() {
      setTopologyLoading(true)
      setTopologyError(null)
      try {
        const [, loadedTopology] = await Promise.all([
          loadOperationalEvents(),
          impactNetworkDataProvider.loadTopology(),
        ])
        if (!active) return
        setTopology(loadedTopology)
        setLastReadAt(Date.now())
      } catch (error) {
        if (!active) return
        setTopologyError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar la red operacional.',
        )
      } finally {
        if (active) setTopologyLoading(false)
      }
    }

    void loadNetwork()
    return () => {
      active = false
    }
  }, [loadOperationalEvents])

  const usingMockEvents =
    IMPACT_NETWORK_MOCK_FALLBACK_ENABLED && !eventsLoading && items.length === 0

  const operationalEventItems = useMemo(
    () => (usingMockEvents ? IMPACT_NETWORK_MOCK_EVENTS : items),
    [items, usingMockEvents],
  )

  const incidents = useMemo(
    () => selectImpactIncidents(operationalEventItems, filters, topology),
    [filters, operationalEventItems, topology],
  )
  const activeIncidents = useMemo(
    () => incidents.filter((incident) => incident.active),
    [incidents],
  )
  const focusedIncident = useMemo(
    () =>
      focusedEventId
        ? incidents.find((incident) => incident.eventId === focusedEventId) ??
          null
        : null,
    [focusedEventId, incidents],
  )
  const focusedEvent = useMemo(
    () =>
      operationalEventItems.find((item) => item.id === focusedEventId) ?? null,
    [focusedEventId, operationalEventItems],
  )
  const networkStatus = useMemo(
    () => deriveNetworkStatus(incidents),
    [incidents],
  )

  const propagation = useMemo(
    () => selectFocusedPropagation(focusedIncident, replay, topology),
    [focusedIncident, replay, topology],
  )

  const starFrames = useMemo(() => {
    if (!replay || !propagation) return []
    return buildStarPropagationFrames(
      replay,
      propagation.originCoordinationId as CoordinationId,
      propagation.affectedCoordinationIds as CoordinationId[],
    )
  }, [propagation, replay])

  const {
    playbackState,
    currentFrame,
    play,
    pause,
    reset: resetPropagation,
    skipToEnd,
  } = usePropagationSequence({
    frames: starFrames,
    reducedMotion: Boolean(reduceMotion),
    onComplete: () => setReplayPhase('complete'),
  })

  const timelineSteps = useMemo(
    () => toTimelineSteps(replay, propagation),
    [propagation, replay],
  )

  const focusIncident = useCallback(async (eventId: string) => {
    setFocusedEventId(eventId)
    setReplayPhase('idle')
    resetPropagation()
    setPrediction(null)
    setSimulationPhase('idle')

    const loadedReplay = await impactNetworkDataProvider.loadReplay(eventId)
    setReplay(loadedReplay)
    setReplayAvailability((current) => ({
      ...current,
      [eventId]: loadedReplay !== null,
    }))

    if (loadedReplay && !reduceMotion) {
      setReplayPhase('playing')
    }
  }, [reduceMotion, resetPropagation])

  useEffect(() => {
    if (replayPhase === 'playing' && starFrames.length > 0) {
      play()
    }
  }, [play, replayPhase, starFrames.length])

  useEffect(() => {
    if (playbackState === 'complete') {
      setReplayPhase('complete')
    }
  }, [playbackState])

  const handleReplayToggle = useCallback(() => {
    if (!focusedIncident) return
    if (replayPhase === 'playing') {
      pause()
      setReplayPhase('paused')
      return
    }
    if (replayPhase === 'paused') {
      setReplayPhase('playing')
      play()
      return
    }
    if (replay) {
      resetPropagation()
      setReplayPhase('playing')
      return
    }
    void focusIncident(focusedIncident.eventId)
  }, [
    focusIncident,
    focusedIncident,
    pause,
    play,
    replay,
    replayPhase,
    resetPropagation,
  ])

  const handleSimulation = useCallback(async () => {
    if (!focusedIncident) return
    if (simulationPhase === 'visible') {
      setPrediction(null)
      setSimulationPhase('idle')
      return
    }

    if (replayPhase === 'playing') {
      pause()
      setReplayPhase('paused')
    }

    setSimulationPhase('loading')
    const result = await impactNetworkDataProvider.simulateImpact(
      focusedIncident.eventId,
      { horizonMinutes: 30 },
    )
    setPrediction(result)
    setPredictionAvailability((current) => ({
      ...current,
      [focusedIncident.eventId]: result !== null,
    }))
    setSimulationPhase(result ? 'visible' : 'idle')
  }, [focusedIncident, pause, replayPhase, simulationPhase])

  const exitFocusMode = useCallback(() => {
    setFocusedEventId(null)
    setReplay(null)
    setReplayPhase('idle')
    resetPropagation()
    setPrediction(null)
    setSimulationPhase('idle')
  }, [resetPropagation])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || islandFocusActive) return
      exitFocusMode()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [exitFocusMode, islandFocusActive])

  const loading = eventsLoading || topologyLoading
  const networkError = topologyError ?? eventsError
  const environment = getEnvironment(loading, networkError, networkStatus)
  const canReplay =
    Boolean(focusedIncident) &&
    (replayAvailability[focusedIncident?.eventId ?? ''] ?? replay !== null)
  const canSimulate =
    Boolean(focusedIncident) &&
    predictionAvailability[focusedIncident?.eventId ?? ''] !== false

  const illuminatedCoordinationIds =
    currentFrame?.illuminatedCoordinationIds ??
    (replayPhase === 'complete' && propagation
      ? [
          propagation.originCoordinationId,
          ...propagation.affectedCoordinationIds,
        ]
      : focusedIncident
        ? [propagation?.originCoordinationId].filter(Boolean)
        : [])

  const showAllIlluminated =
    replayPhase === 'complete' || playbackState === 'complete'

  return (
    <CunmarkRoom environment={environment} scene="impact">
      <section
        className={[
          'impact-network impact-network--propagation',
          islandFocusActive ? 'impact-network--island-focus' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-network-status={networkStatus}
        aria-label="Red de Impacto Operacional"
      >
        <ImpactNetworkToolbar
          areas={topology.areas}
          status={networkStatus}
          loading={loading}
          error={networkError}
          lastReadAt={lastReadAt}
          filters={filters}
          focusedIncident={focusedIncident}
          activeCount={activeIncidents.length}
          areaCount={propagation?.affectedCoordinationIds.length ?? 0}
          replayState={replayPhase}
          simulationState={simulationPhase}
          canReplay={canReplay}
          canSimulate={canSimulate}
          onFiltersChange={setFilters}
          onReplay={handleReplayToggle}
          onSimulate={() => void handleSimulation()}
          onResetView={() => setMapViewResetKey((key) => key + 1)}
        />

        <div
          className={[
            'impact-network__workspace',
            islandFocusActive ? 'impact-network__workspace--island-focus' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="impact-network__canvas">
            <PropagationScene
              propagation={propagation}
              viewResetKey={mapViewResetKey}
              focusedEvent={focusedEvent}
              onIslandFocusChange={setIslandFocusActive}
              illuminatedCoordinationIds={
                illuminatedCoordinationIds as CoordinationId[]
              }
              activeEdgeId={currentFrame?.activeEdgeId ?? null}
              propagatingCoordinationId={
                (currentFrame?.propagatingCoordinationId as CoordinationId | null) ??
                null
              }
              riskLevel={focusedIncident?.riskLevel ?? null}
              reducedMotion={Boolean(reduceMotion)}
              showAllIlluminated={showAllIlluminated}
              propagationDurationLabel={formatPropagationDuration(replay)}
              loading={loading}
              error={networkError}
            />
          </div>

          <SituationCommandPanel
            incidents={activeIncidents}
            mockDataActive={usingMockEvents}
            selectedEventId={focusedEventId}
            originCoordinationId={
              propagation?.originCoordinationId as CoordinationId | null
            }
            originName={propagation?.originName ?? null}
            affectedNames={propagation?.affectedNames ?? []}
            riskLevel={focusedIncident?.riskLevel ?? null}
            riskScore={focusedIncident?.riskScore ?? 0}
            propagationDurationLabel={formatPropagationDuration(replay)}
            executiveSummary={
              focusedEvent?.interpretation?.executiveSummary ?? null
            }
            propagationSteps={timelineSteps}
            replayAvailable={
              focusedEventId
                ? (replayAvailability[focusedEventId] ?? replay !== null)
                : false
            }
            predictionAvailable={
              focusedEventId
                ? predictionAvailability[focusedEventId] !== false
                : true
            }
            replayState={replayPhase}
            simulationState={simulationPhase}
            replayUnavailableReason="Esta situación no dispone de replay enriquecido."
            simulationUnavailableReason="Esta situación no dispone de predicción."
            onSelectIncident={(eventId) => void focusIncident(eventId)}
            onReplay={handleReplayToggle}
            onSimulate={() => void handleSimulation()}
            onClearSelection={exitFocusMode}
          />

          {(replayPhase === 'playing' || replayPhase === 'paused') && replay ? (
            <button
              type="button"
              className="impact-network__skip"
              onClick={() => {
                skipToEnd()
                setReplayPhase('complete')
              }}
            >
              Omitir animación
            </button>
          ) : null}

          <p className="impact-network__sr-status" aria-live="polite">
            {focusedIncident
              ? `${focusedIncident.title}. Propagación focalizada desde ${propagation?.originName ?? 'origen por confirmar'}.`
              : `${activeIncidents.length} situaciones activas.`}
          </p>
        </div>
      </section>
    </CunmarkRoom>
  )
}
