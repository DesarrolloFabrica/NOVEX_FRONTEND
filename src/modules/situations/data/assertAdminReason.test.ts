import { describe, expect, it } from 'vitest'
import {
  AdminReasonValidationError,
  assertAdminReason,
  SITUATION_ADMIN_REASON_MAX_LENGTH,
  SITUATION_ADMIN_REASON_MIN_LENGTH,
} from '@/modules/situations/data/assertAdminReason'

describe('assertAdminReason', () => {
  it('recorta espacios y acepta la longitud mínima', () => {
    const reason = `  ${'a'.repeat(SITUATION_ADMIN_REASON_MIN_LENGTH)}  `
    expect(assertAdminReason(reason)).toBe(
      'a'.repeat(SITUATION_ADMIN_REASON_MIN_LENGTH),
    )
  })

  it('rechaza motivos demasiado cortos tras recortar', () => {
    expect(() => assertAdminReason('  corto  ')).toThrow(
      AdminReasonValidationError,
    )
    expect(() => assertAdminReason('  corto  ')).toThrow(/al menos 10/)
  })

  it('rechaza motivos demasiado largos', () => {
    const tooLong = 'x'.repeat(SITUATION_ADMIN_REASON_MAX_LENGTH + 1)
    expect(() => assertAdminReason(tooLong)).toThrow(/no puede superar/)
  })

  it('acepta exactamente el máximo', () => {
    const max = 'y'.repeat(SITUATION_ADMIN_REASON_MAX_LENGTH)
    expect(assertAdminReason(max)).toBe(max)
  })
})
