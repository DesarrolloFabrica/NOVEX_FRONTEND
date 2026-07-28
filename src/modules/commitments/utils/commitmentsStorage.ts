// Capa: utilidades del módulo "commitments".
// Responsabilidad: persistencia TEMPORAL de compromisos en localStorage.
// Es una capa de demo/desarrollo (no reemplaza un backend) para que las
// validaciones y su historial sobrevivan a un refresh.
//
// Toda la API es defensiva: si localStorage no está disponible (SSR, modo
// privado, entorno de tests sin DOM) o si los datos están corruptos, las
// funciones degradan a un comportamiento neutro (null / no-op) sin lanzar.

import type { Commitment } from '@/modules/commitments/types/commitment.types'

/** Clave de almacenamiento versionada (permite migraciones futuras). */
export const COMMITMENTS_STORAGE_KEY = 'cunmark.commitments.v4'

/** Clave legacy del rebrand Omega → Cunmark. */
export const LEGACY_COMMITMENTS_STORAGE_KEY = 'omega.commitments.v4'

/** Obtiene localStorage si existe; null en cualquier otro caso. */
function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Validación mínima de la forma esperada (array de compromisos). */
function isValidCommitmentArray(value: unknown): value is Commitment[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Commitment).id === 'string' &&
        typeof (item as Commitment).status === 'string' &&
        ((item as Commitment).draftStatus === undefined ||
          (item as Commitment).draftStatus === 'Pendiente de validación' ||
          (item as Commitment).draftStatus === 'Cumplido' ||
          (item as Commitment).draftStatus === 'Incumplido') &&
        Array.isArray((item as Commitment).history),
    )
  )
}

function parseCommitments(raw: string | null): Commitment[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValidCommitmentArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Lee los compromisos persistidos.
 * - Si no hay datos => null (el contexto cargará mocks).
 * - Si el JSON es inválido o no cumple la forma => limpia y devuelve null.
 * - Migra automáticamente desde la clave legacy `omega.commitments.v4`.
 */
export function loadStoredCommitments(): Commitment[] | null {
  const storage = getStorage()
  if (!storage) return null

  let currentRaw: string | null
  let legacyRaw: string | null
  try {
    currentRaw = storage.getItem(COMMITMENTS_STORAGE_KEY)
    legacyRaw = storage.getItem(LEGACY_COMMITMENTS_STORAGE_KEY)
  } catch {
    return null
  }

  const current = parseCommitments(currentRaw)
  if (current) {
    if (legacyRaw) {
      try {
        storage.removeItem(LEGACY_COMMITMENTS_STORAGE_KEY)
      } catch {
        // Ignorar.
      }
    }
    return current
  }

  if (currentRaw) {
    // JSON presente pero inválido en la clave nueva.
    clearStoredCommitments()
    return null
  }

  const legacy = parseCommitments(legacyRaw)
  if (!legacy) {
    if (legacyRaw) {
      clearStoredCommitments()
    }
    return null
  }

  try {
    storage.setItem(COMMITMENTS_STORAGE_KEY, JSON.stringify(legacy))
    storage.removeItem(LEGACY_COMMITMENTS_STORAGE_KEY)
  } catch {
    // Si no se puede migrar, igual devolvemos los datos leídos.
  }
  return legacy
}

/** Persiste la lista de compromisos (best-effort, silencioso ante errores). */
export function saveStoredCommitments(commitments: Commitment[]): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(COMMITMENTS_STORAGE_KEY, JSON.stringify(commitments))
    storage.removeItem(LEGACY_COMMITMENTS_STORAGE_KEY)
  } catch {
    // Cuota llena o almacenamiento no escribible: se ignora (capa temporal).
  }
}

/** Elimina los compromisos persistidos (best-effort, silencioso). */
export function clearStoredCommitments(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(COMMITMENTS_STORAGE_KEY)
    storage.removeItem(LEGACY_COMMITMENTS_STORAGE_KEY)
  } catch {
    // Se ignora intencionalmente.
  }
}
