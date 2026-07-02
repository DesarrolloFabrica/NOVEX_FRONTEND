// Capa: reducer del módulo "commitments".
// Responsabilidad: describir las transiciones de estado de forma PURA.
// El reducer no hace efectos (no llama servicios): solo recibe el estado
// actual y una acción, y devuelve el nuevo estado. Toda la lógica async vive
// en el contexto/servicios.

import type {
  Commitment,
  CommitmentHistoryEntry,
  CommitmentStatus,
} from '@/modules/commitments/types/commitment.types'

/** Estado del módulo de compromisos. */
export interface CommitmentsState {
  /** Lista de compromisos cargados en memoria. */
  items: Commitment[]
  /** Indica si hay una operación de carga en curso. */
  loading: boolean
  /** Mensaje de error de la última operación, si la hubo. */
  error: string | null
}

/** Acciones soportadas por el reducer (unión discriminada por `type`). */
export type CommitmentsAction =
  | { type: 'COMMITMENTS_LOADING' }
  | { type: 'COMMITMENTS_LOADED'; items: Commitment[] }
  | { type: 'COMMITMENTS_ERROR'; error: string }
  | {
      type: 'COMMITMENT_STATUS_UPDATED'
      id: string
      status: CommitmentStatus
      lastUpdateAt: string
      actorId: string
      actorName: string
    }

/** Estado inicial: sin datos cargados. */
export const initialCommitmentsState: CommitmentsState = {
  items: [],
  loading: false,
  error: null,
}

/** Reducer puro de compromisos. */
export function commitmentsReducer(
  state: CommitmentsState,
  action: CommitmentsAction,
): CommitmentsState {
  switch (action.type) {
    case 'COMMITMENTS_LOADING':
      return { ...state, loading: true, error: null }

    case 'COMMITMENTS_LOADED':
      return { ...state, loading: false, items: action.items }

    case 'COMMITMENTS_ERROR':
      return { ...state, loading: false, error: action.error }

    case 'COMMITMENT_STATUS_UPDATED':
      // Mutación inmutable: solo se reemplaza el compromiso afectado,
      // actualizando su estado, su marca de última actualización y agregando
      // una entrada de trazabilidad (historial) con el cambio realizado.
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.id !== action.id) return item

          const entry: CommitmentHistoryEntry = {
            id: `hist-${item.id}-${item.history.length + 1}`,
            commitmentId: item.id,
            type: 'status_change',
            fromStatus: item.status,
            toStatus: action.status,
            byUserId: action.actorId,
            byUserName: action.actorName,
            at: action.lastUpdateAt,
            description: `Estado actualizado de ${item.status} a ${action.status} por ${action.actorName}.`,
          }

          return {
            ...item,
            status: action.status,
            lastUpdateAt: action.lastUpdateAt,
            history: [...item.history, entry],
          }
        }),
      }

    default:
      return state
  }
}
