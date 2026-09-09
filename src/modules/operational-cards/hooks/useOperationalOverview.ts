import { useCallback, useEffect, useReducer, useRef } from 'react'
import { getErrorMessage } from '@/shared/utils/error'
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
      .then((problems) => {
        dispatch({
          type: 'LOAD_PROBLEMS_SUCCESS',
          code: selectedCode,
          problems,
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

  const hoverCoordination = useCallback((code: CoordinationId | null) => {
    dispatch({ type: 'HOVER_COORDINATION', code })
  }, [])

  return {
    ...state,
    selectCoordination,
    clearCoordination,
    hoverCoordination,
    selectProblem,
    closeProblem,
    toggleSection,
  }
}
