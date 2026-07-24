// Capa: utilidades del módulo "operational-events".
// Responsabilidad: persistencia TEMPORAL de eventos en localStorage.
// Capa de demo/desarrollo (no reemplaza un backend).
//
// API defensiva: si localStorage no está disponible o los datos están
// corruptos, degrada a comportamiento neutro (null / no-op).

import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'

/** Clave de almacenamiento versionada (permite migraciones futuras). */
export const OPERATIONAL_EVENTS_STORAGE_KEY = 'omega.operational-events.v1'

/** Obtiene localStorage si existe; null en cualquier otro caso. */
function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Validación mínima de la forma esperada (array de eventos). */
function isValidOperationalEventArray(
  value: unknown,
): value is OperationalEvent[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as OperationalEvent).id === 'string' &&
        typeof (item as OperationalEvent).title === 'string' &&
        typeof (item as OperationalEvent).status === 'string' &&
        typeof (item as OperationalEvent).timeline === 'object' &&
        (item as OperationalEvent).timeline !== null &&
        Array.isArray((item as OperationalEvent).timeline.entries),
    )
  )
}

/**
 * Lee los eventos persistidos.
 * - Si no hay datos => null (el contexto cargará mocks).
 * - Si el JSON es inválido o no cumple la forma => limpia y devuelve null.
 */
export function loadStoredOperationalEvents(): OperationalEvent[] | null {
  const storage = getStorage()
  if (!storage) return null

  let raw: string | null
  try {
    raw = storage.getItem(OPERATIONAL_EVENTS_STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isValidOperationalEventArray(parsed)) {
      clearStoredOperationalEvents()
      return null
    }
    return parsed
  } catch {
    clearStoredOperationalEvents()
    return null
  }
}

/** Persiste la lista de eventos (best-effort, silencioso ante errores). */
export function saveStoredOperationalEvents(events: OperationalEvent[]): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(OPERATIONAL_EVENTS_STORAGE_KEY, JSON.stringify(events))
  } catch {
    // Cuota llena o almacenamiento no escribible: se ignora.
  }
}

/** Elimina los eventos persistidos (best-effort). */
export function clearStoredOperationalEvents(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(OPERATIONAL_EVENTS_STORAGE_KEY)
  } catch {
    // Se ignora intencionalmente.
  }
}
