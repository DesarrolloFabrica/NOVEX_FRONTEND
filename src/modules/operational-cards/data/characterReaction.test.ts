import { describe, expect, it } from 'vitest'
import {
  buildCharacterPresentation,
  deriveCharacterOrientation,
} from '@/modules/operational-cards/data/characterReaction'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

function coordinations(total: number): CoordinationOverview[] {
  return Array.from({ length: total }, (_unused, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    code: `coord-${index + 1}`,
    name: `Coordinación ${index + 1}`,
    shortName: `C${index + 1}`,
    color: '#28C8F4',
    displayOrder: index + 1,
    status: 'ESTABLE' as const,
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
  }))
}

describe('deriveCharacterOrientation', () => {
  it('mira a la izquierda en las cartas del extremo izquierdo', () => {
    expect(deriveCharacterOrientation(0, 8)).toBe('LEFT')
    expect(deriveCharacterOrientation(1, 8)).toBe('LEFT')
  })

  it('mira a la derecha en las cartas del extremo derecho', () => {
    expect(deriveCharacterOrientation(7, 8)).toBe('RIGHT')
    expect(deriveCharacterOrientation(6, 8)).toBe('RIGHT')
  })

  it('queda frontal en las cartas centrales', () => {
    expect(deriveCharacterOrientation(3, 8)).toBe('NEUTRAL')
    expect(deriveCharacterOrientation(4, 8)).toBe('NEUTRAL')
    expect(deriveCharacterOrientation(3, 7)).toBe('NEUTRAL')
  })

  it('una banda de una sola carta es frontal', () => {
    expect(deriveCharacterOrientation(0, 1)).toBe('NEUTRAL')
  })

  it('es simétrica respecto al centro', () => {
    expect(deriveCharacterOrientation(0, 7)).toBe('LEFT')
    expect(deriveCharacterOrientation(6, 7)).toBe('RIGHT')
  })

  it('sale de la posición real en la baraja, no de un mapa por nombre', () => {
    const { orientationByCode } = buildTableLayout(coordinations(15))
    // Banda superior: 8 cartas, coord-1 en el extremo izquierdo.
    expect(orientationByCode['coord-1']).toBe('LEFT')
    expect(orientationByCode['coord-8']).toBe('RIGHT')
    // Banda inferior: 7 cartas, coord-9 a coord-15.
    expect(orientationByCode['coord-9']).toBe('LEFT')
    expect(orientationByCode['coord-15']).toBe('RIGHT')
    expect(orientationByCode['coord-12']).toBe('NEUTRAL')
  })
})

describe('buildCharacterPresentation', () => {
  const base = {
    directionStatus: 'CRITICO' as OperationalIntegrityStatus,
    orientation: 'LEFT' as const,
  }

  it('en reposo es IDLE y frontal', () => {
    expect(
      buildCharacterPresentation({ ...base, hovering: false, selecting: false }),
    ).toEqual({
      status: 'CRITICO',
      orientation: 'NEUTRAL',
      interaction: 'IDLE',
    })
  })

  it('el hover pasa a HOVER y adopta la orientación de la carta', () => {
    expect(
      buildCharacterPresentation({ ...base, hovering: true, selecting: false }),
    ).toEqual({
      status: 'CRITICO',
      orientation: 'LEFT',
      interaction: 'HOVER',
    })
  })

  it('la selección pasa a SELECTED y manda sobre el hover', () => {
    expect(
      buildCharacterPresentation({
        ...base,
        orientation: 'RIGHT',
        hovering: true,
        selecting: true,
      }),
    ).toEqual({
      status: 'CRITICO',
      orientation: 'RIGHT',
      interaction: 'SELECTED',
    })
  })

  it('sin selección el status es el de la Dirección', () => {
    for (const directionStatus of [
      'ESTABLE',
      'ALERTA',
      'CRITICO',
      'DESCONOCIDO',
    ] as OperationalIntegrityStatus[]) {
      for (const [hovering, selecting] of [
        [false, false],
        [true, false],
      ]) {
        expect(
          buildCharacterPresentation({
            directionStatus,
            selectedStatus: 'ESTABLE',
            orientation: 'LEFT',
            hovering,
            selecting,
          }).status,
        ).toBe(directionStatus)
      }
    }
  })

  it('con selección el status es el de la coordinación observada', () => {
    expect(
      buildCharacterPresentation({
        directionStatus: 'CRITICO',
        selectedStatus: 'ESTABLE',
        orientation: 'LEFT',
        hovering: false,
        selecting: true,
      }).status,
    ).toBe('ESTABLE')

    expect(
      buildCharacterPresentation({
        directionStatus: 'ESTABLE',
        selectedStatus: 'CRITICO',
        orientation: 'RIGHT',
        hovering: true,
        selecting: true,
      }).status,
    ).toBe('CRITICO')
  })

  it('el hover sobre una coordinación crítica no cambia el estado del personaje', () => {
    // Dirección ESTABLE + hover en una carta CRITICO: sin selección el
    // personaje sigue representando a la Dirección.
    const presentation = buildCharacterPresentation({
      directionStatus: 'ESTABLE',
      selectedStatus: 'CRITICO',
      orientation: 'RIGHT',
      hovering: true,
      selecting: false,
    })
    expect(presentation.status).toBe('ESTABLE')
    expect(presentation.interaction).toBe('HOVER')
  })
})
