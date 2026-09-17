import { useCallback, useEffect, useReducer, useRef } from 'react'
import { getErrorMessage } from '@/shared/utils/error'
import { ApiError } from '@/shared/api/http'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalCardsState } from '@/modules/operational-cards/types/operational-cards.state'
import { fetchOperationalOverview } from '@/modules/operational-cards/services/operational-overview.service'
import { fetchCoordinationProblems } from '@/modules/operational-cards/services/coordination-problems.service'
import {
  fetchProblemDetail,
  fetchProblemEvidences,
  fetchProblemRecommendations,
  fetchProblemTimeline,
} from '@/modules/operational-cards/services/problem-detail.service'
import {
  isLazySection,
  type LazyProblemSectionId,
  type ProblemSectionId,
} from '@/modules/operational-cards/types/problem-detail.types'
import {
  initialOperationalCardsState,
  operationalCardsReducer,
} from '@/modules/operational-cards/state/operationalCards.reducer'
import { fetchMyReports } from '@/modules/operational-cards/services/my-reports.service'
import { submitProblemReport } from '@/modules/operational-cards/services/report-submission.service'
import { submitProblemResolution } from '@/modules/operational-cards/services/problem-resolution.service'
import type { ReportDraft } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Estado de la experiencia y sus acciones.
 *
 * LEVEL 0: exactamente una petición por montaje. La app corre en StrictMode,
 * que en desarrollo ejecuta el efecto dos veces sobre la misma instancia; en
 * lugar de saltarse la segunda —lo que dejaría el estado colgado en
 * «loading»— se guarda la promesa en curso y cada ejecución se suscribe.
 *
 * LEVEL 1: dos peticiones en paralelo (OPEN + IN_PROGRESS) la primera vez que
 * se selecciona una coordinación, y cero al volver a una ya cargada. Una
 * respuesta que llega tarde tras cambiar de carta la descarta el reducer.
 *
 * Sin polling, sin refetch on focus y sin refresco manual.
 */

export interface OperationalCardsController extends OperationalCardsState {
  selectCoordination: (code: CoordinationId) => void
  clearCoordination: () => void
  hoverCoordination: (code: CoordinationId | null) => void
  selectProblem: (problemId: string) => void
  closeProblem: () => void
  toggleSection: (section: ProblemSectionId) => void
  /** Reintenta la lista de la coordinación observada tras un fallo. */
  retryCoordinationProblems: () => void
  /** Abre un problema desde «Mis reportes», sincronizando la carta. */
  openMyReport: (problemId: string, coordinationCode: CoordinationId | null) => void
  /** Siguiente página de «Mis reportes». Carga incremental, no recarga. */
  loadMoreMyReports: () => void
  /** Pasa el panel derecho al formulario de reporte. */
  openReportForm: () => void
  setReportDraft: (key: string, draft: Partial<ReportDraft>) => void
  setLearningDraft: (problemId: string, learning: string) => void
  /** Envía el reporte. Devuelve true si el servidor lo confirmó. */
  submitReport: (input: {
    draftKey: string
    coordinationCode: CoordinationId | null
    coordinationId: string | null
    draft: ReportDraft
  }) => Promise<boolean>
  /** Envía la resolución con su aprendizaje. */
  submitResolution: (problemId: string, learning: string) => Promise<boolean>
  /** El personaje avisa de que ya representó la reacción. */
  consumeCharacterReaction: (id: number) => void
}

/** Cargador por sección perezosa. Impacto e IA no están: salen del análisis. */
const SECTION_LOADERS: Record<
  LazyProblemSectionId,
  (problemId: string) => Promise<readonly unknown[]>
> = {
  recommendations: fetchProblemRecommendations,
  evidences: fetchProblemEvidences,
  timeline: fetchProblemTimeline,
}

export function useOperationalOverview(): OperationalCardsController {
  const [state, dispatch] = useReducer(
    operationalCardsReducer,
    initialOperationalCardsState,
  )
  const overviewRequestRef = useRef<Promise<OperationalOverview> | null>(null)

  /**
   * Espejo de `state.dataGeneration`. Las peticiones en vuelo capturan este ref
   * al despachar su resultado, de modo que el reducer pueda descartar lo que se
   * pidió antes de una escritura confirmada. Un valor capturado en la clausura
   * no serviría: describiría la generación del momento del efecto.
   */
  const generationRef = useRef(0)
  generationRef.current = state.dataGeneration

  useEffect(() => {
    let active = true

    if (!overviewRequestRef.current) {
      dispatch({ type: 'LOAD_OVERVIEW' })
      overviewRequestRef.current = fetchOperationalOverview()
    }

    void overviewRequestRef.current
      .then((overview) => {
        if (!active) return
        dispatch({ type: 'LOAD_OVERVIEW_SUCCESS', overview })
      })
      .catch((error: unknown) => {
        if (!active) return
        dispatch({
          type: 'LOAD_OVERVIEW_ERROR',
          message: getErrorMessage(error),
        })
      })

    return () => {
      active = false
    }
  }, [])

  const selectedCode = state.selectedCoordinationCode
  const level1Status = state.level1.status

  // Carga LEVEL 1 solo cuando hace falta: `idle` con selección significa que
  // no había caché para esa coordinación.
  useEffect(() => {
    if (!selectedCode || level1Status !== 'idle') return

    const row = state.overview?.coordinations.find(
      (coordination) => coordination.code === selectedCode,
    )
    if (!row) return

    dispatch({ type: 'LOAD_PROBLEMS', code: selectedCode })

    // El UUID sale de la fila de LEVEL 0 que ya tenemos: nada de resolverlo
    // con otra petición.
    void fetchCoordinationProblems(row.id)
      .then(({ problems, scope }) => {
        dispatch({
          type: 'LOAD_PROBLEMS_SUCCESS',
          code: selectedCode,
          problems,
          scope,
          // Generación con la que se PIDIÓ, leída del ref para no volver a
          // disparar el efecto en cada escritura.
          generation: generationRef.current,
        })
      })
      .catch((error: unknown) => {
        dispatch({
          type: 'LOAD_PROBLEMS_ERROR',
          code: selectedCode,
          message: getErrorMessage(error),
        })
      })
  }, [selectedCode, level1Status, state.overview])

  const selectedProblemId = state.selectedProblemId
  const level2Status = state.level2.status

  // Detalle del problema: dos peticiones en paralelo, y ninguna si el problema
  // ya estaba en caché (el reducer entra directo en `ready`).
  useEffect(() => {
    if (!selectedProblemId || level2Status !== 'idle') return

    dispatch({ type: 'LOAD_DETAIL', problemId: selectedProblemId })

    void fetchProblemDetail(selectedProblemId)
      .then((detail) => {
        dispatch({
          type: 'LOAD_DETAIL_SUCCESS',
          problemId: selectedProblemId,
          detail,
          generation: generationRef.current,
        })
      })
      .catch((error: unknown) => {
        dispatch({
          type: 'LOAD_DETAIL_ERROR',
          problemId: selectedProblemId,
          message: getErrorMessage(error),
        })
      })
  }, [selectedProblemId, level2Status])

  const expandedSections = state.level2.expanded
  const sectionsState = state.level2.sections

  // Secciones perezosas: una petición la primera vez que se despliegan, y
  // ninguna al cerrarlas y volverlas a abrir.
  useEffect(() => {
    if (!selectedProblemId) return

    for (const section of expandedSections) {
      if (!isLazySection(section)) continue
      if (sectionsState[section].status !== 'idle') continue

      const problemId = selectedProblemId
      dispatch({ type: 'LOAD_SECTION', problemId, section })

      void SECTION_LOADERS[section](problemId)
        .then((items) => {
          dispatch({
            type: 'LOAD_SECTION_SUCCESS',
            problemId,
            section,
            items,
          })
        })
        .catch((error: unknown) => {
          dispatch({
            type: 'LOAD_SECTION_ERROR',
            problemId,
            section,
            message: getErrorMessage(error),
          })
        })
    }
  }, [selectedProblemId, expandedSections, sectionsState])

  const selectProblem = useCallback((problemId: string) => {
    dispatch({ type: 'SELECT_PROBLEM', problemId })
  }, [])

  const closeProblem = useCallback(() => {
    dispatch({ type: 'CLOSE_PROBLEM' })
  }, [])

  const toggleSection = useCallback(
    (section: ProblemSectionId) => {
      if (!selectedProblemId) return
      dispatch({ type: 'TOGGLE_SECTION', problemId: selectedProblemId, section })
    },
    [selectedProblemId],
  )

  const selectCoordination = useCallback((code: CoordinationId) => {
    dispatch({ type: 'SELECT_COORDINATION', code })
  }, [])

  const clearCoordination = useCallback(() => {
    dispatch({ type: 'CLEAR_COORDINATION' })
  }, [])

  const retryCoordinationProblems = useCallback(() => {
    dispatch({ type: 'RETRY_PROBLEMS' })
  }, [])

  const hoverCoordination = useCallback((code: CoordinationId | null) => {
    dispatch({ type: 'HOVER_COORDINATION', code })
  }, [])

  // ================= «MIS REPORTES» =================

  const myReportsStatus = state.myReports.status

  /*
   * Se carga al montar y se vuelve a pedir cuando una escritura confirmada la
   * marca `idle`. NO depende de la coordinación seleccionada: es la lista propia
   * del usuario, y cambiar de carta no la toca.
   */
  useEffect(() => {
    if (myReportsStatus !== 'idle') return

    const generation = generationRef.current
    dispatch({ type: 'LOAD_MY_REPORTS', page: 1 })

    void fetchMyReports(1)
      .then((page) => {
        dispatch({ type: 'LOAD_MY_REPORTS_SUCCESS', page, generation })
      })
      .catch((error: unknown) => {
        dispatch({
          type: 'LOAD_MY_REPORTS_ERROR',
          message: getErrorMessage(error),
        })
      })
  }, [myReportsStatus])

  const myReportsPage = state.myReports.page
  const myReportsLoaded = state.myReports.items.length
  const myReportsTotal = state.myReports.total

  const loadMoreMyReports = useCallback(() => {
    // Nada que pedir si ya está todo cargado.
    if (myReportsLoaded >= myReportsTotal) return

    const next = myReportsPage + 1
    const generation = generationRef.current
    dispatch({ type: 'LOAD_MY_REPORTS', page: next })

    void fetchMyReports(next)
      .then((page) => {
        dispatch({ type: 'LOAD_MY_REPORTS_SUCCESS', page, generation })
      })
      .catch((error: unknown) => {
        dispatch({
          type: 'LOAD_MY_REPORTS_ERROR',
          message: getErrorMessage(error),
        })
      })
  }, [myReportsPage, myReportsLoaded, myReportsTotal])

  // ================= PANEL DERECHO =================

  const openMyReport = useCallback(
    (problemId: string, coordinationCode: CoordinationId | null) => {
      dispatch({ type: 'OPEN_MY_REPORT', problemId, coordinationCode })
    },
    [],
  )

  const openReportForm = useCallback(() => {
    dispatch({ type: 'OPEN_REPORT_FORM' })
  }, [])

  const setReportDraft = useCallback(
    (key: string, draft: Partial<ReportDraft>) => {
      dispatch({ type: 'SET_REPORT_DRAFT', key, draft })
    },
    [],
  )

  const setLearningDraft = useCallback((problemId: string, learning: string) => {
    dispatch({ type: 'SET_LEARNING_DRAFT', problemId, learning })
  }, [])

  const consumeCharacterReaction = useCallback((id: number) => {
    dispatch({ type: 'CONSUME_CHARACTER_REACTION', id })
  }, [])

  // ================= ESCRITURAS =================

  /**
   * Guardia de envío único. El reducer ya rechaza una segunda operación, pero
   * el ref cierra la ventana entre el clic y el siguiente render: dos
   * pulsaciones muy seguidas leerían el mismo estado todavía en reposo.
   */
  const sendingRef = useRef(false)

  const submitReport = useCallback(
    async (input: {
      draftKey: string
      coordinationCode: CoordinationId | null
      coordinationId: string | null
      draft: ReportDraft
    }): Promise<boolean> => {
      if (sendingRef.current) return false
      sendingRef.current = true

      /*
       * DESTINO CAPTURADO AL ENVIAR. Si el usuario cambia de carta mientras la
       * petición viaja, la respuesta actualiza ESTA coordinación y no la que
       * esté mirando al volver, y no se le devuelve por la fuerza aquí.
       */
      const targetKey = input.draftKey
      const targetCode = input.coordinationCode

      dispatch({ type: 'SUBMIT_REPORT', targetKey })

      try {
        const situation = await submitProblemReport({
          draft: input.draft,
          coordinationId: input.coordinationId,
        })

        // Solo aquí se da por buena la operación: con la respuesta del servidor.
        dispatch({
          type: 'SUBMIT_REPORT_SUCCESS',
          targetKey,
          coordinationCode: targetCode,
          problemId: situation.id,
        })
        return true
      } catch (error: unknown) {
        // Sin reintento automático: el borrador se conserva y reenviar es una
        // decisión del usuario.
        dispatch({
          type: 'SUBMIT_REPORT_ERROR',
          message: getErrorMessage(error),
        })
        return false
      } finally {
        sendingRef.current = false
      }
    },
    [],
  )

  const submitResolution = useCallback(
    async (problemId: string, learning: string): Promise<boolean> => {
      if (sendingRef.current) return false
      sendingRef.current = true

      dispatch({ type: 'SUBMIT_RESOLUTION', problemId })

      try {
        const detail = await submitProblemResolution(problemId, learning)
        dispatch({ type: 'SUBMIT_RESOLUTION_SUCCESS', problemId, detail })
        return true
      } catch (error: unknown) {
        /*
         * 409 NO es un fallo de la operación: es que el problema YA estaba
         * resuelto, casi siempre porque otra persona se adelantó. Hay que
         * refrescar —el cierre existe y el detalle que se muestra está
         * obsoleto— pero sin representar una resolución de quien está delante.
         * Un 4xx cualquiera o un fallo de red sí son errores y van por la otra
         * rama, que tampoco dispara reacción.
         */
        if (error instanceof ApiError && error.status === 409) {
          dispatch({
            type: 'SUBMIT_RESOLUTION_CONFLICT',
            problemId,
            message: getErrorMessage(error),
          })
          return false
        }

        dispatch({
          type: 'SUBMIT_RESOLUTION_ERROR',
          message: getErrorMessage(error),
        })
        return false
      } finally {
        sendingRef.current = false
      }
    },
    [],
  )

  /*
   * El resumen operacional se vuelve a pedir tras cada escritura confirmada: es
   * la fuente del aura de las cartas y del estado del personaje, y crear o
   * resolver un problema puede haber cambiado el estado de un área.
   *
   * Un fallo aquí NO invalida la escritura, que el servidor ya confirmó: se
   * conserva el resumen anterior en lugar de vaciarlo, porque vaciarlo dejaría
   * la mesa en DESCONOCIDO por un fallo de lectura posterior.
   */
  const dataGeneration = state.dataGeneration
  useEffect(() => {
    if (dataGeneration === 0) return

    void fetchOperationalOverview()
      .then((overview) => {
        dispatch({ type: 'LOAD_OVERVIEW_SUCCESS', overview })
      })
      .catch(() => {})
  }, [dataGeneration])

  return {
    ...state,
    selectCoordination,
    clearCoordination,
    retryCoordinationProblems,
    hoverCoordination,
    selectProblem,
    closeProblem,
    toggleSection,
    openMyReport,
    loadMoreMyReports,
    openReportForm,
    setReportDraft,
    setLearningDraft,
    submitReport,
    submitResolution,
    consumeCharacterReaction,
  }
}
