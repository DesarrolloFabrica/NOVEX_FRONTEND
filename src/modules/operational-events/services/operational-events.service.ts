// Capa: servicios del módulo "operational-events".
// Responsabilidad: comunicación con la API de eventos.

import { apiRequest } from '@/shared/api/http'
import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'

interface ApiListResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

interface ApiOperationalEvent {
  id: string
  title: string
  description: string
  reportedById: string
  reportedByName: string
  reportedAt: string
  sourceAreaId: string
  sourceAreaName: string
  status: OperationalEvent['status']
  observations: string | null
  attachmentNames: string[]
  lastUpdateAt: string | null
  createdAt: string
  updatedAt: string
  currentInterpretationId: string | null
  interpretations?: ApiAIInterpretation[]
  timelineEntries?: ApiTimelineEntry[]
}

interface ApiAIInterpretation {
  id: string
  eventId: string
  categoryId: string
  categoryName: string
  affectedAreas?: Array<{ id: string; name: string }>
  impactSeverity: NonNullable<OperationalEvent['interpretation']>['impactSeverity']
  affectationPercentage: number
  impactInternal: number
  impactExternal: number
  impactStudents: number
  riskLevel: NonNullable<OperationalEvent['interpretation']>['riskLevel']
  riskScore: number
  executiveSummary: string
  narrative: string
  suggestedIndicators?: Array<{
    id: string
    code: string
    label: string
    value: number
    unit: string | null
    direction?: 'higher_is_worse' | 'higher_is_better' | null
    suggestedByAI: boolean
  }>
  detectedPatterns: string[]
  recommendations?: string[]
  modelLabel: string
  interpretedAt: string
  confidence?: number | null
  executiveReport?: NonNullable<OperationalEvent['interpretation']>['executiveReport']
}

interface ApiTimelineEntry {
  id: string
  eventId: string
  type: OperationalEvent['timeline']['entries'][number]['type']
  at: string
  byUserId?: string | null
  byUserName?: string | null
  description: string
}

/**
 * Recupera la lista de eventos operacionales.
 */
export async function fetchOperationalEventsRequest(): Promise<
  OperationalEvent[]
> {
  try {
    const response = await apiRequest<ApiListResponse<ApiOperationalEvent>>(
      '/operational-events',
    )
    return response.items.map(mapOperationalEventFromApi)
  } catch {
    return OPERATIONAL_EVENTS.map(cloneOperationalEvent)
  }
}

/**
 * Persiste un evento recién capturado en backend.
 */
export async function registerOperationalEventRequest(
  event: OperationalEvent,
): Promise<OperationalEvent> {
  try {
    const saved = await apiRequest<ApiOperationalEvent>('/operational-events', {
      method: 'POST',
      body: JSON.stringify({
        title: event.title,
        description: event.description,
        sourceAreaId: event.sourceAreaId,
        reportedAt: event.reportedAt,
        observations: event.observations,
        attachmentNames: event.attachmentNames,
        reportedById: event.reportedBy.id,
        reportedByName: event.reportedBy.name,
      }),
    })
    return mapOperationalEventFromApi(saved)
  } catch {
    return cloneOperationalEvent(event)
  }
}

function mapOperationalEventFromApi(event: ApiOperationalEvent): OperationalEvent {
  const interpretation =
    event.interpretations?.find((item) => item.id === event.currentInterpretationId) ??
    event.interpretations?.[0] ??
    null

  return {
    ...event,
    reportedBy: {
      id: event.reportedById,
      name: event.reportedByName,
    },
    observations: event.observations ?? undefined,
    attachmentNames: event.attachmentNames ?? undefined,
    createdAt: event.createdAt,
    lastUpdateAt: event.lastUpdateAt ?? event.updatedAt,
    interpretation: interpretation ? mapInterpretationFromApi(interpretation) : null,
    timeline: {
      eventId: event.id,
      entries:
        event.timelineEntries?.map((entry) => ({
          id: entry.id,
          eventId: entry.eventId,
          type: entry.type,
          at: entry.at,
          byUserId: entry.byUserId ?? undefined,
          byUserName: entry.byUserName ?? undefined,
          description: entry.description,
        })) ?? [],
    },
  }
}

function mapInterpretationFromApi(
  interpretation: ApiAIInterpretation,
): NonNullable<OperationalEvent['interpretation']> {
  const affectedAreas = interpretation.affectedAreas ?? []

  return {
    id: interpretation.id,
    eventId: interpretation.eventId,
    categoryId: interpretation.categoryId,
    categoryName: interpretation.categoryName,
    affectedAreaIds: affectedAreas.map((area) => area.id),
    affectedAreaNames: affectedAreas.map((area) => area.name),
    impactSeverity: interpretation.impactSeverity,
    affectationPercentage: interpretation.affectationPercentage,
    impactInternal: interpretation.impactInternal,
    impactExternal: interpretation.impactExternal,
    impactStudents: interpretation.impactStudents,
    riskLevel: interpretation.riskLevel,
    riskScore: interpretation.riskScore,
    executiveSummary: interpretation.executiveSummary,
    narrative: interpretation.narrative,
    suggestedIndicators:
      interpretation.suggestedIndicators?.map((indicator) => ({
        id: indicator.id,
        code: indicator.code,
        label: indicator.label,
        value: indicator.value,
        unit: indicator.unit ?? undefined,
        direction: indicator.direction ?? undefined,
        suggestedByAI: indicator.suggestedByAI,
      })) ?? [],
    detectedPatterns: interpretation.detectedPatterns ?? [],
    modelLabel: interpretation.modelLabel,
    interpretedAt: interpretation.interpretedAt,
    confidence: interpretation.confidence ?? undefined,
    executiveReport: interpretation.executiveReport,
  }
}

function cloneOperationalEvent(event: OperationalEvent): OperationalEvent {
  return {
    ...event,
    reportedBy: { ...event.reportedBy },
    attachmentNames: event.attachmentNames
      ? [...event.attachmentNames]
      : undefined,
    interpretation: event.interpretation
      ? {
          ...event.interpretation,
          affectedAreaIds: [...event.interpretation.affectedAreaIds],
          affectedAreaNames: [...event.interpretation.affectedAreaNames],
          detectedPatterns: [...event.interpretation.detectedPatterns],
          suggestedIndicators: event.interpretation.suggestedIndicators.map(
            (indicator) => ({ ...indicator }),
          ),
          executiveReport: event.interpretation.executiveReport
            ? {
                ...event.interpretation.executiveReport,
                impactAnalysis: {
                  ...event.interpretation.executiveReport.impactAnalysis,
                  affectedProcesses: [
                    ...event.interpretation.executiveReport.impactAnalysis
                      .affectedProcesses,
                  ],
                },
                affectedAreas:
                  event.interpretation.executiveReport.affectedAreas.map(
                    (area) => ({ ...area }),
                  ),
                rootCause: {
                  detectedCauses: [
                    ...event.interpretation.executiveReport.rootCause
                      .detectedCauses,
                  ],
                  hypotheses: [
                    ...event.interpretation.executiveReport.rootCause
                      .hypotheses,
                  ],
                  dependencies: [
                    ...event.interpretation.executiveReport.rootCause
                      .dependencies,
                  ],
                },
                decisionFactors: [
                  ...event.interpretation.executiveReport.decisionFactors,
                ],
                recommendedActions:
                  event.interpretation.executiveReport.recommendedActions.map(
                    (action) => ({ ...action }),
                  ),
                operationalConsequences: [
                  ...event.interpretation.executiveReport
                    .operationalConsequences,
                ],
                operationalIndicators:
                  event.interpretation.executiveReport.operationalIndicators.map(
                    (indicator) => ({ ...indicator }),
                  ),
                timelineSuggestions:
                  event.interpretation.executiveReport.timelineSuggestions.map(
                    (suggestion) => ({ ...suggestion }),
                  ),
                executiveConclusion: {
                  ...event.interpretation.executiveReport.executiveConclusion,
                },
                dataGaps: [...event.interpretation.executiveReport.dataGaps],
              }
            : undefined,
        }
      : null,
    timeline: {
      ...event.timeline,
      entries: event.timeline.entries.map((entry) => ({ ...entry })),
    },
  }
}
