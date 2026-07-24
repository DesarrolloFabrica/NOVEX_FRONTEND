// Capa: utilidades — simulación de interpretación IA (sin Gemini).
// Responsabilidad: reutilizar interpretaciones mock del dominio para el wizard
// de captura. Más adelante esta capa se sustituye por la integración real.

import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'
import { OPERATIONAL_AREAS } from '@/modules/operational-events/data/operational-areas.mock'
import type {
  AIInterpretation,
  OperationalEventDraft,
} from '@/modules/operational-events/types/operational-event.types'

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** Normaliza texto para comparación léxica simple. */
function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9áéíóúñü]+/i)
    .filter((token) => token.length > 2)
}

/**
 * Puntúa un evento mock frente al borrador del usuario.
 * Prioriza coincidencia de área y solapamiento de tokens en título/descripción.
 */
function scoreMock(
  draft: OperationalEventDraft,
  mockTitle: string,
  mockDescription: string,
  mockSourceAreaId: string,
): number {
  const draftTokens = new Set([
    ...normalize(draft.title),
    ...normalize(draft.description),
  ])
  const mockTokens = [...normalize(mockTitle), ...normalize(mockDescription)]
  let overlap = 0
  for (const token of mockTokens) {
    if (draftTokens.has(token)) overlap += 1
  }
  const areaBonus = mockSourceAreaId === draft.sourceAreaId ? 8 : 0
  return overlap + areaBonus
}

/**
 * Clona una interpretación mock adaptándola al eventId y al relato del usuario.
 */
function adaptInterpretation(
  template: AIInterpretation,
  eventId: string,
  draft: OperationalEventDraft,
): AIInterpretation {
  const now = new Date().toISOString()
  return {
    ...template,
    id: `ai-${eventId}`,
    eventId,
    affectedAreaIds: [...template.affectedAreaIds],
    affectedAreaNames: [...template.affectedAreaNames],
    detectedPatterns: [...template.detectedPatterns],
    suggestedIndicators: template.suggestedIndicators.map((indicator, index) => ({
      ...indicator,
      id: `ind-${eventId}-${index + 1}`,
    })),
    executiveSummary: template.executiveSummary,
    narrative: `${template.narrative} Contexto reportado: «${draft.title}».`,
    modelLabel: 'gemini-mock',
    interpretedAt: now,
    confidence: template.confidence ?? 0.84,
  }
}

/**
 * Selecciona la mejor interpretación mock disponible para el borrador.
 * Si no hay solapamiento útil, usa el primer mock del mismo área o el primero global.
 */
export function selectMockInterpretationTemplate(
  draft: OperationalEventDraft,
): AIInterpretation {
  const ranked = [...OPERATIONAL_EVENTS]
    .filter((event) => event.interpretation !== null)
    .map((event) => ({
      event,
      score: scoreMock(
        draft,
        event.title,
        event.description,
        event.sourceAreaId,
      ),
    }))
    .sort((a, b) => b.score - a.score)

  const best = ranked[0]
  if (best && best.score > 0 && best.event.interpretation) {
    return best.event.interpretation
  }

  const sameArea = OPERATIONAL_EVENTS.find(
    (event) =>
      event.sourceAreaId === draft.sourceAreaId && event.interpretation,
  )
  if (sameArea?.interpretation) return sameArea.interpretation

  const fallback = OPERATIONAL_EVENTS.find((event) => event.interpretation)
  if (!fallback?.interpretation) {
    throw new Error(
      'No hay interpretaciones mock disponibles para simular el análisis IA.',
    )
  }
  return fallback.interpretation
}

/**
 * Simula el análisis con IA usando interpretaciones mock del dominio.
 * Incluye retardo artificial para preservar la sensación de procesamiento.
 */
export async function simulateAIInterpretation(
  draft: OperationalEventDraft,
  eventId: string,
): Promise<AIInterpretation> {
  await delay(900)
  const template = selectMockInterpretationTemplate(draft)
  return adaptInterpretation(template, eventId, draft)
}

/** Genera un id provisional de evento para el ciclo del wizard. */
export function createDraftEventId(): string {
  const stamp = Date.now().toString(36)
  return `evt-${stamp}`
}

/** Actor por defecto del flujo de captura (pantalla aún sin auth propia). */
export const CAPTURE_DEFAULT_ACTOR = {
  id: 'user-capture-operator',
  name: 'Operador de captura',
} as const

/** Áreas seleccionables en el formulario (solo operativas). */
export function listCaptureAreas() {
  return OPERATIONAL_AREAS
}
