/**
 * Borradores temporales de motivos administrativos / retiro de evidencias.
 *
 * Viven en sessionStorage (no se mezclan entre pestañas de distinto origen de
 * sesión de navegador) y se separan por usuario. No guardan tokens ni datos
 * ajenos al texto del motivo.
 */

export type ReasonDraftKind = 'cancel' | 'transfer' | 'retire'

const REASONS_PREFIX = 'novex.cards.reasonDrafts.v1'

const memory = new Map<string, string>()

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

function scopeKey(scope: string): string {
  return `${REASONS_PREFIX}:${scope}`
}

function draftField(kind: ReasonDraftKind, targetId: string): string {
  return `${kind}:${targetId}`
}

function readRaw(key: string): string | null {
  const storage = getStorage()
  if (storage) {
    try {
      return storage.getItem(key)
    } catch {
      // bloqueado
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
      // cuota
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
    const out: Record<string, string> = {}
    for (const [field, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof value === 'string' && value.length > 0) out[field] = value
    }
    return out
  } catch {
    return {}
  }
}

function writeRecord(key: string, record: Record<string, string>): void {
  writeRaw(key, Object.keys(record).length > 0 ? JSON.stringify(record) : null)
}

export function readReasonDraft(
  scope: string | null,
  kind: ReasonDraftKind,
  targetId: string,
): string {
  if (!scope || !targetId) return ''
  return readRecord(scopeKey(scope))[draftField(kind, targetId)] ?? ''
}

export function writeReasonDraft(
  scope: string | null,
  kind: ReasonDraftKind,
  targetId: string,
  reason: string,
): void {
  if (!scope || !targetId) return
  const key = scopeKey(scope)
  const record = readRecord(key)
  const field = draftField(kind, targetId)
  if (reason.length === 0) {
    if (!(field in record)) return
    const next = { ...record }
    delete next[field]
    writeRecord(key, next)
    return
  }
  writeRecord(key, { ...record, [field]: reason })
}

export function clearReasonDraft(
  scope: string | null,
  kind: ReasonDraftKind,
  targetId: string,
): void {
  writeReasonDraft(scope, kind, targetId, '')
}

export function clearAllReasonDrafts(scope: string | null): void {
  if (!scope) return
  writeRaw(scopeKey(scope), null)
}
