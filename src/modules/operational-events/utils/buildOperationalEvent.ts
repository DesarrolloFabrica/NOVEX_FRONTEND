// Capa: utilidades — ensamblado del OperationalEvent a partir del wizard.

import { OPERATIONAL_AREAS_CATALOG } from '@/modules/operational-events/data/operational-areas.mock'
import type {
  AIInterpretation,
  OperationalActor,
  OperationalEvent,
  OperationalEventDraft,
} from '@/modules/operational-events/types/operational-event.types'
import { resolveOperationalAreaName } from '@/modules/operational-events/utils/operationalArea.utils'

/** Normaliza la fecha del formulario a ISO 8601. */
export function toReportedAtIso(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T12:00:00.000Z`
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString()
  }
  return parsed.toISOString()
}

/**
 * Construye el evento completo listo para persistir tras la confirmación.
 */
export function buildOperationalEventFromCapture(input: {
  eventId: string
  draft: OperationalEventDraft
  interpretation: AIInterpretation
  actor: OperationalActor
}): OperationalEvent {
  const reportedAt = toReportedAtIso(input.draft.reportedAt)
  const now = new Date().toISOString()
  const sourceAreaName = resolveOperationalAreaName(
    OPERATIONAL_AREAS_CATALOG,
    input.draft.sourceAreaId,
  )

  const interpretation: AIInterpretation = {
    ...input.interpretation,
    id: `ai-${input.eventId}`,
    eventId: input.eventId,
  }

  return {
    id: input.eventId,
    title: input.draft.title.trim(),
    description: input.draft.description.trim(),
    reportedBy: input.actor,
    reportedAt,
    sourceAreaId: input.draft.sourceAreaId,
    sourceAreaName,
    status: 'open',
    interpretation,
    observations: input.draft.observations?.trim() || undefined,
    attachmentNames:
      input.draft.attachmentNames && input.draft.attachmentNames.length > 0
        ? [...input.draft.attachmentNames]
        : undefined,
    timeline: {
      eventId: input.eventId,
      entries: [
        {
          id: `tl-${input.eventId}-1`,
          eventId: input.eventId,
          type: 'event_registered',
          at: reportedAt,
          byUserId: input.actor.id,
          byUserName: input.actor.name,
          description: `Situación registrada por ${input.actor.name}.`,
        },
        {
          id: `tl-${input.eventId}-2`,
          eventId: input.eventId,
          type: 'interpretation_generated',
          at: now,
          description: `Interpretación generada por ${interpretation.modelLabel}.`,
        },
      ],
    },
    createdAt: now,
    lastUpdateAt: now,
  }
}
