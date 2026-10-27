import { EXECUTIVE_OPERATIONS_HOME } from '@/modules/auth/utils/roleExperience'

/**
 * ÚNICA PUERTA DE CREACIÓN DE PROBLEMAS INTERNOS.
 *
 * El asistente legado `/situaciones/nueva` se retiró como creador de INTERNAL:
 * tenía su propio contrato (severidad fija en MEDIUM, INTERNAL sin
 * coordinación para el analista). Todos sus accesos —CTA «Registrar
 * situación», listas, consola de registro, Red de impacto y la ruta misma—
 * llevan ahora al Centro Operacional con el formulario INTERNAL abierto.
 *
 * Contrato de la URL:
 *   /centro-operacional?reportar=interno[&coordinacion=<uuid|code>]
 * `coordinacion` solo preselecciona la carta para quien puede elegirla
 * (ANALISTA); el COORDINADOR siempre reporta en la suya.
 */

export const REPORT_INTENT_PARAM = 'reportar'
export const REPORT_INTENT_INTERNAL = 'interno'
export const REPORT_INTENT_COORDINATION_PARAM = 'coordinacion'

export function buildInternalReportUrl(coordination?: string | null): string {
  const params = new URLSearchParams({
    [REPORT_INTENT_PARAM]: REPORT_INTENT_INTERNAL,
  })
  const value = coordination?.trim()
  if (value) params.set(REPORT_INTENT_COORDINATION_PARAM, value)
  return `${EXECUTIVE_OPERATIONS_HOME}?${params.toString()}`
}

export interface ReportIntent {
  coordination: string | null
}

/** Lee la intención de reportar desde una query string; null si no la hay. */
export function parseReportIntent(search: string): ReportIntent | null {
  const params = new URLSearchParams(search)
  if (params.get(REPORT_INTENT_PARAM) !== REPORT_INTENT_INTERNAL) return null
  return {
    coordination: params.get(REPORT_INTENT_COORDINATION_PARAM)?.trim() || null,
  }
}

/** La misma query string sin los parámetros de la intención (ya consumida). */
export function stripReportIntent(search: string): string {
  const params = new URLSearchParams(search)
  params.delete(REPORT_INTENT_PARAM)
  params.delete(REPORT_INTENT_COORDINATION_PARAM)
  const rest = params.toString()
  return rest ? `?${rest}` : ''
}
