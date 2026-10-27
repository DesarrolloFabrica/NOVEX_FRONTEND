import type { ReportDraft } from '@/modules/operational-cards/types/operational-cards.state'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import { createUuidV4, isUuidV4 } from '@/shared/utils/uuid'

/**
 * PERSISTENCIA DEL REPORTE EN CURSO (borrador + clave de idempotencia).
 *
 * Porta al flujo de cartas la protección contra duplicados de main, que vivía
 * en el asistente retirado. Dos piezas, ambas por `draftKey` (carta + tipo) y
 * separadas por usuario para que un equipo compartido no mezcle reportes:
 *
 *   BORRADOR  Sobrevive a recargas y cortes: el texto escrito no se pierde y,
 *             sobre todo, un reintento tras recargar envía EXACTAMENTE el mismo
 *             contenido que el intento anterior.
 *
 *   CLAVE     UUID v4 del intento lógico de registro (`Idempotency-Key`). Se
 *             crea en el primer envío y se reutiliza en todos los reintentos
 *             del mismo reporte —doble clic, timeout, respuesta perdida,
 *             recarga—, de modo que el servidor reconozca el registro y no lo
 *             duplique. Solo cambia cuando:
 *               - el servidor confirma el alta (se borra: el siguiente reporte
 *                 de esa carta es un problema NUEVO y obtiene clave nueva), o
 *               - el servidor responde IDEMPOTENCY_KEY_REUSED (el contenido
 *                 cambió tras un intento que sí se guardó): se rota para que,
 *                 si el usuario confirma de nuevo, sea un registro distinto.
 *
 * Sin almacenamiento disponible (modo privado estricto, cuota) todo funciona
 * igual en memoria durante la sesión: se pierde la protección ante recargas,
 * no la protección ante reintentos.
 */

const DRAFTS_PREFIX = 'novex.cards.reportDrafts.v1'
const REQUEST_IDS_PREFIX = 'novex.cards.reportRequestIds.v1'

const SEVERITIES: readonly SituationSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const TEXT_FIELDS = [
  'title',
  'description',
  'categoryId',
  'occurredAt',
  'responsibleCoordinationId',
  'initialConsequence',
  'affectedProcess',
  'pendingDelivery',
] as const satisfies ReadonlyArray<keyof ReportDraft>

/** Respaldo en memoria, por clave de almacenamiento. */
const memory = new Map<string, string>()

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/*
 * El respaldo en memoria SOLO se usa cuando el almacenamiento falla. Si el
 * almacenamiento responde, manda él (también cuando devuelve null, p. ej. tras
 * borrar los datos del sitio): así nunca se resucita una clave obsoleta.
 */
function readRaw(key: string): string | null {
  const storage = getStorage()
  if (storage) {
    try {
      return storage.getItem(key)
    } catch {
      // Almacenamiento bloqueado: se usa el respaldo en memoria.
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
      // Cuota o almacenamiento bloqueado: se guarda en memoria.
    }
  }
  if (value === null) memory.delete(key)
  else memory.set(key, value)
}

function readRecord(key: string): Record<string, unknown> {
  const raw = readRaw(key)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function writeRecord(key: string, record: Record<string, unknown>): void {
  writeRaw(key, Object.keys(record).length > 0 ? JSON.stringify(record) : null)
}

function draftsKey(scope: string): string {
  return `${DRAFTS_PREFIX}:${scope}`
}

function requestIdsKey(scope: string): string {
  return `${REQUEST_IDS_PREFIX}:${scope}`
}

/** Un borrador guardado solo se acepta si tiene la forma completa y válida. */
function isReportDraft(value: unknown): value is ReportDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Record<string, unknown>
  return (
    TEXT_FIELDS.every((field) => typeof draft[field] === 'string') &&
    SEVERITIES.includes(draft.severity as SituationSeverity)
  )
}

/** Borradores guardados del usuario; los corruptos se ignoran. */
export function readPersistedReportDrafts(
  scope: string | null,
): Record<string, ReportDraft> {
  if (!scope) return {}
  const drafts: Record<string, ReportDraft> = {}
  for (const [draftKey, value] of Object.entries(readRecord(draftsKey(scope)))) {
    if (isReportDraft(value)) drafts[draftKey] = value
  }
  return drafts
}

/** Guarda el mapa completo de borradores del usuario (refleja el estado). */
export function persistReportDrafts(
  scope: string | null,
  drafts: Readonly<Record<string, ReportDraft>>,
): void {
  if (!scope) return
  writeRecord(draftsKey(scope), { ...drafts })
}

/**
 * Clave del intento en curso para ese borrador. La crea si no existe; si existe
 * la devuelve tal cual, aunque el borrador haya cambiado: es el servidor quien
 * compara la huella y responde IDEMPOTENCY_KEY_REUSED si el contenido difiere
 * de un intento que sí se guardó.
 */
export function readOrCreateReportRequestId(
  scope: string | null,
  draftKey: string,
): string {
  const key = requestIdsKey(scope ?? 'anon')
  const record = readRecord(key)
  const stored = record[draftKey]
  if (isUuidV4(stored)) return stored
  const fresh = createUuidV4()
  writeRecord(key, { ...record, [draftKey]: fresh })
  return fresh
}

/** Clave nueva tras IDEMPOTENCY_KEY_REUSED: el próximo envío es otro registro. */
export function rotateReportRequestId(
  scope: string | null,
  draftKey: string,
): string {
  const key = requestIdsKey(scope ?? 'anon')
  const fresh = createUuidV4()
  writeRecord(key, { ...readRecord(key), [draftKey]: fresh })
  return fresh
}

/**
 * El servidor confirmó el alta: se olvida la clave (y con ella el intento). El
 * borrador lo retira el reducer y la persistencia lo refleja.
 */
export function clearReportRequestId(scope: string | null, draftKey: string): void {
  const key = requestIdsKey(scope ?? 'anon')
  const record = readRecord(key)
  if (!(draftKey in record)) return
  const rest = { ...record }
  delete rest[draftKey]
  writeRecord(key, rest)
}
