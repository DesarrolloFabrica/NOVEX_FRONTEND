import { describe, expect, it } from 'vitest'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { findLatestSituationCreatedByUser } from './onboardingSituationRecovery'

function situation(
  id: string,
  createdByUserId: string,
  createdAt: string,
): SituationResponse {
  return {
    id,
    title: 'Situación de prueba',
    description: 'Contexto suficiente para la prueba.',
    coordinationId: 'coordination-id',
    coordinationCode: 'coordination-code',
    coordinationName: 'Coordinación',
    createdByUserId,
    createdByUserName: 'Usuario',
    categoryId: 'category-id',
    categoryCode: 'category-code',
    categoryName: 'Categoría',
    severity: 'MEDIUM',
    status: 'REGISTERED',
    occurredAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  }
}

describe('findLatestSituationCreatedByUser', () => {
  it('recupera el expediente más reciente creado por el usuario', () => {
    const expected = situation(
      '03f54b4d-4b67-4e80-a607-af39f4ca8b36',
      'current-user',
      '2026-08-04T19:30:00.000Z',
    )

    const result = findLatestSituationCreatedByUser(
      [
        situation(
          '843c7bca-d14c-468f-a358-54c06a155585',
          'current-user',
          '2026-08-04T18:30:00.000Z',
        ),
        expected,
        situation(
          '2ab7254e-2df5-445e-813a-87df79e197b7',
          'another-user',
          '2026-08-04T20:30:00.000Z',
        ),
      ],
      'current-user',
    )

    expect(result).toBe(expected)
  })

  it('no recupera expedientes de otro usuario ni identificadores inválidos', () => {
    const result = findLatestSituationCreatedByUser(
      [
        situation('not-a-uuid', 'current-user', '2026-08-04T19:30:00.000Z'),
        situation(
          '2ab7254e-2df5-445e-813a-87df79e197b7',
          'another-user',
          '2026-08-04T20:30:00.000Z',
        ),
      ],
      'current-user',
    )

    expect(result).toBeNull()
  })
})
