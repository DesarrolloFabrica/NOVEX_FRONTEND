import { describe, expect, it } from 'vitest'
import {
  MVP_CRITICAL_ACTIVE_COUNT,
  MVP_CRITICAL_HIGH_COUNT,
  buildIntegrityExplanation,
  collectTriggeredCriticalRules,
  formatIntegrityWhy,
} from '@/modules/operational-cards/domain/integrity-policy'

describe('integrity-policy explicación determinista', () => {
  it('explica crítico por volumen aunque no haya severidad crítica', () => {
    const input = {
      activeCount: 10,
      criticalCount: 0,
      highCount: 1,
      mediumCount: 8,
      lowCount: 1,
    }
    expect(collectTriggeredCriticalRules(input)).toEqual(['ACTIVE_ACCUMULATION'])
    const explanation = buildIntegrityExplanation('CRITICO', input)
    expect(formatIntegrityWhy(explanation)).toBe(
      `Estado crítico por volumen: 10 problemas activos superan el umbral de ${MVP_CRITICAL_ACTIVE_COUNT}.`,
    )
  })

  it('explica crítico por acumulación de alta', () => {
    const input = {
      activeCount: 6,
      criticalCount: 0,
      highCount: 5,
      mediumCount: 0,
      lowCount: 1,
    }
    const explanation = buildIntegrityExplanation('CRITICO', input)
    expect(explanation.triggeredRules[0]).toBe('HIGH_ACCUMULATION')
    expect(formatIntegrityWhy(explanation)).toContain(
      `el umbral crítico es ${MVP_CRITICAL_HIGH_COUNT}`,
    )
  })

  it('prioriza severidad crítica y marca condiciones extra', () => {
    const input = {
      activeCount: 10,
      criticalCount: 1,
      highCount: 4,
      mediumCount: 3,
      lowCount: 2,
    }
    const explanation = buildIntegrityExplanation('CRITICO', input)
    expect(explanation.triggeredRules[0]).toBe('CRITICAL_SEVERITY')
    expect(explanation.extraCount).toBeGreaterThan(0)
    expect(formatIntegrityWhy(explanation)).toContain('+')
  })

  it('explica alerta sin umbral crítico', () => {
    const explanation = buildIntegrityExplanation('ALERTA', {
      activeCount: 3,
      criticalCount: 0,
      highCount: 1,
      mediumCount: 1,
      lowCount: 1,
    })
    expect(formatIntegrityWhy(explanation)).toContain('Estado en alerta')
  })

  it('explica estable sin problemas', () => {
    const explanation = buildIntegrityExplanation('ESTABLE', {
      activeCount: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    })
    expect(formatIntegrityWhy(explanation)).toContain('Estado estable')
  })
})
