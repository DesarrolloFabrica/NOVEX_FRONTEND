import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { OrganizationalScene } from '@/modules/impact-network/components/OrganizationalScene'
import { OperationalContextPanel } from '@/modules/impact-network/components/OperationalContextPanel'
import {
  resolveCoordinationId,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import {
  DEFAULT_IMPACT_FILTERS,
  buildStarPropagationFrames,
  impactNetworkDataProvider,
  selectFocusedPropagation,
  selectImpactIncidents,
  type ImpactNetworkStatus,
  type ImpactPrediction,
  type ImpactTopology,
  type IncidentReplay,
} from '@/modules/impact-network'
import {
  ImpactNetworkToolbar,
  type ImpactNavigationLevel,
} from '@/modules/impact-network/experience/ImpactNetworkToolbar'
import { usePropagationSequence } from '@/modules/impact-network/hooks/usePropagationSequence'
import { loadImpactNetworkBootstrap } from '@/modules/impact-network/services/impact-network-bootstrap.service'
import {
  enrichSituationEvent,
  loadImpactNetworkSituations,
  mapSituationToImpactOperationalEvent,
} from '@/modules/impact-network/services/impact-network-situations.service'
import type { CoordinationNetworkStatusResponse } from '@/modules/api/coordinations.api'
import { fetchSituationAffectedCoordinations, fetchSituationImpactContext } from '@/modules/api/impact.api'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import {
  canCreateCoordinationSituations,
  canUpdateSituationStatus,
} from '@/modules/auth/utils/permissions'
import { ConnectedSituationDetailModal } from '@/modules/operational-events/components/ConnectedSituationDetailModal'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import type { UpdateSituationStatusInput } from '@/modules/monitoring/utils/situation-lifecycle'
import { MainScreen, NovexFrame, NovexRoom } from '@/modules/room'
import { updateSituationStatus } from '@/modules/services/situationManagementData.service'
import type { Coordination } from '@/modules/impact-network/types/operational-network.types'
import type {
  SituationImpactContextResponse,
  SituationResponse,
} from '@/modules/situations/types/situation.types'
import { NovexProductHeader } from '@/shared/components/NovexProductHeader'
import { ApiError } from '@/shared/api/http'
import { getErrorMessage } from '@/shared/utils/error'
import { isValidUuid } from '@/shared/utils/uuid'
import '@/styles/impact-network.css'

type ReplayPhase = 'idle' | 'playing' | 'paused' | 'complete'
type SimulationPhase = 'idle' | 'loading' | 'visible' | 'empty' | 'error'

const EMPTY_TOPOLOGY: ImpactTopology = {
  canvas: { width: 1440, height: 900, incidentCenter: { x: 720, y: 450 } },
  areas: [],
  dependencies: [],
  bindings: [],
}

function getCoordinatorInitialSelection(
  roleCode: string | undefined,
  selectedAreaId: string | undefined,
  coordinationId: string | undefined,
): CoordinationId | null {
  if (roleCode !== 'COORDINADOR') return null

  const candidate = selectedAreaId?.trim() || coordinationId?.trim()
  return candidate ? (candidate as CoordinationId) : null
}

function extractLegacyRelatedCodes(description: string): string[] {
  const perceptionMatch =
    description.match(
      /Coordinaciones relacionadas \(percepción inicial\): (.+)/i,
    ) ??
    description.match(/Áreas relacionadas \(percepción inicial\): (.+)/i)
  if (!perceptionMatch?.[1]) return []

  return [
    ...new Set(
      perceptionMatch[1]
        .split(',')
        .map((label) => label.trim().split('·')[0]?.trim())
        .filter((code): code is string => Boolean(code)),
    ),
  ]
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
  status: ImpactNetworkStatus,
) {
  if (loading || error) return 'pending' as const
  if (status === 'stable') return 'healthy' as const
  return status
}

export function ImpactNetworkExperience() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const reduceMotion = useReducedMotion()
  const immersiveRef = useRef<HTMLDivElement | null>(null)
  const deepLinkAppliedRef = useRef(false)
  const initialCoordinatorSelection = getCoordinatorInitialSelection(
    user?.roleCode,
    user?.selectedAreaId,
    user?.coordinationId,
  )
  const coordinatorInitialFocusRef = useRef(false)

  const [topology, setTopology] = useState<ImpactTopology>(EMPTY_TOPOLOGY)
  const [coordinationIds, setCoordinationIds] = useState<
    readonly CoordinationId[]
  >([])
  const [coordinations, setCoordinations] = useState<readonly Coordination[]>(
    [],
  )
  const [networkSnapshot, setNetworkSnapshot] =
    useState<CoordinationNetworkStatusResponse | null>(null)
  const [topologyLoading, setTopologyLoading] = useState(true)
  const [topologyError, setTopologyError] = useState<string | null>(null)
  const [events, setEvents] = useState<readonly OperationalEvent[]>([])
  const [situations, setSituations] = useState<SituationResponse[]>([])
  const [situationsLoading, setSituationsLoading] = useState(true)
  const [situationsError, setSituationsError] = useState<string | null>(null)
  const [selectedCoordinationId, setSelectedCoordinationId] =
    useState<CoordinationId | null>(() => initialCoordinatorSelection)
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)
  const [affectedCoordinationIds, setAffectedCoordinationIds] = useState<
    readonly CoordinationId[]
  >([])
  const [impactContext, setImpactContext] =
    useState<SituationImpactContextResponse | null>(null)
  const [simulationMessage, setSimulationMessage] = useState<string | null>(
    null,
  )
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

  const coordinatorMode = user?.roleCode === 'COORDINADOR'
  const assignedCoordinationId = useMemo(() => {
    const selectedAreaId = user?.selectedAreaId?.trim() as
      CoordinationId | undefined
    if (selectedAreaId && coordinationIds.includes(selectedAreaId)) {
      return selectedAreaId
    }

    return (
      resolveCoordinationId(user?.selectedAreaId) ??
      resolveCoordinationId(user?.coordinationId)
    )
  }, [user?.coordinationId, user?.selectedAreaId, coordinationIds])
  const canCreateInSelectedCoordination =
    canCreateCoordinationSituations(user) &&
    selectedCoordinationId !== null &&
    selectedCoordinationId === assignedCoordinationId

  const reloadSituations = useCallback(async () => {
    setSituationsLoading(true)
    setSituationsError(null)
    try {
      const loaded = await loadImpactNetworkSituations()
      setEvents(loaded.events)
      setSituations(loaded.situations)
    } catch (error) {
      setEvents([])
      setSituations([])
      setSituationsError(getErrorMessage(error))
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
        const bootstrap = await loadImpactNetworkBootstrap()
        if (!active) return
        setTopology(bootstrap.graph.topology)
        setCoordinationIds(bootstrap.graph.coordinationIds)
        setCoordinations(bootstrap.graph.coordinations)
        setNetworkSnapshot(bootstrap.networkStatus)
      } catch (error) {
        if (!active) return
        setTopology(EMPTY_TOPOLOGY)
        setCoordinationIds([])
        setCoordinations([])
        setNetworkSnapshot(null)
        setTopologyError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar la red operacional desde el backend.',
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
    if (
      coordinatorMode &&
      assignedCoordinationId &&
      !coordinatorInitialFocusRef.current
    ) {
      coordinatorInitialFocusRef.current = true
      const coordinationParam = searchParams.get('coordination')
      if (!coordinationParam) {
        setSelectedCoordinationId(assignedCoordinationId)
      }
    }
  }, [assignedCoordinationId, coordinatorMode, searchParams])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsImmersive(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

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
        ? (incidents.find((incident) => incident.eventId === focusedEventId) ??
          null)
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
        ? (situations.find((item) => item.id === focusedEventId) ?? null)
        : null,
    [focusedEventId, situations],
  )

  const networkStatus: ImpactNetworkStatus =
    networkSnapshot?.networkStatus ?? 'stable'

  const coordinationIdByEvent = useMemo(() => {
    const result = new Map<string, CoordinationId>()
    for (const situation of situations) {
      const code =
        resolveCoordinationId(situation.coordinationCode) ??
        resolveCoordinationId(situation.coordinationId)
      if (code) result.set(situation.id, code)
    }
    for (const incident of activeIncidents) {
      if (result.has(incident.eventId)) continue
      const code = resolveCoordinationId(incident.sourceAreaId)
      if (code) result.set(incident.eventId, code)
    }
    return result
  }, [activeIncidents, situations])

  const selectedCoordination = useMemo(
    () =>
      selectedCoordinationId
        ? (coordinations.find(
            (coordination) => coordination.id === selectedCoordinationId,
          ) ?? null)
        : null,
    [coordinations, selectedCoordinationId],
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
    () =>
      selectFocusedPropagation(
        focusedIncident,
        replay,
        topology,
        affectedCoordinationIds,
      ),
    [affectedCoordinationIds, focusedIncident, replay, topology],
  )

  const starFrames = useMemo(() => {
    if (!replay || !propagation) return []
    return buildStarPropagationFrames(
      replay,
      propagation.originCoordinationId,
      propagation.affectedCoordinationIds,
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
      const situation = situations.find((item) => item.id === eventId)
      const incidentCoordinationId =
        coordinationIdByEvent.get(eventId) ??
        resolveCoordinationId(situation?.coordinationCode) ??
        resolveCoordinationId(situation?.coordinationId) ??
        resolveCoordinationId(
          events.find((item) => item.id === eventId)?.sourceAreaId,
        )

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
      setSimulationMessage(null)
      setImpactContext(null)
      setAffectedCoordinationIds([])
      syncSearchParams(incidentCoordinationId, eventId)

      if (situation) {
        try {
          const enriched = await enrichSituationEvent(situation)
          setEvents((current) =>
            current.map((event) => (event.id === eventId ? enriched : event)),
          )
        } catch {
          // Mantener el evento base si el análisis aún no está disponible.
        }

        let context: SituationImpactContextResponse | null = null
        try {
          context = await fetchSituationImpactContext(eventId)
          setImpactContext(context)
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            const legacyCodes = extractLegacyRelatedCodes(
              situation.description,
            ).filter((code) => code !== situation.coordinationCode)
            const hasDeclaredRelated = legacyCodes.length > 0
            context = {
              situationId: eventId,
              originCoordinationId: situation.coordinationId ?? '',
              originCoordinationCode: situation.coordinationCode ?? '',
              hasDeclaredRelated,
              canSimulate: !hasDeclaredRelated,
              simulationAvailable: !hasDeclaredRelated,
              declaredRelated: legacyCodes.map((code) => ({
                coordinationId: code,
                coordinationCode: code,
                coordinationName: code,
                coordinationShortName: code,
                impactLevel: null,
                description: null,
                source: 'declared' as const,
              })),
              message: hasDeclaredRelated
                ? 'Se muestran las coordinaciones declaradas por el usuario.'
                : 'Puede simular el impacto potencial con base en el análisis IA.',
            }
            setImpactContext(context)
          } else {
            setImpactContext(null)
          }
        }

        if (context?.hasDeclaredRelated) {
          const declaredCodes = context.declaredRelated
            .map(
              (item) =>
                resolveCoordinationId(item.coordinationCode) ??
                resolveCoordinationId(item.coordinationId),
            )
            .filter((id): id is CoordinationId => Boolean(id))
          setAffectedCoordinationIds(declaredCodes)
          setSimulationMessage(context.message)
        } else {
          // Sin declaración manual: el origen se ve por la situación enfocada;
          // las islas potenciales se revelan solo con «Simular impacto».
          setAffectedCoordinationIds([])
          setSimulationMessage(context?.message ?? null)

          // Fallback si el endpoint nuevo aún no está desplegado: conservar
          // el comportamiento previo con affected-coordinations.
          if (!context) {
            try {
              const affected =
                await fetchSituationAffectedCoordinations(eventId)
              const codes = affected.items
                .map(
                  (item) =>
                    resolveCoordinationId(item.coordinationCode) ??
                    resolveCoordinationId(item.coordinationId),
                )
                .filter((id): id is CoordinationId => Boolean(id))
              setAffectedCoordinationIds(codes)
            } catch {
              setAffectedCoordinationIds([])
            }
          }
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
      } else if (!loadedReplay) {
        setReplayPhase('complete')
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
    ],
  )

  useEffect(() => {
    if (
      deepLinkAppliedRef.current ||
      situationsLoading ||
      topologyLoading ||
      coordinationIds.length === 0
    ) {
      return
    }

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

    if (
      coordinationFromQuery &&
      coordinationIds.includes(coordinationFromQuery)
    ) {
      if (
        !coordinatorMode ||
        coordinationFromQuery === assignedCoordinationId
      ) {
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
    coordinationIds,
    coordinatorMode,
    events,
    focusIncident,
    searchParams,
    situations,
    situationsLoading,
    topologyLoading,
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
    if (impactContext?.hasDeclaredRelated) return
    if (simulationPhase === 'visible' || simulationPhase === 'empty') {
      setPrediction(null)
      setSimulationPhase('idle')
      setSimulationMessage(impactContext?.message ?? null)
      return
    }

    if (replayPhase === 'playing') {
      pause()
      setReplayPhase('paused')
    }

    setSimulationPhase('loading')
    setSimulationMessage('Calculando impacto potencial…')
    try {
      const result = await impactNetworkDataProvider.simulateImpact(
        focusedIncident.eventId,
        { horizonMinutes: 30 },
      )
      if (result && result.potentialAreaIds.length > 0) {
        setPrediction(result)
        setSimulationPhase('visible')
        setSimulationMessage(
          `Simulación: ${result.potentialAreaIds.length} isla${
            result.potentialAreaIds.length === 1 ? '' : 's'
          } con posible impacto.`,
        )
        return
      }

      setPrediction(null)
      setSimulationPhase('empty')
      setSimulationMessage(
        'No hay una predicción válida para esta situación. Ejecute o revise el análisis IA.',
      )
    } catch {
      setPrediction(null)
      setSimulationPhase('error')
      setSimulationMessage(
        'No fue posible simular el impacto. Intente de nuevo en unos momentos.',
      )
    }
  }, [
    focusedIncident,
    impactContext?.hasDeclaredRelated,
    impactContext?.message,
    pause,
    replayPhase,
    simulationPhase,
  ])

  const exitFocusMode = useCallback(() => {
    setIslandFocusActive(false)
    setFocusedEventId(null)
    setAffectedCoordinationIds([])
    setImpactContext(null)
    setReplay(null)
    setReplayPhase('idle')
    resetPropagation()
    setPrediction(null)
    setSimulationPhase('idle')
    setSimulationMessage(null)
    setShowAnalysisModal(false)
  }, [resetPropagation])

  const navigateToDirection = useCallback(() => {
    exitFocusMode()
    setSelectedCoordinationId(null)
    setMapViewResetKey((key) => key + 1)
    syncSearchParams(null, null)
  }, [exitFocusMode, syncSearchParams])

  const navigateToCoordination = useCallback(() => {
    exitFocusMode()
    setMapViewResetKey((key) => key + 1)
    syncSearchParams(selectedCoordinationId, null)
  }, [exitFocusMode, selectedCoordinationId, syncSearchParams])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        showAnalysisModal
      ) {
        return
      }

      if (islandFocusActive) {
        setIslandFocusActive(false)
        return
      }

      if (focusedIncident) {
        navigateToCoordination()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [
    focusedIncident,
    islandFocusActive,
    navigateToCoordination,
    showAnalysisModal,
  ])

  const openCoordinationFromMap = useCallback(
    (coordinationId: CoordinationId) => {
      if (coordinatorMode && coordinationId !== assignedCoordinationId) {
        return
      }

      exitFocusMode()
      setSelectedCoordinationId(coordinationId)
      syncSearchParams(coordinationId, null)
    },
    [assignedCoordinationId, coordinatorMode, exitFocusMode, syncSearchParams],
  )

  const selectSituation = useCallback(
    (eventId: string) => {
      void focusIncident(eventId)
    },
    [focusIncident],
  )

  const handleCreateSituation = useCallback(() => {
    if (!selectedCoordinationId || !canCreateInSelectedCoordination) return
    const returnTo = `/red-impacto?coordination=${encodeURIComponent(selectedCoordinationId)}`
    navigate(
      `/situaciones/nueva?coordination=${encodeURIComponent(selectedCoordinationId)}&returnTo=${encodeURIComponent(returnTo)}`,
    )
  }, [canCreateInSelectedCoordination, navigate, selectedCoordinationId])

  const handleUpdateSituationStatus = useCallback(
    async (input: UpdateSituationStatusInput) => {
      if (!focusedSituation) return
      setIsUpdatingSituation(true)
      try {
        const updated = await updateSituationStatus(focusedSituation.id, input)
        setSituations((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
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
        const bootstrap = await loadImpactNetworkBootstrap()
        setNetworkSnapshot(bootstrap.networkStatus)
      } finally {
        setIsUpdatingSituation(false)
      }
    },
    [focusedSituation],
  )

  const loading = topologyLoading || situationsLoading
  const networkError = topologyError ?? situationsError
  const environment = getEnvironment(loading, networkError, networkStatus)
  const canReplay = Boolean(
    focusedIncident && replayAvailability[focusedIncident.eventId],
  )
  const canSimulate = Boolean(
    focusedIncident &&
      impactContext &&
      !impactContext.hasDeclaredRelated &&
      impactContext.canSimulate,
  )
  const predictedCoordinationIds = useMemo(
    () =>
      (prediction?.potentialAreaIds ?? []).filter((id): id is CoordinationId =>
        Boolean(resolveCoordinationId(id)),
      ),
    [prediction?.potentialAreaIds],
  )

  // El grafo llega recortado al alcance del actor. Al enfocar una situación el
  // mapa debe poder dibujar las islas impactadas aunque queden fuera de él.
  const sceneCoordinationIds = useMemo(() => {
    if (!propagation) return coordinationIds

    return [
      ...new Set([
        ...coordinationIds,
        propagation.originCoordinationId,
        ...propagation.affectedCoordinationIds,
        ...predictedCoordinationIds,
      ]),
    ]
  }, [coordinationIds, predictedCoordinationIds, propagation])

  const illuminatedCoordinationIds =
    currentFrame?.illuminatedCoordinationIds ??
    (propagation
      ? [
          propagation.originCoordinationId,
          ...propagation.affectedCoordinationIds,
        ]
      : [])

  const showAllIlluminated =
    Boolean(propagation) &&
    (replayPhase === 'complete' || playbackState === 'complete' || !replay)

  const navigationLevel: ImpactNavigationLevel = focusedIncident
    ? 'situation'
    : selectedCoordinationId
      ? 'coordination'
      : 'institutional'

  const visibleIncidentCount =
    navigationLevel === 'institutional'
      ? (networkSnapshot?.activeIncidentsCount ?? activeIncidents.length)
      : coordinationIncidents.length

  const visibleSynchronizedCoordinations = networkSnapshot
    ? Math.min(
        coordinationIds.length,
        networkSnapshot.synchronizedCoordinationsCount,
      )
    : undefined
  const synchronizedLabel =
    visibleSynchronizedCoordinations == null
      ? undefined
      : `${visibleSynchronizedCoordinations} coordinaciones sincronizadas`

  return (
    <NovexRoom environment={environment} scene="impact" immersive={isImmersive}>
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
                data-tour="impact-network"
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
                          coordinationIds={sceneCoordinationIds}
                          graphDependencies={topology.dependencies}
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
                            illuminatedCoordinationIds
                          }
                          predictedCoordinationIds={predictedCoordinationIds}
                          predictionVisible={simulationPhase === 'visible'}
                          activeEdgeId={currentFrame?.activeEdgeId ?? null}
                          propagatingCoordinationId={
                            currentFrame?.propagatingCoordinationId ?? null
                          }
                          riskLevel={focusedIncident?.riskLevel ?? null}
                          showAllIlluminated={showAllIlluminated}
                          propagationDurationLabel={formatPropagationDuration(
                            replay,
                          )}
                          coordinationSituations={coordinationIncidents}
                          synchronizedLabel={synchronizedLabel}
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

                        {navigationLevel === 'situation' && canSimulate ? (
                          <button
                            type="button"
                            className="impact-map-actions__simulate"
                            onClick={() => void handleSimulation()}
                            disabled={simulationPhase === 'loading'}
                            aria-pressed={
                              simulationPhase === 'visible' ||
                              simulationPhase === 'empty'
                            }
                          >
                            {simulationPhase === 'loading'
                              ? 'Simulando…'
                              : simulationPhase === 'visible' ||
                                  simulationPhase === 'empty'
                                ? 'Ocultar simulación'
                                : 'Simular impacto'}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="impact-network__panel-layer">
                    <OperationalContextPanel
                      coordination={selectedCoordination}
                      coordinationsCount={coordinationIds.length}
                      synchronizedCoordinationsCount={
                        visibleSynchronizedCoordinations
                      }
                      incidents={
                        navigationLevel === 'institutional'
                          ? activeIncidents
                          : coordinationIncidents
                      }
                      globalIncidentCount={
                        networkSnapshot?.activeIncidentsCount ??
                        activeIncidents.length
                      }
                      globalRiskScore={networkSnapshot?.globalRiskScore ?? 0}
                      networkStatus={networkStatus}
                      lastSynchronizedAt={
                        networkSnapshot?.lastSynchronizedAt ??
                        new Date(0).toISOString()
                      }
                      focusedEvent={focusedEvent}
                      focusedSituation={focusedSituation}
                      originCoordinationId={
                        propagation?.originCoordinationId ?? null
                      }
                      affectedNames={propagation?.affectedNames ?? []}
                      reducedMotion={Boolean(reduceMotion)}
                      canUpdateSituation={canUpdateSituationStatus(
                        user,
                        focusedSituation,
                      )}
                      isUpdatingSituation={isUpdatingSituation}
                      isExportingPdf={isExportingPdf}
                      onSelectSituation={selectSituation}
                      onCreateSituation={
                        canCreateInSelectedCoordination
                          ? handleCreateSituation
                          : undefined
                      }
                      onUpdateSituationStatus={handleUpdateSituationStatus}
                      onOpenAnalysis={() => setShowAnalysisModal(true)}
                      onDownloadPdf={() => {
                        setIsExportingPdf(true)
                        window.setTimeout(() => setIsExportingPdf(false), 400)
                      }}
                      onOpenSituationDetail={() => {
                        setFocusOriginRequestKey((key) => key + 1)
                      }}
                    />
                  </div>
                </div>
              </section>
            </ScreenDeck>
          </div>
        </MainScreen>
      </NovexFrame>

      {showAnalysisModal && focusedSituation ? (
        <ConnectedSituationDetailModal
          situationId={focusedSituation.id}
          title={focusedSituation.title}
          onClose={() => setShowAnalysisModal(false)}
        />
      ) : null}

      {simulationMessage ? (
        <span className="sr-only" aria-live="polite">
          {simulationMessage}
        </span>
      ) : null}

      {prediction && simulationPhase === 'visible' ? (
        <span className="sr-only" aria-live="polite">
          Simulación disponible: {prediction.potentialAreaIds.length} áreas
          potenciales.
        </span>
      ) : null}
    </NovexRoom>
  )
}
