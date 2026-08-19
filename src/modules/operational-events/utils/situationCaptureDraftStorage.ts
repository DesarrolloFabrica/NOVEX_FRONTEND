// Persistencia local del borrador de captura de situación.
// Evita perder el formulario ante recargas (F5) o reinicios de Vite/HMR.

import type { WizardStepId } from '@/modules/operational-events/components/WizardStepRail'
import { normalizeCaptureDate } from '@/modules/operational-events/utils/situationCaptureDate'
import {
  AFFECTED_PARTY_OPTIONS,
  DETECTION_METHOD_OPTIONS,
  type AffectedParty,
  type DetectionMethod,
  type SituationCaptureDraft,
} from '@/modules/situations/types/situation-capture.types'

const DRAFT_KEY = 'novex.situationCapture.draft.v1'
const STEP_KEY = 'novex.situationCapture.step.v1'
/** Claves legacy del rebrand Cunmark -> NOVEX. */
const LEGACY_DRAFT_KEYS = ['cunmark.situationCapture.draft.v1'] as const
const LEGACY_STEP_KEYS = ['cunmark.situationCapture.step.v1'] as const

const DETECTION_METHODS = new Set<DetectionMethod>(
  DETECTION_METHOD_OPTIONS.map((option) => option.value),
)
const AFFECTED_PARTIES = new Set<AffectedParty>(
  AFFECTED_PARTY_OPTIONS.map((option) => option.value),
)

type StoredSituationCaptureDraft = SituationCaptureDraft

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isStoredDraft(value: unknown): value is StoredSituationCaptureDraft {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<StoredSituationCaptureDraft>

  return (
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.coordinationId === 'string' &&
    typeof candidate.reportedAt === 'string' &&
    typeof candidate.detectionMethodOther === 'string' &&
    typeof candidate.affectedPartyOther === 'string' &&
    typeof candidate.additionalNotes === 'string' &&
    (candidate.detectionMethod === '' ||
      (typeof candidate.detectionMethod === 'string' &&
        DETECTION_METHODS.has(candidate.detectionMethod as DetectionMethod))) &&
    isStringArray(candidate.relatedCoordinationIds) &&
    Array.isArray(candidate.affectedParties) &&
    candidate.affectedParties.every(
      (party) =>
        typeof party === 'string' && AFFECTED_PARTIES.has(party as AffectedParty),
    )
  )
}

function parseStoredDraft(raw: string | null): StoredSituationCaptureDraft | null {
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    return isStoredDraft(parsed) ? parsed : null
  } catch {
    return null
  }
}

function parseWizardStep(raw: string | null): WizardStepId | null {
  if (raw === '1' || raw === '2') return Number(raw) as WizardStepId
  return null
}

function clearLegacyDraftKeys(storage: Storage): void {
  for (const key of LEGACY_DRAFT_KEYS) storage.removeItem(key)
}

function clearLegacyStepKeys(storage: Storage): void {
  for (const key of LEGACY_STEP_KEYS) storage.removeItem(key)
}

export function readSituationCaptureDraft(): SituationCaptureDraft | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    let stored = parseStoredDraft(storage.getItem(DRAFT_KEY))

    if (!stored) {
      for (const legacyKey of LEGACY_DRAFT_KEYS) {
        const legacy = parseStoredDraft(storage.getItem(legacyKey))
        if (!legacy) continue
        storage.setItem(DRAFT_KEY, JSON.stringify(legacy))
        clearLegacyDraftKeys(storage)
        stored = legacy
        break
      }
    }

    if (!stored) return null

    return {
      ...stored,
      reportedAt: normalizeCaptureDate(stored.reportedAt),
      categoryId:
        typeof (stored as { categoryId?: unknown }).categoryId === 'string'
          ? (stored as { categoryId: string }).categoryId
          : '',
    }
  } catch {
    return null
  }
}

export function writeSituationCaptureDraft(draft: SituationCaptureDraft): void {
  const storage = getStorage()
  if (!storage) return

  const serializable: StoredSituationCaptureDraft = {
    title: draft.title,
    description: draft.description,
    coordinationId: draft.coordinationId,
    reportedAt: draft.reportedAt,
    detectionMethod: draft.detectionMethod,
    detectionMethodOther: draft.detectionMethodOther,
    affectedParties: draft.affectedParties,
    affectedPartyOther: draft.affectedPartyOther,
    relatedCoordinationIds: draft.relatedCoordinationIds,
    additionalNotes: draft.additionalNotes,
    categoryId: draft.categoryId,
  }

  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(serializable))
    clearLegacyDraftKeys(storage)
  } catch {
    // Ignorar cuotas/privacidad del navegador.
  }
}

export function readSituationCaptureWizardStep(): WizardStepId | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const current = parseWizardStep(storage.getItem(STEP_KEY))
    if (current) return current

    for (const legacyKey of LEGACY_STEP_KEYS) {
      const legacy = parseWizardStep(storage.getItem(legacyKey))
      if (!legacy) continue
      storage.setItem(STEP_KEY, String(legacy))
      clearLegacyStepKeys(storage)
      return legacy
    }

    return null
  } catch {
    return null
  }
}

export function writeSituationCaptureWizardStep(step: WizardStepId): void {
  const storage = getStorage()
  if (!storage) return

  try {
    if (step === 3) {
      storage.removeItem(STEP_KEY)
      clearLegacyStepKeys(storage)
      return
    }

    storage.setItem(STEP_KEY, String(step))
    clearLegacyStepKeys(storage)
  } catch {
    // Ignorar.
  }
}

export function clearSituationCapturePersistence(): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(DRAFT_KEY)
    storage.removeItem(STEP_KEY)
    clearLegacyDraftKeys(storage)
    clearLegacyStepKeys(storage)
  } catch {
    // Ignorar.
  }
}
