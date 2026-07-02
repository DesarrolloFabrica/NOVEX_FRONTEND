// Capa: contexto (estado) del módulo "commitments".
// Responsabilidad: orquestar la carga y mutación de compromisos con useReducer.
// La lógica async (servicios) vive aquí; el reducer permanece puro.

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import type { ReactNode } from 'react'
import type {
  CommitmentActor,
  CommitmentStatus,
} from '@/modules/commitments/types/commitment.types'
import {
  fetchCommitmentsRequest,
  updateCommitmentStatusRequest,
} from '@/modules/commitments/services/commitments.service'
import {
  commitmentsReducer,
  initialCommitmentsState,
  type CommitmentsState,
} from '@/modules/commitments/reducers/commitments.reducer'
import {
  clearStoredCommitments,
  loadStoredCommitments,
  saveStoredCommitments,
} from '@/modules/commitments/utils/commitmentsStorage'
import { getErrorMessage } from '@/shared/utils/error'

/** Valor expuesto por el contexto: estado + acciones de alto nivel. */
export interface CommitmentsContextValue extends CommitmentsState {
  /** Carga los compromisos: primero localStorage, luego el servicio mock. */
  loadCommitments: () => Promise<void>
  /** Limpia la persistencia y recarga los compromisos mock. */
  resetCommitments: () => Promise<void>
  /**
   * Actualiza el estado de un compromiso (marca de actualización + historial).
   * Requiere el actor para registrar la trazabilidad de la validación.
   */
  updateCommitmentStatus: (
    commitmentId: string,
    status: CommitmentStatus,
    actor: CommitmentActor,
  ) => Promise<void>
}

export const CommitmentsContext = createContext<CommitmentsContextValue | null>(
  null,
)

export function CommitmentsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    commitmentsReducer,
    initialCommitmentsState,
  )

  // Marca si ya hubo una carga exitosa. Evita persistir el estado inicial
  // vacío (lo que borraría datos guardados antes de leerlos).
  const hasLoadedRef = useRef(false)

  const loadCommitments = useCallback(async () => {
    dispatch({ type: 'COMMITMENTS_LOADING' })
    try {
      // 1) Persistencia temporal (demo); 2) si no hay, mocks del servicio.
      const items = loadStoredCommitments() ?? (await fetchCommitmentsRequest())
      hasLoadedRef.current = true
      dispatch({ type: 'COMMITMENTS_LOADED', items })
    } catch (error) {
      dispatch({ type: 'COMMITMENTS_ERROR', error: getErrorMessage(error) })
    }
  }, [])

  const resetCommitments = useCallback(async () => {
    // Reinicio de datos de demo: limpia storage y recarga mocks.
    clearStoredCommitments()
    dispatch({ type: 'COMMITMENTS_LOADING' })
    try {
      const items = await fetchCommitmentsRequest()
      hasLoadedRef.current = true
      dispatch({ type: 'COMMITMENTS_LOADED', items })
    } catch (error) {
      dispatch({ type: 'COMMITMENTS_ERROR', error: getErrorMessage(error) })
    }
  }, [])

  // Persiste los compromisos cada vez que cambian tras una carga/mutación.
  useEffect(() => {
    if (hasLoadedRef.current) {
      saveStoredCommitments(state.items)
    }
  }, [state.items])

  const updateCommitmentStatus = useCallback(
    async (
      commitmentId: string,
      status: CommitmentStatus,
      actor: CommitmentActor,
    ) => {
      try {
        // El servicio simula la persistencia y devuelve marca de tiempo + actor.
        const result = await updateCommitmentStatusRequest(
          commitmentId,
          status,
          actor,
        )
        dispatch({
          type: 'COMMITMENT_STATUS_UPDATED',
          id: result.id,
          status: result.status,
          lastUpdateAt: result.lastUpdateAt,
          actorId: result.actor.id,
          actorName: result.actor.name,
        })
      } catch (error) {
        dispatch({ type: 'COMMITMENTS_ERROR', error: getErrorMessage(error) })
      }
    },
    [],
  )

  const value = useMemo<CommitmentsContextValue>(
    () => ({
      ...state,
      loadCommitments,
      resetCommitments,
      updateCommitmentStatus,
    }),
    [state, loadCommitments, resetCommitments, updateCommitmentStatus],
  )

  return (
    <CommitmentsContext.Provider value={value}>
      {children}
    </CommitmentsContext.Provider>
  )
}
