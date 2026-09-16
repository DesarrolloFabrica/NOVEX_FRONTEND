import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CHARACTER_MOOD,
  mapCoordinationStatusToCharacterMood,
  resolveCharacterMood,
  type CharacterMood,
} from '@/modules/operational-cards/data/characterMood'
import { OPERATIONAL_INTEGRITY_STATUSES } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Funciones puras: se prueban sin navegador, sin canvas y sin runtime de Rive.
 * Lo que se verifica es la REGLA DE PRODUCTO, no el dibujo.
 */

describe('mapCoordinationStatusToCharacterMood', () => {
  it('una coordinación estable pone al personaje contento', () => {
    expect(mapCoordinationStatusToCharacterMood('ESTABLE')).toBe('happy_2')
  })

  it('una coordinación en alerta lo deja neutral', () => {
    expect(mapCoordinationStatusToCharacterMood('ALERTA')).toBe('neutral')
  })

  it('una coordinación crítica lo pone triste', () => {
    expect(mapCoordinationStatusToCharacterMood('CRITICO')).toBe('sad_2')
  })

  it('DESCONOCIDO no se presenta como calma ni como avería: queda neutral', () => {
    // El enum del .riv tiene un valor `unknown`, pero esta fase no lo usa.
    expect(mapCoordinationStatusToCharacterMood('DESCONOCIDO')).toBe('neutral')
  })

  it('cubre todos los estados del vocabulario, sin huecos', () => {
    // Si el backend añadiera un estado, este test lo detecta antes que el canvas.
    for (const status of OPERATIONAL_INTEGRITY_STATUSES) {
      expect(mapCoordinationStatusToCharacterMood(status)).toBeDefined()
    }
  })

  it('no usa las intensidades reservadas a reacciones momentáneas', () => {
    const reserved: CharacterMood[] = ['happy_1', 'sad_1']
    for (const status of OPERATIONAL_INTEGRITY_STATUSES) {
      expect(reserved).not.toContain(
        mapCoordinationStatusToCharacterMood(status),
      )
    }
  })
})

describe('resolveCharacterMood', () => {
  it('sin coordinación observada, reposo', () => {
    expect(resolveCharacterMood({ selectedCoordination: null })).toBe('neutral')
    expect(DEFAULT_CHARACTER_MOOD).toBe('neutral')
  })

  it('con coordinación observada, la expresión es la de ESA coordinación', () => {
    expect(
      resolveCharacterMood({ selectedCoordination: { status: 'ESTABLE' } }),
    ).toBe('happy_2')
    expect(
      resolveCharacterMood({ selectedCoordination: { status: 'ALERTA' } }),
    ).toBe('neutral')
    expect(
      resolveCharacterMood({ selectedCoordination: { status: 'CRITICO' } }),
    ).toBe('sad_2')
  })

  it('la expresión NO sale del estado institucional de la Dirección', () => {
    // Regla de producto de esta fase: la cara acompaña a lo observado. Una
    // coordinación estable deja al personaje contento aunque la Dirección
    // entera esté crítica, porque son dos lecturas distintas de la escena.
    expect(
      resolveCharacterMood({ selectedCoordination: { status: 'ESTABLE' } }),
    ).toBe('happy_2')
  })
})
