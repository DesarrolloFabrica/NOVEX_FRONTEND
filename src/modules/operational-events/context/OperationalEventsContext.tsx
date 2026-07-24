// Capa: contexto (estado) del módulo "operational-events".
// Responsabilidad: orquestar la carga y alta de eventos con useReducer.
// La lógica async (servicios) vive aquí; el reducer permanece puro.
//
// Registrado globalmente en app/providers (experiencia principal del producto).

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
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
import {
  clearStoredOperationalEvents,
  loadStoredOperationalEvents,
  saveStoredOperationalEvents,
} from '@/modules/operational-events/utils/operationalEventsStorage'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { getErrorMessage } from '@/shared/utils/error'

/** Valor expuesto por el contexto: estado + acciones de alto nivel. */
export interface OperationalEventsContextValue extends OperationalEventsState {
  /** Carga los eventos: primero localStorage, luego el servicio mock. */
  loadOperationalEvents: () => Promise<void>
  /** Limpia la persistencia y recarga los eventos mock. */
  resetOperationalEvents: () => Promise<void>
  /** Registra un evento interpretado y lo persiste en storage. */
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

  // Evita persistir el estado inicial vacío antes de la primera carga.
  const hasLoadedRef = useRef(false)

  const loadOperationalEvents = useCallback(async () => {
    dispatch({ type: 'OPERATIONAL_EVENTS_LOADING' })
    try {
      const items =
        loadStoredOperationalEvents() ?? (await fetchOperationalEventsRequest())
      hasLoadedRef.current = true
      dispatch({ type: 'OPERATIONAL_EVENTS_LOADED', items })
    } catch (error) {
      dispatch({
        type: 'OPERATIONAL_EVENTS_ERROR',
        error: getErrorMessage(error),
      })
    }
  }, [])

  const resetOperationalEvents = useCallback(async () => {
    clearStoredOperationalEvents()
    dispatch({ type: 'OPERATIONAL_EVENTS_LOADING' })
    try {
      const items = await fetchOperationalEventsRequest()
      hasLoadedRef.current = true
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
        hasLoadedRef.current = true
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

  useEffect(() => {
    if (hasLoadedRef.current) {
      saveStoredOperationalEvents(state.items)
    }
  }, [state.items])

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
