import { describe, expect, it } from 'vitest'
import {
  resolveCharacterCoordination,
  resolveCharacterLives,
} from '@/modules/operational-cards/data/characterLivesSource'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

type Row = Pick<CoordinationOverview, 'code' | 'lifePoints'>

const B2B: Row = { code: 'coord-b2b', lifePoints: 3 }
const NEGOCIOS: Row = { code: 'coord-negocios', lifePoints: null }
const SABER_PRO: Row = { code: 'coord-saber-pro', lifePoints: 4 }

describe('resolveCharacterCoordination · COORDINADOR', () => {
  it('representa SIEMPRE su coordinación asignada', () => {
    expect(
      resolveCharacterCoordination({
        isCoordinator: true,
        assignedCoordination: B2B,
        selectedCoordination: B2B,
      }),
    ).toBe(B2B)
  })

  it('aunque la selección apunte a otra coordinación o a ninguna', () => {
    for (const selected of [NEGOCIOS, SABER_PRO, null]) {
      expect(
        resolveCharacterCoordination({
          isCoordinator: true,
          assignedCoordination: B2B,
          selectedCoordination: selected,
        }),
      ).toBe(B2B)
    }
  })

  it('sin asignación válida no representa ninguna (ni cae a la selección)', () => {
    expect(
      resolveCharacterCoordination({
        isCoordinator: true,
        assignedCoordination: null,
        selectedCoordination: SABER_PRO,
      }),
    ).toBeNull()
  })

  it('sus vidas salen de assignedCoordination.lifePoints', () => {
    const lives = resolveCharacterLives(
      resolveCharacterCoordination({
        isCoordinator: true,
        assignedCoordination: B2B,
        selectedCoordination: NEGOCIOS,
      }),
    )
    expect(lives).toEqual({
      showLives: true,
      lifePoints: 3,
      ownerKey: 'coord-b2b',
    })
  })
})

describe('resolveCharacterCoordination · ADMIN / DIRECTOR / ANALISTA', () => {
  it('representa la coordinación seleccionada, o ninguna', () => {
    expect(
      resolveCharacterCoordination({
        isCoordinator: false,
        assignedCoordination: B2B,
        selectedCoordination: SABER_PRO,
      }),
    ).toBe(SABER_PRO)
    expect(
      resolveCharacterCoordination({
        isCoordinator: false,
        assignedCoordination: B2B,
        selectedCoordination: null,
      }),
    ).toBeNull()
  })
})

describe('resolveCharacterLives', () => {
  it('sin coordinación representada → vidas ocultas', () => {
    expect(resolveCharacterLives(null)).toEqual({
      showLives: false,
      lifePoints: null,
      ownerKey: null,
    })
  })

  it('con coordinación → visibles con sus puntos, sin recalcular', () => {
    for (const lifePoints of [10, 7, 0]) {
      expect(
        resolveCharacterLives({ code: 'coord-saber-pro', lifePoints }),
      ).toEqual({
        showLives: true,
        lifePoints,
        ownerKey: 'coord-saber-pro',
      })
    }
  })

  it('con coordinación y lifePoints null → visibles (UNKNOWN), no ocultas', () => {
    expect(resolveCharacterLives(NEGOCIOS)).toEqual({
      showLives: true,
      lifePoints: null,
      ownerKey: 'coord-negocios',
    })
  })

  it('el dueño de las vidas es la coordinación representada', () => {
    expect(resolveCharacterLives(B2B).ownerKey).toBe('coord-b2b')
    expect(resolveCharacterLives(SABER_PRO).ownerKey).toBe('coord-saber-pro')
  })
})
