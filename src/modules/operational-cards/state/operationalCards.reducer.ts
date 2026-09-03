import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  CoordinationProblem,
  OperationalCardsState,
} from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Reducer de la experiencia: LEVEL 0 (overview), selección y LEVEL 1
 * (problemas activos de la coordinación seleccionada).
 *
 * LEVEL 2 —el detalle del problema— todavía no existe aquí: `selectedProblemId`
 * llegará con la fase que construya la isla.
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
      return {
        ...state,
        selectedCoordinationCode: null,
        level1: initialOperationalCardsState.level1,
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

    default:
      return state
  }
}
