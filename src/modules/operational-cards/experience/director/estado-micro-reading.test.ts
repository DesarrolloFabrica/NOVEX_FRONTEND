import { describe, expect, it } from 'vitest'
import {
  buildDirectionMicroReading,
  buildEstadoMicroReading,
} from '@/modules/operational-cards/experience/director/estado-micro-reading'

describe('estado-micro-reading', () => {
  it('prioriza críticos cuando explican el estado', () => {
    expect(
      buildEstadoMicroReading({
        integrityStatus: 'CRITICO',
        activeCount: 6,
        severity: { critical: 1, high: 2, medium: 2, low: 1 },
        status: { open: 3, inProgress: 3 },
      }),
    ).toBe('1 problema crítico está activando el estado crítico.')
  })

  it('explica severidad alta dominante', () => {
    expect(
      buildEstadoMicroReading({
        integrityStatus: 'CRITICO',
        activeCount: 6,
        severity: { critical: 0, high: 5, medium: 0, low: 1 },
        status: { open: 3, inProgress: 3 },
      }),
    ).toBe('5 de los 6 problemas activos son de severidad alta.')
  })

  it('cae a ciclo abierto/atención sin juicio', () => {
    expect(
      buildEstadoMicroReading({
        integrityStatus: 'ESTABLE',
        activeCount: 6,
        severity: { critical: 0, high: 1, medium: 2, low: 3 },
        status: { open: 3, inProgress: 3 },
      }),
    ).toBe(
      'La coordinación mantiene 3 problemas abiertos y 3 en atención.',
    )
  })

  it('dirección prioriza coordinaciones críticas', () => {
    expect(
      buildDirectionMicroReading({
        directionStatus: 'CRITICO',
        activeCount: 37,
        criticalCoordinations: 2,
        status: { open: 20, inProgress: 17 },
      }),
    ).toBe(
      '2 coordinaciones en estado crítico concentran la alerta de Dirección.',
    )
  })
})
