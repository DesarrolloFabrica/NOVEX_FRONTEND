/**
 * Espejo de `NOVEX_BACKEND/.../coordination-integrity.ts` (integrity-mvp-v1).
 * Solo para explicación determinista en UI. No recalcula el estado del backend.
 */

export const COORDINATION_INTEGRITY_POLICY_CODE = 'integrity-mvp-v1'

export const MVP_CRITICAL_CRITICAL_COUNT = 1
export const MVP_CRITICAL_HIGH_COUNT = 3
export const MVP_CRITICAL_ACTIVE_COUNT = 5
export const MVP_CRITICAL_AFFECTED_COORDINATIONS = 3
export const MVP_DIRECTION_CRITICAL_COORDINATIONS = 2

export type CoordinationCriticalRule =
  | 'CRITICAL_SEVERITY'
  | 'HIGH_ACCUMULATION'
  | 'ACTIVE_ACCUMULATION'
  | 'IMPACT_PROPAGATION'
  | 'INCOMING_DEPENDENCY_CRITICAL'

export interface IntegrityExplainInput {
  activeCount: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  /** Opcional: overview. */
  affectedCoordinationCount?: number
  /** Opcional: dependencias INTER críticas recibidas. */
  incomingCriticalCount?: number
  /** Opcional: total incoming (para ALERTA por dependencia). */
  incomingDependencyCount?: number
}

const RULE_PRIORITY: readonly CoordinationCriticalRule[] = [
  'CRITICAL_SEVERITY',
  'HIGH_ACCUMULATION',
  'ACTIVE_ACCUMULATION',
  'IMPACT_PROPAGATION',
  'INCOMING_DEPENDENCY_CRITICAL',
]

export function collectTriggeredCriticalRules(
  input: IntegrityExplainInput,
): CoordinationCriticalRule[] {
  const triggered: CoordinationCriticalRule[] = []
  if (input.criticalCount >= MVP_CRITICAL_CRITICAL_COUNT) {
    triggered.push('CRITICAL_SEVERITY')
  }
  if (input.highCount >= MVP_CRITICAL_HIGH_COUNT) {
    triggered.push('HIGH_ACCUMULATION')
  }
  if (input.activeCount >= MVP_CRITICAL_ACTIVE_COUNT) {
    triggered.push('ACTIVE_ACCUMULATION')
  }
  if (
    (input.affectedCoordinationCount ?? 0) >=
    MVP_CRITICAL_AFFECTED_COORDINATIONS
  ) {
    triggered.push('IMPACT_PROPAGATION')
  }
  if ((input.incomingCriticalCount ?? 0) >= MVP_CRITICAL_CRITICAL_COUNT) {
    triggered.push('INCOMING_DEPENDENCY_CRITICAL')
  }
  return RULE_PRIORITY.filter((rule) => triggered.includes(rule))
}

function explainCriticalRule(
  rule: CoordinationCriticalRule,
  input: IntegrityExplainInput,
): { title: string; detail: string } {
  switch (rule) {
    case 'CRITICAL_SEVERITY':
      return {
        title: 'Estado crítico',
        detail:
          input.criticalCount === 1
            ? 'hay 1 problema de severidad crítica.'
            : `hay ${input.criticalCount} problemas de severidad crítica.`,
      }
    case 'HIGH_ACCUMULATION':
      return {
        title: 'Estado crítico',
        detail: `${input.highCount} de los ${input.activeCount} problemas activos son de severidad alta; el umbral crítico es ${MVP_CRITICAL_HIGH_COUNT}.`,
      }
    case 'ACTIVE_ACCUMULATION':
      return {
        title: 'Estado crítico por volumen',
        detail: `${input.activeCount} problemas activos superan el umbral de ${MVP_CRITICAL_ACTIVE_COUNT}.`,
      }
    case 'IMPACT_PROPAGATION':
      return {
        title: 'Estado crítico por impacto',
        detail: `la propagación alcanza ${input.affectedCoordinationCount} coordinaciones; el umbral es ${MVP_CRITICAL_AFFECTED_COORDINATIONS}.`,
      }
    case 'INCOMING_DEPENDENCY_CRITICAL':
      return {
        title: 'Estado crítico por dependencia',
        detail:
          (input.incomingCriticalCount ?? 0) === 1
            ? 'hay 1 dependencia entrante de severidad crítica.'
            : `hay ${input.incomingCriticalCount} dependencias entrantes de severidad crítica.`,
      }
  }
}

export interface IntegrityExplanation {
  headline: string
  detail: string
  extraCount: number
  policyCode: string
  triggeredRules: CoordinationCriticalRule[]
}

/**
 * Explicación determinista del estado de integridad.
 * Prioriza la regla más relevante; indica cuántas condiciones adicionales hay.
 */
export function buildIntegrityExplanation(
  integrityStatus: 'ESTABLE' | 'ALERTA' | 'CRITICO' | 'DESCONOCIDO',
  input: IntegrityExplainInput,
): IntegrityExplanation {
  if (integrityStatus === 'DESCONOCIDO') {
    return {
      headline: 'Estado desconocido',
      detail: 'no hay datos suficientes para interpretar la integridad.',
      extraCount: 0,
      policyCode: COORDINATION_INTEGRITY_POLICY_CODE,
      triggeredRules: [],
    }
  }

  if (integrityStatus === 'ESTABLE') {
    return {
      headline: 'Estado estable',
      detail: 'no hay problemas activos ni dependencias entrantes que elevan la lectura.',
      extraCount: 0,
      policyCode: COORDINATION_INTEGRITY_POLICY_CODE,
      triggeredRules: [],
    }
  }

  if (integrityStatus === 'CRITICO') {
    const rules = collectTriggeredCriticalRules(input)
    if (rules.length === 0) {
      return {
        headline: 'Estado crítico',
        detail: 'la integridad reportada es crítica.',
        extraCount: 0,
        policyCode: COORDINATION_INTEGRITY_POLICY_CODE,
        triggeredRules: [],
      }
    }
    const primary = explainCriticalRule(rules[0], input)
    return {
      headline: primary.title,
      detail: primary.detail,
      extraCount: Math.max(0, rules.length - 1),
      policyCode: COORDINATION_INTEGRITY_POLICY_CODE,
      triggeredRules: rules,
    }
  }

  // ALERTA
  if (input.activeCount > 0) {
    return {
      headline: 'Estado en alerta',
      detail: `hay ${input.activeCount} problemas activos sin alcanzar umbral crítico.`,
      extraCount: 0,
      policyCode: COORDINATION_INTEGRITY_POLICY_CODE,
      triggeredRules: [],
    }
  }
  if ((input.incomingDependencyCount ?? 0) > 0) {
    return {
      headline: 'Estado en alerta',
      detail: `hay ${input.incomingDependencyCount} dependencias entrantes activas.`,
      extraCount: 0,
      policyCode: COORDINATION_INTEGRITY_POLICY_CODE,
      triggeredRules: [],
    }
  }
  return {
    headline: 'Estado en alerta',
    detail: 'hay señales operativas sin umbral crítico.',
    extraCount: 0,
    policyCode: COORDINATION_INTEGRITY_POLICY_CODE,
    triggeredRules: [],
  }
}

export function formatIntegrityWhy(explanation: IntegrityExplanation): string {
  const base = `${explanation.headline}: ${explanation.detail}`
  if (explanation.extraCount <= 0) return base
  return explanation.extraCount === 1
    ? `${base} + otra condición.`
    : `${base} + ${explanation.extraCount} condiciones más.`
}
