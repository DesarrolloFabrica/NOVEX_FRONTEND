import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  CoordinationProblem,
  OperationalCardsState,
} from '@/modules/operational-cards/types/operational-cards.state'
import {
  initialProblemSectionsState,
  type LazyProblemSectionId,
  type ProblemDetail,
  type ProblemSectionId,
} from '@/modules/operational-cards/types/problem-detail.types'

/**
 * Reducer de la experiencia: LEVEL 0 (overview), selección, LEVEL 1
 * (problemas activos de la coordinación) y LEVEL 2 (detalle del problema en
 * la isla flotante, con sus secciones perezosas).
 *
 * Cada acción de LEVEL 1 y LEVEL 2 lleva la clave a la que pertenece, así que
 * una respuesta que llega tarde tras cambiar de carta o cerrar la isla se
 * descarta en vez de contaminar lo que el usuario tiene delante.
 *
 * Impacto e Inteligencia IA no aparecen entre las secciones perezosas: se
 * derivan del análisis que ya se carga al abrir la isla.
 */

export type OperationalCardsAction =
  | { type: 'LOAD_OVERVIEW' }
  | { type: 'LOAD_OVERVIEW_SUCCESS'; overview: OperationalOverview }
  | { type: 'LOAD_OVERVIEW_ERROR'; message: string }
  | { type: 'HOVER_COORDINATION'; code: CoordinationId | null }
  | { type: 'SELECT_COORDINATION'; code: CoordinationId }
  | { type: 'CLEAR_COORDINATION' }
  | { type: 'LOAD_PROBLEMS'; code: CoordinationId }
  | {
      type: 'LOAD_PROBLEMS_SUCCESS'
      code: CoordinationId
      problems: readonly CoordinationProblem[]
    }
  | { type: 'LOAD_PROBLEMS_ERROR'; code: CoordinationId; message: string }
  | { type: 'SELECT_PROBLEM'; problemId: string }
  | { type: 'CLOSE_PROBLEM' }
  | { type: 'LOAD_DETAIL'; problemId: string }
  | { type: 'LOAD_DETAIL_SUCCESS'; problemId: string; detail: ProblemDetail }
  | { type: 'LOAD_DETAIL_ERROR'; problemId: string; message: string }
  | { type: 'TOGGLE_SECTION'; problemId: string; section: ProblemSectionId }
  | {
      type: 'LOAD_SECTION'
      problemId: string
      section: LazyProblemSectionId
    }
  | {
      type: 'LOAD_SECTION_SUCCESS'
      problemId: string
      section: LazyProblemSectionId
      items: readonly unknown[]
    }
  | {
      type: 'LOAD_SECTION_ERROR'
      problemId: string
      section: LazyProblemSectionId
      message: string
    }

export const initialOperationalCardsState: OperationalCardsState = {
  overview: null,
  level0: 'idle',
  errorMessage: null,
  selectedCoordinationCode: null,
  hoveredCoordinationCode: null,
  level1: {
    status: 'idle',
    coordinationCode: null,
    problems: [],
    errorMessage: null,
  },
  problemsByCoordination: {},
  selectedProblemId: null,
  level2: {
    status: 'idle',
    problemId: null,
    detail: null,
    errorMessage: null,
    sections: initialProblemSectionsState,
    expanded: [],
  },
  detailByProblem: {},
}

/**
 * Un fallo NUNCA deja datos sintéticos: en LEVEL 0 se vacía el overview y el
 * estado queda en `error`, que la UI presenta como DESCONOCIDO; en LEVEL 1 la
 * coordinación sigue seleccionada y con su estado de LEVEL 0 intacto, pero la
 * lista no se convierte en «Todo bajo control».
 *
 * Toda acción de LEVEL 1 lleva el `code` al que pertenece, de modo que una
 * respuesta que llega tarde tras cambiar de coordinación se descarta en vez de
 * pisar la selección vigente.
 */
export function operationalCardsReducer(
  state: OperationalCardsState,
  action: OperationalCardsAction,
): OperationalCardsState {
  switch (action.type) {
    case 'LOAD_OVERVIEW':
      return { ...state, level0: 'loading', errorMessage: null }

    case 'LOAD_OVERVIEW_SUCCESS':
      return {
        ...state,
        level0: 'ready',
        overview: action.overview,
        errorMessage: null,
      }

    case 'LOAD_OVERVIEW_ERROR':
      return {
        ...state,
        level0: 'error',
        overview: null,
        errorMessage: action.message,
        selectedCoordinationCode: null,
        level1: initialOperationalCardsState.level1,
        selectedProblemId: null,
        level2: initialOperationalCardsState.level2,
      }

    case 'HOVER_COORDINATION':
      return { ...state, hoveredCoordinationCode: action.code }

    case 'SELECT_COORDINATION': {
      if (state.selectedCoordinationCode === action.code) return state

      // Cambio directo entre coordinaciones: si la nueva ya está en caché se
      // entra en `ready` sin pasar por un parpadeo de carga.
      const cached = state.problemsByCoordination[action.code]
      return {
        ...state,
        selectedCoordinationCode: action.code,
        // La carta que tenía el hover se desmonta al recomponerse la baraja y
        // no emite `mouseleave`: sin limpiarlo queda un hover fantasma.
        hoveredCoordinationCode: null,
        // Cambiar de coordinación cierra la isla: el problema abierto
        // pertenecía a la coordinación anterior.
        selectedProblemId: null,
        level2: initialOperationalCardsState.level2,
        level1: cached
          ? {
              status: 'ready',
              coordinationCode: action.code,
              problems: cached,
              errorMessage: null,
            }
          : {
              status: 'idle',
              coordinationCode: action.code,
              problems: [],
              errorMessage: null,
            },
      }
    }

    case 'CLEAR_COORDINATION':
      // Volver a la Dirección cierra también la isla: no puede quedar un
      // detalle abierto sin coordinación debajo.
      //
      // El hover se limpia porque la carta que lo tenía se desmonta al
      // recomponerse la baraja y ya no emite `mouseleave`: sin esto el
      // personaje seguiría reaccionando a una carta que no existe.
      return {
        ...state,
        selectedCoordinationCode: null,
        hoveredCoordinationCode: null,
        level1: initialOperationalCardsState.level1,
        selectedProblemId: null,
        level2: initialOperationalCardsState.level2,
      }

    case 'LOAD_PROBLEMS':
      if (state.selectedCoordinationCode !== action.code) return state
      return {
        ...state,
        level1: {
          status: 'loading',
          coordinationCode: action.code,
          problems: [],
          errorMessage: null,
        },
      }

    case 'LOAD_PROBLEMS_SUCCESS': {
      // La caché se puebla siempre: el trabajo ya está hecho aunque el usuario
      // haya cambiado de carta mientras la petición volvía.
      const problemsByCoordination = {
        ...state.problemsByCoordination,
        [action.code]: action.problems,
      }

      if (state.selectedCoordinationCode !== action.code) {
        return { ...state, problemsByCoordination }
      }

      return {
        ...state,
        problemsByCoordination,
        level1: {
          status: 'ready',
          coordinationCode: action.code,
          problems: action.problems,
          errorMessage: null,
        },
      }
    }

    case 'LOAD_PROBLEMS_ERROR':
      if (state.selectedCoordinationCode !== action.code) return state
      return {
        ...state,
        level1: {
          status: 'error',
          coordinationCode: action.code,
          problems: [],
          errorMessage: action.message,
        },
      }

    case 'SELECT_PROBLEM': {
      // Una sola isla: mientras haya un problema abierto, otra fila no puede
      // abrir un segundo detalle encima. Es decisión de producto, no un
      // límite técnico, así que se aplica aquí y no en la vista.
      if (state.selectedProblemId !== null) return state

      const cached = state.detailByProblem[action.problemId]
      return {
        ...state,
        selectedProblemId: action.problemId,
        level2: cached
          ? {
              status: 'ready',
              problemId: action.problemId,
              detail: cached.detail,
              errorMessage: null,
              sections: cached.sections,
              expanded: [],
            }
          : {
              status: 'idle',
              problemId: action.problemId,
              detail: null,
              errorMessage: null,
              sections: initialProblemSectionsState,
              expanded: [],
            },
      }
    }

    case 'CLOSE_PROBLEM':
      // La coordinación sigue seleccionada: cerrar la isla no retrocede nivel.
      return {
        ...state,
        selectedProblemId: null,
        level2: initialOperationalCardsState.level2,
      }

    case 'LOAD_DETAIL':
      if (state.selectedProblemId !== action.problemId) return state
      return {
        ...state,
        level2: { ...state.level2, status: 'loading', errorMessage: null },
      }

    case 'LOAD_DETAIL_SUCCESS': {
      const detailByProblem = {
        ...state.detailByProblem,
        [action.problemId]: {
          detail: action.detail,
          sections:
            state.detailByProblem[action.problemId]?.sections ??
            initialProblemSectionsState,
        },
      }

      if (state.selectedProblemId !== action.problemId) {
        return { ...state, detailByProblem }
      }

      return {
        ...state,
        detailByProblem,
        level2: {
          ...state.level2,
          status: 'ready',
          detail: action.detail,
          errorMessage: null,
        },
      }
    }

    case 'LOAD_DETAIL_ERROR':
      // La isla queda abierta con su mensaje: no se cierra sola, no toca
      // LEVEL 1 y no altera el estado del problema.
      if (state.selectedProblemId !== action.problemId) return state
      return {
        ...state,
        level2: {
          ...state.level2,
          status: 'error',
          detail: null,
          errorMessage: action.message,
        },
      }

    case 'TOGGLE_SECTION': {
      if (state.selectedProblemId !== action.problemId) return state
      const isOpen = state.level2.expanded.includes(action.section)
      return {
        ...state,
        level2: {
          ...state.level2,
          expanded: isOpen
            ? state.level2.expanded.filter(
                (section) => section !== action.section,
              )
            : [...state.level2.expanded, action.section],
        },
      }
    }

    case 'LOAD_SECTION':
      if (state.selectedProblemId !== action.problemId) return state
      return {
        ...state,
        level2: {
          ...state.level2,
          sections: {
            ...state.level2.sections,
            [action.section]: {
              status: 'loading',
              items: [],
              errorMessage: null,
            },
          },
        },
      }

    case 'LOAD_SECTION_SUCCESS': {
      const loaded = {
        status: 'ready' as const,
        items: action.items,
        errorMessage: null,
      }
      const cachedEntry = state.detailByProblem[action.problemId]
      const detailByProblem = cachedEntry
        ? {
            ...state.detailByProblem,
            [action.problemId]: {
              ...cachedEntry,
              sections: { ...cachedEntry.sections, [action.section]: loaded },
            },
          }
        : state.detailByProblem

      if (state.selectedProblemId !== action.problemId) {
        return { ...state, detailByProblem }
      }

      return {
        ...state,
        detailByProblem,
        level2: {
          ...state.level2,
          sections: { ...state.level2.sections, [action.section]: loaded },
        },
      }
    }

    case 'LOAD_SECTION_ERROR':
      // Solo esa sección falla: la isla sigue utilizable y las demás también.
      if (state.selectedProblemId !== action.problemId) return state
      return {
        ...state,
        level2: {
          ...state.level2,
          sections: {
            ...state.level2.sections,
            [action.section]: {
              status: 'error',
              items: [],
              errorMessage: action.message,
            },
          },
        },
      }

    default:
      return state
  }
}
