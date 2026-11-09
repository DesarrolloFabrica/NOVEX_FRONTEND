/**
 * Progreso del recorrido por usuario y versión.
 *
 * Convivencia con el tutorial anterior:
 * - El tutorial anterior guardó su estado en `novex.onboarding.v2.<userId>` y en
 *   `users.onboarding_step` / `users.onboarding_completed` del backend. Esa
 *   clave NO se reescribe ni se borra: aquí solo se lee como historial.
 * - El recorrido renovado guarda su propio registro en
 *   `novex.onboarding.v3.<userId>`, con la versión del recorrido. Quien completó
 *   la versión anterior (backend `onboardingCompleted = true`) no tiene registro
 *   v3 y por eso recibe el recorrido renovado una vez.
 *
 * Limitación del backend (documentada, no modificada): `onboardingCompleted` es
 * un booleano. No distingue «completado» de «omitido», así que una omisión solo
 * queda registrada en localStorage. Ver el informe de la fase.
 */

export const TOUR_VERSION = 2
const TOUR_PROGRESS_PREFIX = 'novex.onboarding.v3'
const LEGACY_TOUR_PREFIX = 'novex.onboarding.v2'

export type TourOutcome = 'in-progress' | 'completed' | 'skipped'
export type TourStatus = 'not-started' | TourOutcome

export interface TourProgressRecord {
  version: number
  status: TourOutcome
  stepIndex: number
  updatedAt: string
}

export type TourStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function browserStorage(): TourStorage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function getTourProgressKey(userId: string): string {
  return `${TOUR_PROGRESS_PREFIX}.${encodeURIComponent(userId)}`
}

const OUTCOMES: readonly TourOutcome[] = ['in-progress', 'completed', 'skipped']

function isRecord(value: unknown): value is TourProgressRecord {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<TourProgressRecord>
  return (
    typeof candidate.version === 'number' &&
    OUTCOMES.includes(candidate.status as TourOutcome) &&
    typeof candidate.stepIndex === 'number' &&
    Number.isInteger(candidate.stepIndex) &&
    candidate.stepIndex >= 0 &&
    typeof candidate.updatedAt === 'string'
  )
}

export function readTourProgress(
  userId: string,
  storage: TourStorage | undefined = browserStorage(),
): TourProgressRecord | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(getTourProgressKey(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeTourProgress(
  userId: string,
  status: TourOutcome,
  stepIndex: number,
  storage: TourStorage | undefined = browserStorage(),
  now: Date = new Date(),
): void {
  if (!storage) return
  const record: TourProgressRecord = {
    version: TOUR_VERSION,
    status,
    stepIndex: Math.max(0, Math.floor(stepIndex)),
    updatedAt: now.toISOString(),
  }
  try {
    storage.setItem(getTourProgressKey(userId), JSON.stringify(record))
  } catch {
    // Sin storage el recorrido sigue funcionando en memoria.
  }
}

/** Lee el estado del tutorial anterior sin escribir nada. Solo para historial. */
export function readLegacyTourHistory(
  userId: string,
  storage: TourStorage | undefined = browserStorage(),
): 'completed' | 'in-progress' | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(`${LEGACY_TOUR_PREFIX}.${userId}`)
    if (raw === 'completed') return 'completed'
    if (raw && /^\d+$/.test(raw)) return 'in-progress'
    return null
  } catch {
    return null
  }
}

export interface TourStartDecision {
  status: TourStatus
  stepIndex: number
  /** Debe presentarse el recorrido (nuevo, renovado o reanudado). */
  shouldPresent: boolean
}

/**
 * Decide si presentar el recorrido y desde qué paso.
 * - Registro de la versión actual: se respeta su estado.
 * - Sin registro de la versión actual: se presenta desde el inicio. Esto cubre
 *   usuarios nuevos y quienes completaron la versión anterior.
 */
export function decideTourStart(
  userId: string,
  storage: TourStorage | undefined = browserStorage(),
): TourStartDecision {
  const record = readTourProgress(userId, storage)
  if (record && record.version === TOUR_VERSION) {
    return {
      status: record.status,
      stepIndex: record.stepIndex,
      shouldPresent: record.status === 'in-progress',
    }
  }
  return { status: 'not-started', stepIndex: 0, shouldPresent: true }
}

/**
 * Progreso del piloto manual. Vive en una clave propia, por usuario, versión y
 * recorrido: nunca comparte registro con el onboarding real ni escribe en backend.
 */
export const PILOT_TOUR_ID = 'coordinador-piloto'
export const PILOT_VERSION = 1

export function getPilotProgressKey(userId: string): string {
  return `novex.onboarding.pilot.${PILOT_TOUR_ID}.v${PILOT_VERSION}.${encodeURIComponent(userId)}`
}

export function readPilotProgress(
  userId: string,
  storage: TourStorage | undefined = browserStorage(),
): TourProgressRecord | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(getPilotProgressKey(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) && parsed.version === PILOT_VERSION ? parsed : null
  } catch {
    return null
  }
}

export function writePilotProgress(
  userId: string,
  status: TourOutcome,
  stepIndex: number,
  storage: TourStorage | undefined = browserStorage(),
  now: Date = new Date(),
): void {
  if (!storage) return
  const record: TourProgressRecord = {
    version: PILOT_VERSION,
    status,
    stepIndex: Math.max(0, Math.floor(stepIndex)),
    updatedAt: now.toISOString(),
  }
  try {
    storage.setItem(getPilotProgressKey(userId), JSON.stringify(record))
  } catch {
    // Sin storage el piloto sigue funcionando en memoria.
  }
}
