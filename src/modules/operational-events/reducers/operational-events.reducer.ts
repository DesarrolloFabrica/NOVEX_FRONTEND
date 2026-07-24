// Capa: reducer del módulo "operational-events".
// Responsabilidad: describir las transiciones de estado de forma PURA.
// El reducer no hace efectos: solo recibe estado + acción y devuelve el nuevo
// estado. Toda la lógica async vive en el contexto/servicios.

import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'

/** Estado del módulo de eventos operacionales. */
export interface OperationalEventsState {
  /** Lista de eventos cargados en memoria. */
  items: OperationalEvent[]
  /** Indica si hay una operación de carga/escritura en curso. */
  loading: boolean
  /** Mensaje de error de la última operación, si la hubo. */
  error: string | null
}

/** Acciones soportadas por el reducer (unión discriminada por `type`). */
export type OperationalEventsAction =
  | { type: 'OPERATIONAL_EVENTS_LOADING' }
  | { type: 'OPERATIONAL_EVENTS_LOADED'; items: OperationalEvent[] }
  | { type: 'OPERATIONAL_EVENTS_ERROR'; error: string }
  | { type: 'OPERATIONAL_EVENT_REGISTERED'; event: OperationalEvent }

/** Estado inicial: sin datos cargados. */
export const initialOperationalEventsState: OperationalEventsState = {
  items: [],
  loading: false,
  error: null,
}

/** Reducer puro de eventos operacionales. */
export function operationalEventsReducer(
  state: OperationalEventsState,
  action: OperationalEventsAction,
): OperationalEventsState {
  switch (action.type) {
    case 'OPERATIONAL_EVENTS_LOADING':
      return { ...state, loading: true, error: null }

    case 'OPERATIONAL_EVENTS_LOADED':
      return { ...state, loading: false, items: action.items }

    case 'OPERATIONAL_EVENTS_ERROR':
      return { ...state, loading: false, error: action.error }

    case 'OPERATIONAL_EVENT_REGISTERED':
      return {
        ...state,
        loading: false,
        error: null,
        items: [action.event, ...state.items.filter((item) => item.id !== action.event.id)],
      }

    default:
      return state
  }
}
