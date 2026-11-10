/**
 * Persistencia de borradores de aprendizaje de cierre.
 *
 * Misma política que los reportes: por usuario, sin secretos, sobrevive a
 * caducidad de sesión y se limpia al confirmar el cierre o al logout voluntario.
 */

const LEARNING_PREFIX = 'novex.cards.learningDrafts.v1'

/** Respaldo en memoria si el almacenamiento falla. */
const memory = new Map<string, string>()

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function storageKey(scope: string): string {
  return `${LEARNING_PREFIX}:${scope}`
}

function readRaw(key: string): string | null {
  const storage = getStorage()
  if (storage) {
    try {
      return storage.getItem(key)
    } catch {
      // Almacenamiento bloqueado.
    }
  }
  return memory.get(key) ?? null
}

function writeRaw(key: string, value: string | null): void {
  const storage = getStorage()
  if (storage) {
    try {
      if (value === null) storage.removeItem(key)
      else storage.setItem(key, value)
      memory.delete(key)
      return
    } catch {
      // Cuota o bloqueo.
    }
  }
  if (value === null) memory.delete(key)
  else memory.set(key, value)
}

function readRecord(key: string): Record<string, string> {
  const raw = readRaw(key)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const drafts: Record<string, string> = {}
    for (const [problemId, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof value === 'string' && value.length > 0) {
        drafts[problemId] = value
      }
    }
    return drafts
  } catch {
    return {}
  }
}

function writeRecord(key: string, record: Record<string, string>): void {
  writeRaw(key, Object.keys(record).length > 0 ? JSON.stringify(record) : null)
}

export function readPersistedLearningDrafts(
  scope: string | null,
): Record<string, string> {
  if (!scope) return {}
  return readRecord(storageKey(scope))
}

export function persistLearningDrafts(
  scope: string | null,
  drafts: Readonly<Record<string, string>>,
): void {
  if (!scope) return
  const cleaned: Record<string, string> = {}
  for (const [problemId, value] of Object.entries(drafts)) {
    if (typeof value === 'string' && value.length > 0) {
      cleaned[problemId] = value
    }
  }
  writeRecord(storageKey(scope), cleaned)
}

export function clearPersistedLearningDrafts(scope: string | null): void {
  if (!scope) return
  writeRaw(storageKey(scope), null)
}
