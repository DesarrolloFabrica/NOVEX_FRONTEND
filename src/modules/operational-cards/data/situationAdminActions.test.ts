import { describe, expect, it } from 'vitest'
import { resolveSituationAdminActionAvailability } from '@/modules/operational-cards/data/situationAdminActions'

describe('resolveSituationAdminActionAvailability', () => {
  it('solo ofrece acciones cuando el backend marca las pistas', () => {
    expect(
      resolveSituationAdminActionAvailability({
        status: 'OPEN',
        canCancel: true,
        canTransfer: true,
      }),
    ).toEqual({ canCancel: true, canTransfer: true })

    expect(
      resolveSituationAdminActionAvailability({
        status: 'OPEN',
        canCancel: false,
        canTransfer: false,
      }),
    ).toEqual({ canCancel: false, canTransfer: false })
  })

  it('oculta acciones en CLOSED o CANCELLED aunque lleguen pistas', () => {
    expect(
      resolveSituationAdminActionAvailability({
        status: 'CLOSED',
        canCancel: true,
        canTransfer: true,
      }),
    ).toEqual({ canCancel: false, canTransfer: false })

    expect(
      resolveSituationAdminActionAvailability({
        status: 'CANCELLED',
        canCancel: true,
        canTransfer: true,
      }),
    ).toEqual({ canCancel: false, canTransfer: false })
  })
})
