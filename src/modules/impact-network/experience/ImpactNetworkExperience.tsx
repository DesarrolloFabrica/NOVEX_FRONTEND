import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useReducedMotion } from 'motion/react'
import { OrganizationalScene } from '@/modules/impact-network/components/OrganizationalScene'
import { OperationalContextPanel } from '@/modules/impact-network/components/OperationalContextPanel'
import {
  getCoordination,
  resolveCoordinationId,
  resolveCoordinationIdOrGeneral,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import { IMPACT_NETWORK_MOCK_EVENTS } from '@/modules/impact-network/data/impact-network-events.mock'
import {
  OPERATIONAL_COORDINATION_IDS,
  OPERATIONAL_NETWORK_MOCK,
} from '@/modules/impact-network/data/operational-network.mock'
import {
  DEFAULT_IMPACT_FILTERS,
  IMPACT_TOPOLOGY,
  buildStarPropagationFrames,
  deriveNetworkStatus,
  impactNetworkDataProvider,
  selectFocusedPropagation,
  selectImpactIncidents,
  type ImpactPrediction,
  type ImpactTopology,
  type IncidentReplay,
} from '@/modules/impact-network'
import {
  ImpactNetworkToolbar,
  type ImpactNavigationLevel,
} from '@/modules/impact-network/experience/ImpactNetworkToolbar'
import { usePropagationSequence } from '@/modules/impact-network/hooks/usePropagationSequence'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { MainScreen, NovexFrame, NovexRoom } from '@/modules/room'
import { NovexProductHeader } from '@/shared/components/NovexProductHeader'
import '@/styles/impact-network.css'

type ReplayPhase = 'idle' | 'playing' | 'paused' | 'complete'
type SimulationPhase = 'idle' | 'loading' | 'visible'

function formatPropagationDuration(replay: IncidentReplay | null): string {
  if (!replay || replay.steps.length === 0) return '—'
  const lastOffset = Math.max(...replay.steps.map((step) => step.offsetMs))
  const minutes = Math.round(lastOffset / 60_000)
  if (minutes <= 0) return 'Inmediato'
  return `${minutes} min`
}

function uniqueCoordinationIds(
  values: readonly CoordinationId[],
): CoordinationId[] {
  return [...new Set(values)]
}

function resolvePredictedCoordinationIds(
  prediction: ImpactPrediction | null,
  originCoordinationId: CoordinationId | null,
  alreadyAffected: readonly CoordinationId[],
): CoordinationId[] {
  if (!originCoordinationId) return []

  const fromPrediction = uniqueCoordinationIds(
    (prediction?.steps ?? [])
      .map((step) => resolveCoordinationIdOrGeneral(step.areaId))
      .filter(
        (coordinationId) =>
          coordinationId !== originCoordinationId &&
          !alreadyAffected.includes(coordinationId),
      ),
  )

  if (fromPrediction.length > 0) return fromPrediction

  return OPERATIONAL_COORDINATION_IDS.filter(
    (coordinationId) =>
      coordinationId !== originCoordinationId &&
      coordinationId !== 'coord-general' &&
      !alreadyAffected.includes(coordinationId),
  ).slice(0, 2)
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

export function ImpactNetworkExperience() {
  const { user } = useAuth()
  const reduceMotion = useReducedMotion()
  const coordinatorMode = user?.role === 'ejecutor'
  const assignedCoordinationId = useMemo(
    () =>
      resolveCoordinationId(user?.selectedAreaId) ??
      resolveCoordinationId(user?.coordinationId) ??
      'coord-general',
    [user?.coordinationId, user?.selectedAreaId],
  )

  const [topology, setTopology] = useState<ImpactTopology>(IMPACT_TOPOLOGY)
  const [topologyLoading, setTopologyLoading] = useState(true)
  const [topologyError, setTopologyError] = useState<string | null>(null)
  const [, setLastReadAt] = useState<number | null>(null)
  const [selectedCoordinationId, setSelectedCoordinationId] =
    useState<CoordinationId | null>(() =>
      coordinatorMode ? assignedCoordinationId : null,
    )
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)
  const [replay, setReplay] = useState<IncidentReplay | null>(null)
  const [replayPhase, setReplayPhase] = useState<ReplayPhase>('idle')
  const [prediction, setPrediction] = useState<ImpactPrediction | null>(null)
  const [simulationPhase, setSimulationPhase] =
    useState<SimulationPhase>('idle')
  const [mapViewResetKey, setMapViewResetKey] = useState(0)
  const [islandFocusActive, setIslandFocusActive] = useState(false)
  const [replayAvailability, setReplayAvailability] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    let active = true

    async function loadNetwork() {
      setTopologyLoading(true)
      setTopologyError(null)
      try {
        const loadedTopology = await impactNetworkDataProvider.loadTopology()
        if (!active) return
        setTopology(loadedTopology)
        setLastReadAt(Date.now())
      } catch (error) {
        if (!active) return
        setTopologyError(
          error instanceof Error
            ? error.message
            : 'No fue posible preparar la red operacional.',
        )
      } finally {
        if (active) setTopologyLoading(false)
      }
    }

    void loadNetwork()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (coordinatorMode) {
      setSelectedCoordinationId(assignedCoordinationId)
    }
  }, [assignedCoordinationId, coordinatorMode])

  const incidents = useMemo(
    () =>
      selectImpactIncidents(
        IMPACT_NETWORK_MOCK_EVENTS,
        DEFAULT_IMPACT_FILTERS,
        topology,
      ),
    [topology],
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
      IMPACT_NETWORK_MOCK_EVENTS.find(
        (item) => item.id === focusedEventId,
      ) ?? null,
    [focusedEventId],
  )
  const networkStatus = useMemo(
    () => deriveNetworkStatus(activeIncidents),
    [activeIncidents],
  )

  const coordinationIdByEvent = useMemo(() => {
    const result = new Map<string, CoordinationId>()
    for (const incident of activeIncidents) {
      const selected = selectFocusedPropagation(incident, null, topology)
      if (selected) {
        result.set(
          incident.eventId,
          selected.originCoordinationId as CoordinationId,
        )
      }
    }
    return result
  }, [activeIncidents, topology])

  const selectedCoordination = useMemo(
    () =>
      selectedCoordinationId
        ? OPERATIONAL_NETWORK_MOCK.coordinations.find(
            (coordination) => coordination.id === selectedCoordinationId,
          ) ?? null
        : null,
    [selectedCoordinationId],
  )

  const coordinationIncidents = useMemo(
    () =>
      selectedCoordinationId
        ? activeIncidents.filter(
            (incident) =>
              coordinationIdByEvent.get(incident.eventId) ===
              selectedCoordinationId,
          )
        : [],
    [activeIncidents, coordinationIdByEvent, selectedCoordinationId],
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
  } = usePropagationSequence({
    frames: starFrames,
    reducedMotion: Boolean(reduceMotion),
    onComplete: () => setReplayPhase('complete'),
  })

  const focusIncident = useCallback(
    async (eventId: string) => {
      const incident = activeIncidents.find(
        (candidate) => candidate.eventId === eventId,
      )
      const incidentCoordinationId = coordinationIdByEvent.get(eventId)
      if (!incident || !incidentCoordinationId) return
      if (
        coordinatorMode &&
        incidentCoordinationId !== assignedCoordinationId
      ) {
        return
      }

      setSelectedCoordinationId(incidentCoordinationId)
      setFocusedEventId(eventId)
      setIslandFocusActive(false)
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
    },
    [
      activeIncidents,
      assignedCoordinationId,
      coordinationIdByEvent,
      coordinatorMode,
      reduceMotion,
      resetPropagation,
    ],
  )

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
    try {
      const result = await impactNetworkDataProvider.simulateImpact(
        focusedIncident.eventId,
        { horizonMinutes: 30 },
      )
      setPrediction(
        result ?? {
          eventId: focusedIncident.eventId,
          generatedAt: new Date().toISOString(),
          horizonMinutes: 30,
          potentialAreaIds: [],
          steps: [],
        },
      )
      setSimulationPhase('visible')
    } catch {
      setPrediction({
        eventId: focusedIncident.eventId,
        generatedAt: new Date().toISOString(),
        horizonMinutes: 30,
        potentialAreaIds: [],
        steps: [],
      })
      setSimulationPhase('visible')
    }
  }, [focusedIncident, pause, replayPhase, simulationPhase])

  const exitFocusMode = useCallback(() => {
    setIslandFocusActive(false)
    setFocusedEventId(null)
    setReplay(null)
    setReplayPhase('idle')
    resetPropagation()
    setPrediction(null)
    setSimulationPhase('idle')
  }, [resetPropagation])

  const navigateToDirection = useCallback(() => {
    if (coordinatorMode) return
    exitFocusMode()
    setSelectedCoordinationId(null)
    setMapViewResetKey((key) => key + 1)
  }, [coordinatorMode, exitFocusMode])

  const navigateToCoordination = useCallback(() => {
    exitFocusMode()
    setMapViewResetKey((key) => key + 1)
  }, [exitFocusMode])

  const openCoordinationFromMap = useCallback(
    (coordinationId: CoordinationId) => {
      if (coordinatorMode && coordinationId !== assignedCoordinationId) {
        return
      }

      exitFocusMode()
      setSelectedCoordinationId(coordinationId)
    },
    [
      assignedCoordinationId,
      coordinatorMode,
      exitFocusMode,
    ],
  )

  const selectSituation = useCallback(
    (eventId: string) => {
      void focusIncident(eventId)
    },
    [focusIncident],
  )

  const runSimulation = useCallback(() => {
    void handleSimulation()
  }, [handleSimulation])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (islandFocusActive) return
      if (focusedEventId) {
        navigateToCoordination()
        return
      }
      if (selectedCoordinationId && !coordinatorMode) {
        setSelectedCoordinationId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    coordinatorMode,
    focusedEventId,
    islandFocusActive,
    navigateToCoordination,
    selectedCoordinationId,
  ])

  const loading = topologyLoading
  const networkError = topologyError
  const environment = getEnvironment(loading, networkError, networkStatus)
  const canReplay =
    Boolean(focusedIncident) &&
    (replayAvailability[focusedIncident?.eventId ?? ''] ?? replay !== null)
  const canSimulate = Boolean(focusedIncident)

  const predictedCoordinationIds = useMemo(() => {
    if (simulationPhase !== 'visible' || !propagation) return []
    return resolvePredictedCoordinationIds(
      prediction,
      propagation.originCoordinationId as CoordinationId,
      propagation.affectedCoordinationIds as CoordinationId[],
    )
  }, [prediction, propagation, simulationPhase])

  const predictedNames = useMemo(
    () =>
      predictedCoordinationIds.map(
        (coordinationId) => getCoordination(coordinationId).shortName,
      ),
    [predictedCoordinationIds],
  )

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
  const navigationLevel: ImpactNavigationLevel = focusedIncident
    ? 'situation'
    : selectedCoordinationId
      ? 'coordination'
      : 'institutional'
  const visibleIncidentCount =
    navigationLevel === 'institutional'
      ? activeIncidents.length
      : coordinationIncidents.length

  return (
    <NovexRoom environment={environment} scene="impact">
      <NovexFrame environment={environment}>
        <MainScreen environment={environment}>
          <ScreenDeck
            environment={environment}
            className="impact-network-deck"
            header={
              <NovexProductHeader
                title="Red de impacto"
                eyebrow="Inteligencia operacional"
                context="Relaciones e impacto entre coordinaciones"
                middle={
                  <ImpactNetworkToolbar
                    status={networkStatus}
                    loading={loading}
                    error={networkError}
                    navigationLevel={navigationLevel}
                    selectedCoordinationName={
                      selectedCoordination?.shortName ?? null
                    }
                    activeCount={visibleIncidentCount}
                    coordinatorMode={coordinatorMode}
                    onNavigateDirection={navigateToDirection}
                    onNavigateCoordination={navigateToCoordination}
                  />
                }
                helpTitle="Acerca de Red de impacto"
                help={
                  <>
                    <p>
                      Visualice cómo las situaciones operacionales conectan y
                      afectan a las coordinaciones de la Dirección.
                    </p>
                    <p>
                      Seleccione una coordinación o situación para consultar su
                      alcance, propagación y áreas relacionadas.
                    </p>
                  </>
                }
              />
            }
          >
            <section
              className={[
                'impact-network impact-network--propagation impact-network--v2',
                islandFocusActive ? 'impact-network--island-focus' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-network-status={networkStatus}
              data-navigation-level={navigationLevel}
              data-role-view={coordinatorMode ? 'coordinator' : 'director'}
              aria-label="Red de Impacto Operacional"
            >
        <div
          className={[
            'impact-network__workspace',
            islandFocusActive ? 'impact-network__workspace--island-focus' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="impact-network__canvas">
            <div
              className="impact-network__scene-stack"
              data-active-scene={
                focusedIncident ? 'propagation' : 'organization'
              }
            >
              <div
                className="impact-network__scene-layer impact-network__scene-layer--organization impact-network__scene-layer--propagation"
                data-active="true"
              >
                <OrganizationalScene
                  coordinationIds={
                    OPERATIONAL_NETWORK_MOCK.direction.coordinationIds
                  }
                  selectedCoordinationId={selectedCoordinationId}
                  assignedCoordinationId={assignedCoordinationId}
                  coordinatorMode={coordinatorMode}
                  reducedMotion={Boolean(reduceMotion)}
                  loading={loading}
                  error={networkError}
                  viewResetKey={mapViewResetKey}
                  propagation={propagation}
                  focusedEvent={focusedEvent}
                  illuminatedCoordinationIds={
                    illuminatedCoordinationIds as CoordinationId[]
                  }
                  predictedCoordinationIds={predictedCoordinationIds}
                  predictionVisible={simulationPhase === 'visible'}
                  activeEdgeId={currentFrame?.activeEdgeId ?? null}
                  propagatingCoordinationId={
                    (currentFrame?.propagatingCoordinationId as CoordinationId | null) ??
                    null
                  }
                  riskLevel={focusedIncident?.riskLevel ?? null}
                  showAllIlluminated={showAllIlluminated}
                  propagationDurationLabel={formatPropagationDuration(replay)}
                  coordinationSituations={coordinationIncidents}
                  onIslandFocusChange={setIslandFocusActive}
                  onSelectCoordination={openCoordinationFromMap}
                  onSelectSituation={selectSituation}
                />
              </div>
            </div>

            {navigationLevel !== 'institutional' ? (
              <div
                className="impact-map-actions"
                aria-label="Acciones del mapa"
              >
                <button
                  type="button"
                  className="impact-map-actions__back"
                  onClick={
                    navigationLevel === 'situation'
                      ? navigateToCoordination
                      : navigateToDirection
                  }
                >
                  <span aria-hidden="true">←</span>
                  {navigationLevel === 'situation'
                    ? `Volver a ${selectedCoordination?.shortName ?? 'la coordinación'}`
                    : 'Volver a la Dirección'}
                </button>

                {navigationLevel === 'situation' &&
                canReplay &&
                replayPhase !== 'complete' ? (
                  <button
                    type="button"
                    className="impact-map-actions__playback"
                    onClick={handleReplayToggle}
                  >
                    {replayPhase === 'playing'
                      ? 'Pausar animación'
                      : replayPhase === 'paused'
                        ? 'Continuar animación'
                        : 'Reproducir animación'}
                  </button>
                ) : null}

                {navigationLevel === 'situation' ? (
                  <button
                    type="button"
                    className="impact-map-actions__simulation"
                    onClick={runSimulation}
                    disabled={!canSimulate || simulationPhase === 'loading'}
                  >
                    {simulationPhase === 'loading'
                      ? 'Simulando…'
                      : simulationPhase === 'visible'
                        ? 'Ocultar predicción'
                        : 'Simular impacto'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <OperationalContextPanel
            coordination={selectedCoordination}
            coordinationsCount={
              OPERATIONAL_NETWORK_MOCK.direction.coordinationIds.length
            }
            incidents={coordinationIncidents}
            globalIncidentCount={
              OPERATIONAL_NETWORK_MOCK.direction.activeSituationCount
            }
            globalRiskScore={OPERATIONAL_NETWORK_MOCK.direction.globalRiskScore}
            networkStatus={networkStatus}
            lastSynchronizedAt={
              OPERATIONAL_NETWORK_MOCK.direction.lastSynchronizedAt
            }
            focusedEvent={focusedEvent}
            originCoordinationId={
              (propagation?.originCoordinationId as CoordinationId | null) ??
              selectedCoordinationId
            }
            affectedNames={propagation?.affectedNames ?? []}
            predictedNames={predictedNames}
            predictionVisible={simulationPhase === 'visible'}
            propagationDurationLabel={formatPropagationDuration(replay)}
            reducedMotion={Boolean(reduceMotion)}
            onSelectSituation={selectSituation}
          />

          <p className="impact-network__sr-status" aria-live="polite">
            {focusedIncident
              ? `${focusedIncident.title}. Propagación focalizada desde ${propagation?.originName ?? 'origen por confirmar'}.`
              : selectedCoordination
                ? `${selectedCoordination.name}. ${coordinationIncidents.length} situaciones activas.`
                : `${OPERATIONAL_NETWORK_MOCK.direction.coordinationIds.length} coordinaciones activas.`}
          </p>
        </div>
            </section>
          </ScreenDeck>
        </MainScreen>
      </NovexFrame>
    </NovexRoom>
  )
}
