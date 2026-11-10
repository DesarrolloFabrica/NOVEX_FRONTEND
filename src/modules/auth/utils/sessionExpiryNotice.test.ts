// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumeSessionExpiryNotice,
  markSessionExpired,
  readSessionExpiryNotice,
  sanitizeReturnPath,
} from '@/modules/auth/utils/sessionExpiryNotice'

describe('sessionExpiryNotice', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('registra caducidad con ruta de retorno y usuario', () => {
    markSessionExpired({
      reason: 'expired',
      returnPath: '/centro-operacional',
      userId: 'user-1',
    })
    const notice = readSessionExpiryNotice()
    expect(notice?.userId).toBe('user-1')
    expect(notice?.returnPath).toBe('/centro-operacional')
    expect(consumeSessionExpiryNotice()?.reason).toBe('expired')
    expect(readSessionExpiryNotice()).toBeNull()
  })

  it('rechaza rutas de retorno inseguras', () => {
    expect(sanitizeReturnPath('https://evil.example')).toBeNull()
    expect(sanitizeReturnPath('//evil')).toBeNull()
    expect(sanitizeReturnPath('/login')).toBeNull()
    expect(sanitizeReturnPath('/centro-operacional?x=1')).toBe(
      '/centro-operacional?x=1',
    )
  })
})
