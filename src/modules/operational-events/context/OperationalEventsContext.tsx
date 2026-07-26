// Capa: contexto (estado) del módulo "operational-events".
// Responsabilidad: orquestar la carga y alta de eventos con useReducer.
// La lógica async (servicios) vive aquí; el reducer permanece puro.
//
// Registrado globalmente en app/providers (experiencia principal del producto).

import {
  createContext,
  useCallback,
  useMemo,
  useReducer,
} from 'react'
import type { ReactNode } from 'react'
import {
  fetchOperationalEventsRequest,
  registerOperationalEventRequest,
} from '@/modules/operational-events/services/operational-events.service'
import {
  initialOperationalEventsState,
  operationalEventsReducer,
  type OperationalEventsState,
} from '@/modules/operational-events/reducers/operational-events.reducer'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { getErrorMessage } from '@/shared/utils/error'

/** Valor expuesto por el contexto: estado + acciones de alto nivel. */
export interface OperationalEventsContextValue extends OperationalEventsState {
  /** Carga los eventos desde la API operacional. */
  loadOperationalEvents: () => Promise<void>
  /** Recarga los eventos desde la API operacional. */
  resetOperationalEvents: () => Promise<void>
  /** Registra un evento operacional en backend. */
  registerOperationalEvent: (event: OperationalEvent) => Promise<OperationalEvent>
}

export const OperationalEventsContext =
  createContext<OperationalEventsContextValue | null>(null)

export function OperationalEventsProvider({
  children,
}: {
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(
    operationalEventsReducer,
    initialOperationalEventsState,
  )

  const loadOperationalEvents = useCallback(async () => {
    dispatch({ type: 'OPERATIONAL_EVENTS_LOADING' })
    try {
      const items = await fetchOperationalEventsRequest()
      dispatch({ type: 'OPERATIONAL_EVENTS_LOADED', items })
    } catch (error) {
      dispatch({
        type: 'OPERATIONAL_EVENTS_ERROR',
        error: getErrorMessage(error),
      })
    }
  }, [])

  const resetOperationalEvents = useCallback(async () => {
    dispatch({ type: 'OPERATIONAL_EVENTS_LOADING' })
    try {
      const items = await fetchOperationalEventsRequest()
      dispatch({ type: 'OPERATIONAL_EVENTS_LOADED', items })
    } catch (error) {
      dispatch({
        type: 'OPERATIONAL_EVENTS_ERROR',
        error: getErrorMessage(error),
      })
    }
  }, [])

  const registerOperationalEvent = useCallback(
    async (event: OperationalEvent): Promise<OperationalEvent> => {
      dispatch({ type: 'OPERATIONAL_EVENTS_LOADING' })
      try {
        const saved = await registerOperationalEventRequest(event)
        dispatch({ type: 'OPERATIONAL_EVENT_REGISTERED', event: saved })
        return saved
      } catch (error) {
        dispatch({
          type: 'OPERATIONAL_EVENTS_ERROR',
          error: getErrorMessage(error),
        })
        throw error
      }
    },
    [],
  )

  const value = useMemo<OperationalEventsContextValue>(
    () => ({
      ...state,
      loadOperationalEvents,
      resetOperationalEvents,
      registerOperationalEvent,
    }),
    [
      state,
      loadOperationalEvents,
      resetOperationalEvents,
      registerOperationalEvent,
    ],
  )

  return (
    <OperationalEventsContext.Provider value={value}>
      {children}
    </OperationalEventsContext.Provider>
  )
}
