import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { OrganizationalScene } from '@/modules/impact-network/components/OrganizationalScene'
import { OperationalContextPanel } from '@/modules/impact-network/components/OperationalContextPanel'
import {
  resolveCoordinationId,
  resolveCoordinationIdOrGeneral,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import {
  IMPACT_NETWORK_MOCK_EVENTS,
  IMPACT_NETWORK_MOCK_FALLBACK_ENABLED,
} from '@/modules/impact-network/data/impact-network-events.mock'
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
import {
  enrichSituationEvent,
  loadImpactNetworkSituations,
  mapSituationToImpactOperationalEvent,
} from '@/modules/impact-network/services/impact-network-situations.service'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { ConnectedSituationDetailModal } from '@/modules/operational-events/components/ConnectedSituationDetailModal'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import type { UpdateSituationStatusInput } from '@/modules/monitoring/utils/situation-lifecycle'
import { MainScreen, NovexFrame, NovexRoom } from '@/modules/room'
import { updateSituationStatus } from '@/modules/services/situationManagementData.service'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { NovexProductHeader } from '@/shared/components/NovexProductHeader'
import { getErrorMessage } from '@/shared/utils/error'
import { isValidUuid } from '@/shared/utils/uuid'
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

function averageActiveRiskScore(
  incidents: readonly { riskScore: number }[],
): number {
  if (incidents.length === 0) return 0
  return Math.round(
    incidents.reduce((total, item) => total + item.riskScore, 0) /
      incidents.length,
  )
}

export function ImpactNetworkExperience() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const reduceMotion = useReducedMotion()
  const immersiveRef = useRef<HTMLDivElement | null>(null)
  const deepLinkAppliedRef = useRef(false)

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
  const [events, setEvents] = useState<readonly OperationalEvent[]>([])
  const [situations, setSituations] = useState<SituationResponse[]>([])
  const [situationsLoading, setSituationsLoading] = useState(true)
  const [lastSynchronizedAt, setLastSynchronizedAt] = useState(
    () => new Date().toISOString(),
  )
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
  const [focusOriginRequestKey, setFocusOriginRequestKey] = useState(0)
  const [replayAvailability, setReplayAvailability] = useState<
    Record<string, boolean>
  >({})
  const [isUpdatingSituation, setIsUpdatingSituation] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [isImmersive, setIsImmersive] = useState(() =>
    Boolean(typeof document !== 'undefined' && document.fullscreenElement),
  )

  const reloadSituations = useCallback(async () => {
    setSituationsLoading(true)
    try {
      const loaded = await loadImpactNetworkSituations()
      setEvents(loaded.events)
      setSituations(loaded.situations)
      setLastSynchronizedAt(loaded.lastSynchronizedAt)
    } catch {
      if (IMPACT_NETWORK_MOCK_FALLBACK_ENABLED) {
        setEvents(IMPACT_NETWORK_MOCK_EVENTS)
        setSituations([])
        setLastSynchronizedAt(new Date().toISOString())
      } else {
        setEvents([])
        setSituations([])
      }
    } finally {
      setSituationsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadNetwork() {
      setTopologyLoading(true)
      setTopologyError(null)
      try {
        const loadedTopology = await impactNetworkDataProvider.loadTopology()
        if (!active) return
        setTopology(loadedTopology)
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
    void reloadSituations()
    return () => {
      active = false
    }
  }, [reloadSituations])

  useEffect(() => {
    if (coordinatorMode) {
      setSelectedCoordinationId(assignedCoordinationId)
    }
  }, [assignedCoordinationId, coordinatorMode])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsImmersive(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  /* La pantalla completa se pide sobre el documento y no sobre el contenedor del
     mapa: los modales y wizards se montan con portales en document.body, que
     quedarían fuera del subárbol renderizado si el elemento fuese el mapa. */
  const toggleImmersive = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    void document.documentElement.requestFullscreen().catch(() => {
      void immersiveRef.current?.requestFullscreen()
    })
  }, [])

  const incidents = useMemo(
    () => selectImpactIncidents(events, DEFAULT_IMPACT_FILTERS, topology),
    [events, topology],
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
    () => events.find((item) => item.id === focusedEventId) ?? null,
    [events, focusedEventId],
  )
  const focusedSituation = useMemo(
    () =>
      focusedEventId
        ? situations.find((item) => item.id === focusedEventId) ?? null
        : null,
    [focusedEventId, situations],
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

  const syncSearchParams = useCallback(
    (coordinationId: CoordinationId | null, situationId: string | null) => {
      const next = new URLSearchParams()
      if (coordinationId) next.set('coordination', coordinationId)
      if (situationId) next.set('situation', situationId)
      setSearchParams(next, { replace: true })
    },
    [setSearchParams],
  )

  const focusIncident = useCallback(
    async (eventId: string) => {
      const incident =
        incidents.find((candidate) => candidate.eventId === eventId) ??
        activeIncidents.find((candidate) => candidate.eventId === eventId)
      const incidentCoordinationId =
        coordinationIdByEvent.get(eventId) ??
        (incident
          ? (selectFocusedPropagation(incident, null, topology)
              ?.originCoordinationId as CoordinationId | undefined)
          : undefined) ??
        resolveCoordinationId(
          events.find((item) => item.id === eventId)?.sourceAreaId,
        ) ??
        undefined
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
      syncSearchParams(incidentCoordinationId, eventId)

      const situation = situations.find((item) => item.id === eventId)
      if (situation) {
        try {
          const enriched = await enrichSituationEvent(situation)
          setEvents((current) =>
            current.map((event) => (event.id === eventId ? enriched : event)),
          )
        } catch {
          // Mantener el evento base si el análisis aún no está disponible.
        }
      }

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
      events,
      incidents,
      reduceMotion,
      resetPropagation,
      situations,
      syncSearchParams,
      topology,
    ],
  )

  useEffect(() => {
    if (deepLinkAppliedRef.current || situationsLoading) return

    const coordinationParam = searchParams.get('coordination')
    const situationParam = searchParams.get('situation')
    const coordinationFromQuery = resolveCoordinationId(coordinationParam)
    const hasSituationEvent =
      Boolean(situationParam) &&
      isValidUuid(situationParam!) &&
      (activeIncidents.some((item) => item.eventId === situationParam) ||
        events.some((item) => item.id === situationParam) ||
        situations.some((item) => item.id === situationParam))

    if (situationParam && isValidUuid(situationParam) && hasSituationEvent) {
      deepLinkAppliedRef.current = true
      void focusIncident(situationParam)
      return
    }

    if (coordinationFromQuery) {
      if (!coordinatorMode || coordinationFromQuery === assignedCoordinationId) {
        setSelectedCoordinationId(coordinationFromQuery)
      }
      deepLinkAppliedRef.current = true
      return
    }

    if (!situationParam) {
      deepLinkAppliedRef.current = true
    }
  }, [
    activeIncidents,
    assignedCoordinationId,
    coordinatorMode,
    events,
    focusIncident,
    searchParams,
    situations,
    situationsLoading,
  ])

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
    setShowAnalysisModal(false)
  }, [resetPropagation])

  const navigateToDirection = useCallback(() => {
    if (coordinatorMode) return
    exitFocusMode()
    setSelectedCoordinationId(null)
    setMapViewResetKey((key) => key + 1)
    syncSearchParams(null, null)
  }, [coordinatorMode, exitFocusMode, syncSearchParams])

  const navigateToCoordination = useCallback(() => {
    exitFocusMode()
    setMapViewResetKey((key) => key + 1)
    syncSearchParams(selectedCoordinationId, null)
  }, [exitFocusMode, selectedCoordinationId, syncSearchParams])

  const openCoordinationFromMap = useCallback(
    (coordinationId: CoordinationId) => {
      if (coordinatorMode && coordinationId !== assignedCoordinationId) {
        return
      }

      exitFocusMode()
      setSelectedCoordinationId(coordinationId)
      syncSearchParams(coordinationId, null)
    },
    [
      assignedCoordinationId,
      coordinatorMode,
      exitFocusMode,
      syncSearchParams,
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

  const handleCreateSituation = useCallback(() => {
    if (!selectedCoordinationId) return
    const returnTo = `/red-impacto?coordination=${encodeURIComponent(selectedCoordinationId)}`
    navigate(
      `/situaciones/nueva?coordination=${encodeURIComponent(selectedCoordinationId)}&returnTo=${encodeURIComponent(returnTo)}`,
    )
  }, [navigate, selectedCoordinationId])

  const handleUpdateSituationStatus = useCallback(
    async (input: UpdateSituationStatusInput) => {
      if (!focusedSituation) return
      setIsUpdatingSituation(true)
      try {
        const updated = await updateSituationStatus(focusedSituation.id, input)
        setSituations((current) =>
          current.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        )
        setEvents((current) =>
          current.map((event) =>
            event.id === updated.id
              ? mapSituationToImpactOperationalEvent(
                  updated,
                  event.interpretation,
                )
              : event,
          ),
        )

        if (updated.status === 'CLOSED') {
          exitFocusMode()
          syncSearchParams(selectedCoordinationId, null)
        }
      } finally {
        setIsUpdatingSituation(false)
      }
    },
    [exitFocusMode, focusedSituation, selectedCoordinationId, syncSearchParams],
  )

  const handleDownloadPdf = useCallback(async () => {
    if (!focusedSituation) return
    setIsExportingPdf(true)
    try {
      const enriched =
        focusedEvent?.interpretation?.executiveReport
          ? focusedEvent
          : await enrichSituationEvent(focusedSituation)
      const { exportSituationReportPdf } = await import(
        '@/modules/operational-events/utils/exportSituationReportPdf'
      )
      await exportSituationReportPdf(enriched)
      setEvents((current) =>
        current.map((event) =>
          event.id === enriched.id ? enriched : event,
        ),
      )
    } catch (error) {
      console.error(getErrorMessage(error))
    } finally {
      setIsExportingPdf(false)
    }
  }, [focusedEvent, focusedSituation])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (document.fullscreenElement) return
      if (islandFocusActive) return
      if (focusedEventId) {
        navigateToCoordination()
        return
      }
      if (selectedCoordinationId && !coordinatorMode) {
        setSelectedCoordinationId(null)
        syncSearchParams(null, null)
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
    syncSearchParams,
  ])

  const loading = topologyLoading || situationsLoading
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
    <NovexRoom
      environment={environment}
      scene="impact"
      immersive={isImmersive}
    >
      <NovexFrame environment={environment}>
        <MainScreen environment={environment}>
          <div
            ref={immersiveRef}
            className={[
              'impact-network-immersive',
              isImmersive ? 'impact-network-immersive--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
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
                        Desde una coordinación puede crear situaciones,
                        actualizar estados y descargar el análisis IA sin salir
                        del mapa.
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
                    islandFocusActive
                      ? 'impact-network__workspace--island-focus'
                      : '',
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
                            (currentFrame?.propagatingCoordinationId as
                              | CoordinationId
                              | null) ?? null
                          }
                          riskLevel={focusedIncident?.riskLevel ?? null}
                          showAllIlluminated={showAllIlluminated}
                          propagationDurationLabel={formatPropagationDuration(
                            replay,
                          )}
                          coordinationSituations={coordinationIncidents}
                          onIslandFocusChange={setIslandFocusActive}
                          onSelectCoordination={openCoordinationFromMap}
                          onSelectSituation={selectSituation}
                          isImmersive={isImmersive}
                          onToggleImmersive={toggleImmersive}
                          focusOriginRequestKey={focusOriginRequestKey}
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
                            disabled={
                              !canSimulate || simulationPhase === 'loading'
                            }
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
                    globalIncidentCount={activeIncidents.length}
                    globalRiskScore={averageActiveRiskScore(activeIncidents)}
                    networkStatus={networkStatus}
                    lastSynchronizedAt={lastSynchronizedAt}
                    focusedEvent={focusedEvent}
                    focusedSituation={focusedSituation}
                    originCoordinationId={
                      (propagation?.originCoordinationId as CoordinationId | null) ??
                      selectedCoordinationId
                    }
                    affectedNames={propagation?.affectedNames ?? []}
                    reducedMotion={Boolean(reduceMotion)}
                    canUpdateSituation={Boolean(user)}
                    isUpdatingSituation={isUpdatingSituation}
                    isExportingPdf={isExportingPdf}
                    onSelectSituation={selectSituation}
                    onCreateSituation={
                      selectedCoordinationId
                        ? handleCreateSituation
                        : undefined
                    }
                    onUpdateSituationStatus={handleUpdateSituationStatus}
                    onOpenAnalysis={() => setShowAnalysisModal(true)}
                    onOpenSituationDetail={() =>
                      setFocusOriginRequestKey((key) => key + 1)
                    }
                    onDownloadPdf={() => {
                      void handleDownloadPdf()
                    }}
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
          </div>

          {showAnalysisModal && focusedEventId && isValidUuid(focusedEventId) ? (
            <ConnectedSituationDetailModal
              situationId={focusedEventId}
              onClose={() => setShowAnalysisModal(false)}
            />
          ) : null}
        </MainScreen>
      </NovexFrame>
    </NovexRoom>
  )
}
