import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { LoadState } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Reducer de LEVEL 0. Deliberadamente pequeño: solo la carga del overview.
 * LEVEL 1 (problemas por coordinación), LEVEL 2 (detalle) y la selección se
 * añadirán como acciones nuevas en fases posteriores, sin rehacer esto.
 */

export interface OperationalCardsLevel0State {
  level0: LoadState
  overview: OperationalOverview | null
  /** Mensaje para diagnóstico; el estado visual sale de `level0`. */
  errorMessage: string | null
}

export type OperationalCardsAction =
  | { type: 'LOAD_OVERVIEW' }
  | { type: 'LOAD_OVERVIEW_SUCCESS'; overview: OperationalOverview }
  | { type: 'LOAD_OVERVIEW_ERROR'; message: string }

export const initialOperationalCardsState: OperationalCardsLevel0State = {
  level0: 'idle',
  overview: null,
  errorMessage: null,
}

/**
 * Un fallo NUNCA deja un overview sintético: `overview` se vacía y el estado
 * queda en `error`, que la UI presenta como DESCONOCIDO. Nada de `totals` en
 * cero ni `coordinations: []` haciéndose pasar por salud.
 */
export function operationalCardsReducer(
  state: OperationalCardsLevel0State,
  action: OperationalCardsAction,
): OperationalCardsLevel0State {
  switch (action.type) {
    case 'LOAD_OVERVIEW':
      return { ...state, level0: 'loading', errorMessage: null }

    case 'LOAD_OVERVIEW_SUCCESS':
      return {
        level0: 'ready',
        overview: action.overview,
        errorMessage: null,
      }

    case 'LOAD_OVERVIEW_ERROR':
      return {
        level0: 'error',
        overview: null,
        errorMessage: action.message,
      }

    default:
      return state
  }
}
