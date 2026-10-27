import { describe, expect, it } from 'vitest'
import { buildDirectionSummary } from '@/modules/operational-cards/data/directionSummary'

describe('buildDirectionSummary', () => {
  it('sin críticas ni alertas declara operación estable', () => {
    expect(buildDirectionSummary({ critical: 0, alert: 0, stable: 15 })).toBe(
      'Operación estable',
    )
  })

  it('una sola alerta se dice en singular', () => {
    expect(buildDirectionSummary({ critical: 0, alert: 1, stable: 14 })).toBe(
      '1 coordinación requiere atención',
    )
  })

  it('varias alertas sin críticas', () => {
    expect(buildDirectionSummary({ critical: 0, alert: 5, stable: 10 })).toBe(
      '5 coordinaciones requieren atención',
    )
  })

  it('una crítica se dice en singular', () => {
    expect(buildDirectionSummary({ critical: 1, alert: 0, stable: 14 })).toBe(
      '1 coordinación crítica',
    )
  })

  it('combina críticas y alertas, como el dataset real', () => {
    expect(buildDirectionSummary({ critical: 7, alert: 1, stable: 7 })).toBe(
      '7 coordinaciones críticas · 1 en alerta',
    )
  })

  it('no recomienda nada ni narra', () => {
    const phrase = buildDirectionSummary({ critical: 3, alert: 2, stable: 10 })
    expect(phrase).toBe('3 coordinaciones críticas · 2 en alerta')
    expect(phrase).not.toMatch(/deber|revis|urgent|recomend/i)
  })
})
