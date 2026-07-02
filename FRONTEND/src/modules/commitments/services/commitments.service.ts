// Capa: servicios del módulo "commitments".
// Responsabilidad: simular la comunicación con un backend de compromisos.
// Devuelve Promesas con un pequeño retardo. Cuando exista API real, solo
// cambia ESTA capa.

import { COMMITMENTS } from '@/modules/commitments/data/commitments.mock'
import type {
  Commitment,
  CommitmentActor,
  CommitmentStatus,
} from '@/modules/commitments/types/commitment.types'

/** Retardo artificial para simular una llamada de red. */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Recupera la lista de compromisos.
 * Se devuelve una COPIA de cada elemento para que el estado del contexto no
 * comparta referencias con el mock original (inmutabilidad defensiva).
 */
export async function fetchCommitmentsRequest(): Promise<Commitment[]> {
  await delay(500)
  return COMMITMENTS.map((commitment) => ({ ...commitment }))
}

/** Resultado de persistir un cambio de estado de un compromiso. */
export interface CommitmentStatusUpdate {
  id: string
  status: CommitmentStatus
  lastUpdateAt: string
  /** Actor que ejecutó la validación (se propaga a la trazabilidad). */
  actor: CommitmentActor
}

/**
 * Persiste el nuevo estado de un compromiso.
 * El backend simulado define la marca de tiempo de la actualización y devuelve
 * el actor para que la capa de estado registre la trazabilidad.
 */
export async function updateCommitmentStatusRequest(
  commitmentId: string,
  status: CommitmentStatus,
  actor: CommitmentActor,
): Promise<CommitmentStatusUpdate> {
  await delay(300)
  return {
    id: commitmentId,
    status,
    lastUpdateAt: new Date().toISOString(),
    actor,
  }
}
