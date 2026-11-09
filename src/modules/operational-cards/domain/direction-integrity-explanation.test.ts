import { describe, expect, it } from 'vitest'
import {
  buildDirectionIntegrityExplanation,
  formatIntegrityWhy,
  type DirectionIntegrityExplanationInput,
} from '@/modules/operational-cards/domain/integrity-policy'
import { parseOperationalKpiDirectionResponse } from '@/modules/operational-cards/services/operational-kpi.service'
import { kpiDirectionResponseFixture } from '@/modules/operational-cards/experience/director/director-kpi.fixture'

/**
 * Fase 01B.2 · K-01. La explicación del DIRECTOR traduce la regla que el
 * backend aplicó a la Dirección; nunca reaplica reglas de coordinación sobre
 * los totales de toda la Dirección.
 */
function input(
  overrides: Partial<DirectionIntegrityExplanationInput>,
): DirectionIntegrityExplanationInput {
  return {
    policyCode: 'direction-mvp-v1',
    rule: 'BELOW_ALERT_THRESHOLD',
    totalCoordinations: 15,
    criticalSignals: 0,
    alertSignals: 0,
    alertThreshold: 5,
    criticalSignalsThreshold: 2,
    unknownCoordinations: 0,
    analystRegistryStatus: 'ESTABLE',
    ...overrides,
  }
}

describe('buildDirectionIntegrityExplanation (K-01)', () => {
  it('CRÍTICO por varias señales críticas cita la regla de Dirección', () => {
    const why = formatIntegrityWhy(
      buildDirectionIntegrityExplanation(
        'CRITICO',
        input({ rule: 'MULTIPLE_CRITICAL_SIGNALS', criticalSignals: 2 }),
      ),
    )
    expect(why).toBe('Estado crítico: 2 señales críticas entre coordinaciones (umbral: 2).')
  })

  it('ALERTA por una sola señal crítica no dice «hay 1 problema crítico»', () => {
    const why = formatIntegrityWhy(
      buildDirectionIntegrityExplanation(
        'ALERTA',
        input({
          rule: 'SINGLE_CRITICAL_SIGNAL',
          criticalSignals: 1,
          analystRegistryStatus: 'CRITICO',
        }),
      ),
    )
    expect(why).toContain('hay 1 señal crítica')
    expect(why).toContain('Registro de analista')
    expect(why).not.toMatch(/problema/)
  })

  it('ALERTA por umbral de alertas', () => {
    const why = formatIntegrityWhy(
      buildDirectionIntegrityExplanation(
        'ALERTA',
        input({ rule: 'ALERT_THRESHOLD_REACHED', alertSignals: 5 }),
      ),
    )
    expect(why).toBe('Estado en alerta: 5 señales de alerta de 15 coordinaciones (umbral: 5).')
  })

  it('ESTABLE con alertas por debajo del umbral no afirma «no hay problemas activos»', () => {
    const why = formatIntegrityWhy(
      buildDirectionIntegrityExplanation(
        'ESTABLE',
        input({ rule: 'BELOW_ALERT_THRESHOLD', alertSignals: 4 }),
      ),
    )
    expect(why).toContain('4 señales de alerta')
    expect(why).not.toMatch(/no hay problemas activos/)
  })

  it('DESCONOCIDO por coordinaciones sin datos', () => {
    const why = formatIntegrityWhy(
      buildDirectionIntegrityExplanation(
        'DESCONOCIDO',
        input({ rule: 'UNKNOWN_SIGNAL', unknownCoordinations: 1 }),
      ),
    )
    expect(why).toContain('1 coordinación no tiene datos suficientes')
  })

  it('sin regla del backend no inventa una causa', () => {
    const explanation = buildDirectionIntegrityExplanation('ALERTA', null)
    expect(explanation.detail).toMatch(/no hay detalle de la regla/)
    expect(explanation.triggeredRules).toEqual([])
  })
})

describe('contrato KPI · direction.directionIntegrity', () => {
  it('se parsea cuando viene del backend', () => {
    const parsed = parseOperationalKpiDirectionResponse(kpiDirectionResponseFixture())
    expect(parsed.direction.directionIntegrity?.rule).toBe('BELOW_ALERT_THRESHOLD')
  })

  it('ausente → null (compatibilidad aditiva)', () => {
    const parsed = parseOperationalKpiDirectionResponse(
      kpiDirectionResponseFixture({ directionIntegrity: undefined as never }),
    )
    expect(parsed.direction.directionIntegrity).toBeNull()
  })

  it('una regla desconocida rompe el contrato', () => {
    const fixture = kpiDirectionResponseFixture()
    const broken = {
      ...fixture,
      direction: {
        ...fixture.direction,
        directionIntegrity: { ...fixture.direction.directionIntegrity, rule: 'INVENTADA' },
      },
    }
    expect(() => parseOperationalKpiDirectionResponse(broken)).toThrow()
  })
})
