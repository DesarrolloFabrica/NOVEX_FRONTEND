import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { SituationReportKind } from '@/modules/situations/types/situation.types'

/**
 * Etiqueta de un problema según el punto de vista de la carta observada.
 *
 *   INTERNAL                         → «Problema interno»
 *   INTER + carta = afectada         → «Dependencia que nos afecta»
 *   INTER + carta = responsable      → «Problema que debemos resolver para otra coordinación»
 *   Mis reportes / sin carta         → etiqueta neutra por kind
 */
export type SituationViewpointLabel =
  | 'Problema interno'
  | 'Dependencia que nos afecta'
  | 'Problema que debemos resolver para otra coordinación'
  | 'Dependencia entre coordinaciones'

export function resolveSituationViewpointLabel(input: {
  reportKind: SituationReportKind | null | undefined
  selectedCoordinationCode: string | null | undefined
  responsibleCode: string | null | undefined
  affectedCode: string | null | undefined
}): SituationViewpointLabel {
  const kind = input.reportKind ?? 'INTERNAL'
  if (kind !== 'INTER_COORDINATION') return 'Problema interno'

  const selected = input.selectedCoordinationCode
  if (selected && input.affectedCode === selected) {
    return 'Dependencia que nos afecta'
  }
  if (selected && input.responsibleCode === selected) {
    return 'Problema que debemos resolver para otra coordinación'
  }
  return 'Dependencia entre coordinaciones'
}

export function reportDraftKey(
  code: CoordinationId | null,
  kind: SituationReportKind = 'INTERNAL',
): string {
  return `${code ?? 'none'}:${kind}`
}
