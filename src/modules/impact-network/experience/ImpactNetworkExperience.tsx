import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { OrganizationalScene } from '@/modules/impact-network/components/OrganizationalScene'
import { OperationalContextPanel } from '@/modules/impact-network/components/OperationalContextPanel'
import {
  ExecutiveOperationalHeader,
  ExecutiveOperationalOverview,
  type OperationalStatusFilter,
} from '@/modules/impact-network/components/executive'
import { buildExecutiveOverviewModel } from '@/modules/impact-network/data/executive-operational-overview.model'
import { extractLegacyRelatedCodes } from '@/modules/impact-network/data/legacy-related-coordinations'
import {
  getCoordination,
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
import { hydrateVisibleCoordinationsFromCatalog } from '@/modules/impact-network/services/impact-network-graph.mapper'
import {
  enrichSituationEvent,
  loadImpactNetworkSituations,
  mapSituationToImpactOperationalEvent,
} from '@/modules/impact-network/services/impact-network-situations.service'
import type { CoordinationNetworkStatusResponse } from '@/modules/api/coordinations.api'
import { fetchCoordinations } from '@/modules/api/coordinations.api'
import { fetchSituationAffectedCoordinations, fetchSituationImpactContext } from '@/modules/api/impact.api'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useOnboarding } from '@/modules/onboarding/OnboardingContext'
import {
  canCreateCoordinationSituations,
  canUpdateSituationStatus,
} from '@/modules/auth/utils/permissions'
import {
  normalizeRoleCode,
  seesInstitutionalSituationRegistry,
} from '@/modules/auth/utils/roleExperience'
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
import { NovexIcon } from '@/shared/components/NovexIcon'
import { ImpactNetworkTour } from '@/modules/impact-network/tutorial/ImpactNetworkTour'
import { isImpactNetworkTourRole } from '@/modules/impact-network/tutorial/impactNetworkTourStorage'
import '@/styles/impact-network.css'
import '@/styles/impact-network-executive.css'
import '@/styles/impact-network-command-map.css'
import '@/styles/impact-network-status-board.css'
import '@/styles/impact-network-status-effects.css'

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

/**
 * Resuelve la coordinación del coordinador sin esperar el bootstrap del grafo.
 * El código de sesión (`selectedAreaId`) ya es el id canónico; el catálogo solo
 * afina UUID → code cuando ya está cargado.
 */
function resolveAssignedCoordinationId(
  selectedAreaId: string | undefined,
  coordinationId: string | undefined,
  coordinationIds: readonly CoordinationId[],
): CoordinationId | null {
  const code = selectedAreaId?.trim()
  if (code) {
    const resolved = resolveCoordinationId(code)
    if (resolved) return resolved
    if (coordinationIds.length === 0 || coordinationIds.includes(code)) {
      return code as CoordinationId
    }
  }

  const fromUuid = resolveCoordinationId(coordinationId)
  if (fromUuid) return fromUuid

  // Antes del catálogo: conservar el UUID de sesión como id provisional.
  const uuid = coordinationId?.trim()
  if (uuid && coordinationIds.length === 0) {
    return uuid as CoordinationId
  }

  return null
}

function buildProvisionalCoordination(
  coordinationId: CoordinationId,
): Coordination {
  const definition = getCoordination(coordinationId)
  return {
    id: definition.id,
    name: definition.name,
    shortName: definition.shortName,
    islandAsset: definition.islandAsset,
    operationalStatus: 'stable',
    responsiblePeople: [],
    situationIds: [],
    lastActivityAt: null,
  }
}

/** Relacionadas ya conocidas en el listado, para pintar islas sin esperar APIs. */
function resolveRelatedIdsFromSituation(
  situation: SituationResponse,
): CoordinationId[] {
  const originId =
    resolveCoordinationId(situation.coordinationCode) ??
    resolveCoordinationId(situation.coordinationId)

  const fromRelated = (situation.relatedCoordinations ?? [])
    .map(
      (item) =>
        resolveCoordinationId(item.coordinationCode) ??
        resolveCoordinationId(item.coordinationId),
    )
    .filter((id): id is CoordinationId => Boolean(id))

  const fromLegacy = extractLegacyRelatedCodes(situation.description)
    .map((code) => resolveCoordinationId(code))
    .filter((id): id is CoordinationId => Boolean(id))

  return [...new Set([...fromRelated, ...fromLegacy])].filter(
    (id) => id !== originId,
  )
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
  const { user, bootSplashActive } = useAuth()
  const { active: onboardingActive } = useOnboarding()
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
  const [executiveStatusFilter, setExecutiveStatusFilter] =
    useState<OperationalStatusFilter>('all')
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
  const [exportPdfError, setExportPdfError] = useState<string | null>(null)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [guidedCoordinationId, setGuidedCoordinationId] =
    useState<CoordinationId | null>(null)
  const [impactTourStartKey, setImpactTourStartKey] = useState(0)
  const [isImmersive, setIsImmersive] = useState(() =>
    Boolean(typeof document !== 'undefined' && document.fullscreenElement),
  )

  const normalizedRole = normalizeRoleCode(user?.roleCode)
  const coordinatorMode = normalizedRole === 'COORDINADOR'
  /** Vista general operacional exclusiva de DIRECTOR / ADMIN / ANALISTA. */
  const executiveOperationalView = seesInstitutionalSituationRegistry(normalizedRole)
  const assignedCoordinationId = useMemo(
    () =>
      resolveAssignedCoordinationId(
        user?.selectedAreaId,
        user?.coordinationId,
        coordinationIds,
      ),
    [coordinationIds, user?.coordinationId, user?.selectedAreaId],
  )
  const canCreateInSelectedCoordination =
    canCreateCoordinationSituations(user) &&
    selectedCoordinationId !== null &&
    assignedCoordinationId !== null &&
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
    const catalogPromise = fetchCoordinations(false, { catalog: true }).catch(
      () => [],
    )

    void catalogPromise.then((catalog) => {
      if (!active || catalog.length === 0) return
      const primed = hydrateVisibleCoordinationsFromCatalog(catalog)
      setCoordinationIds((current) =>
        current.length > 0 ? current : primed.coordinationIds,
      )
      setCoordinations((current) =>
        current.length > 0 ? current : primed.coordinations,
      )
    })

    async function loadNetwork() {
      setTopologyLoading(true)
      setTopologyError(null)
      try {
        const bootstrap = await loadImpactNetworkBootstrap(catalogPromise)
        if (!active) return
        setTopology(bootstrap.graph.topology)
        setCoordinationIds(bootstrap.graph.coordinationIds)
        setCoordinations(bootstrap.graph.coordinations)
        setNetworkSnapshot(bootstrap.networkStatus)
      } catch (error) {
        if (!active) return
        setTopology(EMPTY_TOPOLOGY)
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
    if (!coordinatorMode || !assignedCoordinationId) return

    if (!coordinatorInitialFocusRef.current) {
      coordinatorInitialFocusRef.current = true
      const coordinationParam = searchParams.get('coordination')
      if (!coordinationParam) {
        setSelectedCoordinationId(assignedCoordinationId)
        return
      }
    }

    // Cuando el catálogo resuelve UUID → code, alinear la selección provisional.
    setSelectedCoordinationId((current) => {
      if (!current) return assignedCoordinationId
      if (current === assignedCoordinationId) return current
      const resolvedCurrent = resolveCoordinationId(current)
      if (resolvedCurrent === assignedCoordinationId) {
        return assignedCoordinationId
      }
      return current
    })
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

    const target = immersiveRef.current ?? document.documentElement
    void target.requestFullscreen().catch(() => {
      if (target !== document.documentElement) {
        void document.documentElement.requestFullscreen()
      }
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

  const selectedCoordination = useMemo(() => {
    if (!selectedCoordinationId) return null
    return (
      coordinations.find(
        (coordination) => coordination.id === selectedCoordinationId,
      ) ?? buildProvisionalCoordination(selectedCoordinationId)
    )
  }, [coordinations, selectedCoordinationId])

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

      const optimisticRelated = situation
        ? resolveRelatedIdsFromSituation(situation)
        : []

      setSelectedCoordinationId(incidentCoordinationId)
      setFocusedEventId(eventId)
      setIslandFocusActive(false)
      setReplayPhase('idle')
      resetPropagation()
      setPrediction(null)
      setSimulationPhase('idle')
      setSimulationMessage(
        optimisticRelated.length > 0
          ? 'Se muestran las coordinaciones declaradas mientras se confirma el contexto.'
          : null,
      )
      setImpactContext(null)
      // Pintar relacionadas conocidas de inmediato; no esperar análisis ni contexto.
      setAffectedCoordinationIds(optimisticRelated)
      setExportPdfError(null)
      syncSearchParams(incidentCoordinationId, eventId)

      if (!situation) {
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
        return
      }

      const enrichPromise = enrichSituationEvent(situation)
        .then((enriched) => {
          setEvents((current) =>
            current.map((event) => (event.id === eventId ? enriched : event)),
          )
        })
        .catch(() => {
          // Mantener el evento base si el análisis aún no está disponible.
        })

      const contextPromise = fetchSituationImpactContext(eventId)
        .then((context) => context)
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 404) {
            const legacyCodes = extractLegacyRelatedCodes(
              situation.description,
            ).filter((code) => code !== situation.coordinationCode)
            const hasDeclaredRelated = legacyCodes.length > 0
            return {
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
            } satisfies SituationImpactContextResponse
          }
          return null
        })

      const [, context, loadedReplay] = await Promise.all([
        enrichPromise,
        contextPromise,
        impactNetworkDataProvider.loadReplay(eventId),
      ])

      setImpactContext(context)

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
      } else if (context) {
        // Sin declaración: no inventar islas; el usuario usa «Simular impacto».
        if (optimisticRelated.length === 0) {
          setAffectedCoordinationIds([])
        }
        setSimulationMessage(context.message)
      } else {
        try {
          const affected = await fetchSituationAffectedCoordinations(eventId)
          const codes = affected.items
            .map(
              (item) =>
                resolveCoordinationId(item.coordinationCode) ??
                resolveCoordinationId(item.coordinationId),
            )
            .filter((id): id is CoordinationId => Boolean(id))
          setAffectedCoordinationIds(
            codes.length > 0 ? codes : optimisticRelated,
          )
        } catch {
          setAffectedCoordinationIds(optimisticRelated)
        }
      }

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

  const handleDownloadPdf = useCallback(async () => {
    if (isExportingPdf) return
    setIsExportingPdf(true)
    setExportPdfError(null)
    try {
      const { downloadSituationReportPdf } = await import(
        '@/modules/impact-network/utils/downloadSituationReportPdf'
      )
      await downloadSituationReportPdf(focusedEvent)
    } catch (error) {
      setExportPdfError(getErrorMessage(error))
    } finally {
      setIsExportingPdf(false)
    }
  }, [focusedEvent, isExportingPdf])

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

  const restartImpactNetworkTutorial = useCallback(() => {
    setGuidedCoordinationId(null)
    navigateToDirection()
    setImpactTourStartKey((current) => current + 1)
  }, [navigateToDirection])

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
        if (executiveOperationalView) {
          navigateToCoordination()
          return
        }
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
    executiveOperationalView,
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

    if (executiveOperationalView) {
      return [
        propagation.originCoordinationId,
        ...propagation.affectedCoordinationIds.slice(0, 5),
      ]
    }

    return [
      ...new Set([
        ...coordinationIds,
        propagation.originCoordinationId,
        ...propagation.affectedCoordinationIds,
        ...predictedCoordinationIds,
      ]),
    ]
  }, [
    coordinationIds,
    executiveOperationalView,
    predictedCoordinationIds,
    propagation,
  ])

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

  const showMapBackAction =
    !executiveOperationalView || navigationLevel !== 'situation'
  const showMapReplayAction =
    navigationLevel === 'situation' && canReplay && replayPhase !== 'complete'
  const showMapSimulationAction =
    navigationLevel === 'situation' &&
    canSimulate &&
    !executiveOperationalView
  const showMapActions =
    navigationLevel !== 'institutional' &&
    (showMapBackAction || showMapReplayAction || showMapSimulationAction)

  const useExecutiveOverview =
    executiveOperationalView && navigationLevel === 'institutional'
  const executiveLoading = topologyLoading || situationsLoading

  const executiveOverviewModel = useMemo(
    () =>
      buildExecutiveOverviewModel(sceneCoordinationIds, situations, {
        operationalRisk: networkSnapshot?.globalRiskScore,
        updatedAt: networkSnapshot?.lastSynchronizedAt,
      }),
    [networkSnapshot, sceneCoordinationIds, situations],
  )

  const tutorialCoordination = useMemo(
    () =>
      executiveOverviewModel.coordinations.find(
        (coordination) => coordination.situations.length > 0,
      ) ??
      executiveOverviewModel.coordinations[0] ??
      null,
    [executiveOverviewModel.coordinations],
  )
  const tutorialSituation = tutorialCoordination?.situations[0] ?? null
  const impactTourEligible = isImpactNetworkTourRole(normalizedRole)
  const impactTourReady = Boolean(
    executiveOperationalView &&
      tutorialCoordination &&
      !loading &&
      !networkError,
  )

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
    <NovexRoom
      environment={environment}
      scene="impact"
      immersive={isImmersive}
      rootRef={immersiveRef}
    >
      <NovexFrame environment={environment}>
        <MainScreen environment={environment}>
          <div
            className={[
              'impact-network-immersive',
              isImmersive ? 'impact-network-immersive--active' : '',
              useExecutiveOverview ? 'impact-network-immersive--executive' : '',
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
                  onRestartImpactNetworkTutorial={
                    impactTourEligible
                      ? restartImpactNetworkTutorial
                      : undefined
                  }
                  context={
                    useExecutiveOverview
                      ? 'Estado actual de la operación'
                      : 'Relaciones e impacto entre coordinaciones'
                  }
                  middle={
                    useExecutiveOverview ? (
                      <ExecutiveOperationalHeader
                        model={executiveOverviewModel}
                        statusFilter={executiveStatusFilter}
                        loading={executiveLoading}
                        onStatusFilterChange={setExecutiveStatusFilter}
                      />
                    ) : (
                      <ImpactNetworkToolbar
                        status={networkStatus}
                        loading={loading}
                        error={networkError}
                        navigationLevel={navigationLevel}
                        selectedCoordinationName={
                          selectedCoordination?.shortName ?? null
                        }
                        focusedSituationLabel={
                          focusedEvent
                            ? `Situación #${focusedEvent.id.slice(-4).toUpperCase()}`
                            : null
                        }
                        executiveMode={executiveOperationalView}
                        activeCount={visibleIncidentCount}
                        onNavigateDirection={navigateToDirection}
                        onNavigateCoordination={navigateToCoordination}
                      />
                    )
                  }
                  helpTitle="Acerca de Red de impacto"
                  help={
                    useExecutiveOverview ? (
                      <>
                        <p>
                          Vista general del estado operacional: dónde hay
                          problemas, qué requiere atención y el panorama de las
                          coordinaciones.
                        </p>
                        <p>
                          Seleccione una coordinación afectada para abrir el
                          panel contextual sin salir del mapa.
                        </p>
                        {impactTourEligible ? (
                          <button
                            type="button"
                            className="impact-network__help-tour"
                            onClick={() =>
                              setImpactTourStartKey((current) => current + 1)
                            }
                          >
                            <NovexIcon name="sparkles" size={14} />
                            Ver tutorial guiado
                          </button>
                        ) : null}
                      </>
                    ) : (
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
                        {impactTourEligible ? (
                          <button
                            type="button"
                            className="impact-network__help-tour"
                            onClick={() =>
                              setImpactTourStartKey((current) => current + 1)
                            }
                          >
                            <NovexIcon name="sparkles" size={14} />
                            Ver tutorial guiado
                          </button>
                        ) : null}
                      </>
                    )
                  }
                />
              }
            >
              <section
                data-tour="impact-network"
                className={[
                  'impact-network impact-network--propagation impact-network--v2',
                  islandFocusActive ? 'impact-network--island-focus' : '',
                  useExecutiveOverview ? 'impact-network--executive' : '',
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
                    useExecutiveOverview
                      ? 'impact-network__workspace--executive'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {useExecutiveOverview ? (
                    <ExecutiveOperationalOverview
                      model={executiveOverviewModel}
                      statusFilter={executiveStatusFilter}
                      fullscreenTargetRef={immersiveRef}
                      guidedCoordinationId={guidedCoordinationId}
                      reducedMotion={Boolean(reduceMotion)}
                      loading={executiveLoading}
                      error={networkError}
                      onOpenCoordination={openCoordinationFromMap}
                      onOpenSituation={(situationId) => {
                        void focusIncident(situationId)
                      }}
                      onStatusFilterChange={setExecutiveStatusFilter}
                    />
                  ) : (
                    <>
                  <div
                    className="impact-network__canvas"
                    data-impact-tour="impact-map"
                  >
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
                          executiveMode={executiveOperationalView}
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
                          activeIncidents={activeIncidents}
                          synchronizedLabel={synchronizedLabel}
                          onIslandFocusChange={setIslandFocusActive}
                          onSelectCoordination={openCoordinationFromMap}
                          onSelectSituation={selectSituation}
                          onExitToCoordination={
                            executiveOperationalView
                              ? navigateToCoordination
                              : undefined
                          }
                          isImmersive={isImmersive}
                          onToggleImmersive={toggleImmersive}
                          focusOriginRequestKey={focusOriginRequestKey}
                        />
                      </div>
                    </div>

                    {showMapActions ? (
                      <div
                        className="impact-map-actions"
                        aria-label="Acciones del mapa"
                      >
                        {showMapBackAction ? (
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
                        ) : null}

                        {showMapReplayAction ? (
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

                        {showMapSimulationAction ? (
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
                      incidentsLoading={
                        navigationLevel !== 'institutional' && situationsLoading
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
                      executiveMode={executiveOperationalView}
                      canUpdateSituation={canUpdateSituationStatus(
                        user,
                        focusedSituation,
                      )}
                      isUpdatingSituation={isUpdatingSituation}
                      isExportingPdf={isExportingPdf}
                      exportPdfError={exportPdfError}
                      onSelectSituation={selectSituation}
                      onCreateSituation={
                        canCreateInSelectedCoordination
                          ? handleCreateSituation
                          : undefined
                      }
                      onUpdateSituationStatus={handleUpdateSituationStatus}
                      onOpenAnalysis={() => setShowAnalysisModal(true)}
                      onDownloadPdf={() => {
                        void handleDownloadPdf()
                      }}
                      onOpenSituationDetail={() => {
                        setFocusOriginRequestKey((key) => key + 1)
                      }}
                    />
                  </div>
                    </>
                  )}
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
          executiveSummary={executiveOperationalView}
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

      <ImpactNetworkTour
        userId={user?.id}
        role={normalizedRole}
        ready={impactTourReady}
        autoStartAllowed={Boolean(
          user?.onboardingCompleted && !onboardingActive && !bootSplashActive,
        )}
        forceStartKey={impactTourStartKey}
        coordination={tutorialCoordination}
        situation={tutorialSituation}
        onShowInstitutional={navigateToDirection}
        onPreviewCoordination={setGuidedCoordinationId}
        onOpenCoordination={openCoordinationFromMap}
        onOpenSituation={selectSituation}
      />
    </NovexRoom>
  )
}
