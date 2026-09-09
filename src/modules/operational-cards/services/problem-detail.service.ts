import { fetchSituation } from '@/modules/api/situations.api'
import { fetchSituationEvidences } from '@/modules/api/evidences.api'
import { fetchSituationRecommendations } from '@/modules/api/recommendations.api'
import { fetchSituationTimeline } from '@/modules/api/timeline.api'
import { loadAnalysis } from '@/modules/services/situationAnalysis.service'
import type { SituationAIAnalysisResponse } from '@/modules/api/types/analysis.types'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import type {
  ProblemDetail,
  ProblemImpact,
  ProblemIntelligence,
} from '@/modules/operational-cards/types/problem-detail.types'

/**
 * LEVEL 2: detalle de un problema.
 *
 * Apertura = DOS peticiones en paralelo, situación y análisis, igual que el
 * expediente legacy. Nada más: Impacto e Inteligencia IA se derivan de ese
 * mismo análisis, así que abrir esas secciones no cuesta ninguna petición
 * extra. Recomendaciones, Evidencias y Timeline se piden solo al desplegarse.
 *
 * `loadAnalysis` devuelve null cuando la situación no tiene análisis —ocurre
 * en torno al 20 % del dataset—, y la isla lo presenta como ausencia, no como
 * error.
 *
 * Solo lectura: aquí no se ejecuta análisis, no se simula impacto y no se
 * toca ninguna recomendación ni evidencia.
 */

/** Longitud del resumen derivado de la descripción cuando no hay análisis. */
const FALLBACK_SUMMARY_LIMIT = 260

function toIntelligence(
  analysis: SituationAIAnalysisResponse,
): ProblemIntelligence {
  const result = analysis.analysis

  return {
    headline: result.executiveSummary.headline,
    summary: result.executiveSummary.summary,
    keyPoints: result.executiveSummary.keyPoints ?? [],
    rootCause: result.rootCause?.summary ?? null,
    risks: (result.immediateRisks ?? []).map((risk) => ({
      title: risk.title,
      severity: risk.severity,
    })),
  }
}

function toImpact(analysis: SituationAIAnalysisResponse): ProblemImpact {
  const assessment = analysis.analysis.impactAssessment

  return {
    summary: assessment.summary,
    // Estructura nueva del análisis; no se usa `relatedCoordinations` legacy.
    areas: (assessment.affectedCoordinations ?? []).map((area) => ({
      coordinationCode: area.coordinationCode,
      impactLevel: area.impactLevel,
      description: area.description,
    })),
    propagationDepth: (assessment.propagation ?? []).reduce(
      (deepest, node) => Math.max(deepest, node.depth),
      0,
    ),
  }
}

/**
 * Resumen determinístico cuando no hay análisis: primer bloque de la
 * descripción, recortado en un límite de palabra. No se inventa texto y no se
 * llama a ninguna IA.
 */
function fallbackSummary(description: string): string {
  const clean = description.replace(/\s+/g, ' ').trim()
  if (clean.length <= FALLBACK_SUMMARY_LIMIT) return clean

  const cut = clean.slice(0, FALLBACK_SUMMARY_LIMIT)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

function toDetail(
  situation: SituationResponse,
  analysis: SituationAIAnalysisResponse | null,
): ProblemDetail {
  const intelligence = analysis ? toIntelligence(analysis) : null

  return {
    id: situation.id,
    title: situation.title,
    severity: situation.severity,
    status: situation.status,
    slaHealth: situation.slaHealth ?? null,
    dueAt: situation.dueAt ?? null,
    summary: intelligence
      ? intelligence.summary
      : fallbackSummary(situation.description),
    coordinationName: situation.coordinationName ?? null,
    createdAt: situation.createdAt,
    impact: analysis ? toImpact(analysis) : null,
    intelligence,
  }
}

export async function fetchProblemDetail(
  problemId: string,
): Promise<ProblemDetail> {
  const [situation, analysis] = await Promise.all([
    fetchSituation(problemId),
    loadAnalysis(problemId),
  ])

  return toDetail(situation, analysis)
}

/** Secciones perezosas. Una petición por sección, y solo al desplegarla. */
export async function fetchProblemRecommendations(problemId: string) {
  return (await fetchSituationRecommendations(problemId)).items
}

export async function fetchProblemEvidences(problemId: string) {
  return (await fetchSituationEvidences(problemId)).items
}

export async function fetchProblemTimeline(problemId: string) {
  return (await fetchSituationTimeline(problemId)).items
}
