// Capa: servicios del módulo "operational-events".
// Responsabilidad: simular la comunicación con un backend de eventos.
// Devuelve Promesas con un pequeño retardo. Cuando exista API real, solo
// cambia ESTA capa. Gemini NO se invoca aquí en esta fase.

import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'

/** Retardo artificial para simular una llamada de red. */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Recupera la lista de eventos operacionales.
 * Se devuelve una COPIA superficial de cada elemento para que el estado del
 * contexto no comparta referencias con el mock original.
 */
export async function fetchOperationalEventsRequest(): Promise<
  OperationalEvent[]
> {
  await delay(500)
  return OPERATIONAL_EVENTS.map((event) => cloneOperationalEvent(event))
}

/**
 * Persiste (simulado) un evento recién capturado.
 * El backend mock solo confirma recepción; el estado lo actualiza el reducer.
 */
export async function registerOperationalEventRequest(
  event: OperationalEvent,
): Promise<OperationalEvent> {
  await delay(350)
  return cloneOperationalEvent(event)
}

/** Clonado defensivo de un evento (incluye interpretación y timeline). */
function cloneOperationalEvent(event: OperationalEvent): OperationalEvent {
  return {
    ...event,
    attachmentNames: event.attachmentNames
      ? [...event.attachmentNames]
      : undefined,
    interpretation: event.interpretation
      ? {
          ...event.interpretation,
          suggestedIndicators: event.interpretation.suggestedIndicators.map(
            (indicator) => ({ ...indicator }),
          ),
          detectedPatterns: [...event.interpretation.detectedPatterns],
          affectedAreaIds: [...event.interpretation.affectedAreaIds],
          affectedAreaNames: [...event.interpretation.affectedAreaNames],
        }
      : null,
    timeline: {
      ...event.timeline,
      entries: event.timeline.entries.map((entry) => ({ ...entry })),
    },
  }
}
