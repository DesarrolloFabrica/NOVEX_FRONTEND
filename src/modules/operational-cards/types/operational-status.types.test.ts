import { describe, expect, it } from 'vitest'
import {
  OPERATIONAL_INTEGRITY_STATUSES,
  isOperationalIntegrityStatus,
  parseOperationalIntegrityStatus,
} from '@/modules/operational-cards/types/operational-status.types'

describe('operational-status contract', () => {
  it('declara el vocabulario del dominio backend, sin añadidos', () => {
    expect(OPERATIONAL_INTEGRITY_STATUSES).toEqual([
      'ESTABLE',
      'ALERTA',
      'CRITICO',
      'DESCONOCIDO',
    ])
  })

  it('reconoce los cuatro estados válidos', () => {
    for (const status of OPERATIONAL_INTEGRITY_STATUSES) {
      expect(isOperationalIntegrityStatus(status)).toBe(true)
      expect(parseOperationalIntegrityStatus(status)).toBe(status)
    }
  })

  it('rechaza vocabulario ajeno al contrato', () => {
    expect(isOperationalIntegrityStatus('stable')).toBe(false)
    expect(isOperationalIntegrityStatus('CRÍTICO')).toBe(false)
    expect(isOperationalIntegrityStatus('attention')).toBe(false)
    expect(isOperationalIntegrityStatus(0)).toBe(false)
  })

  it('un valor no reconocido degrada a DESCONOCIDO, nunca a ESTABLE', () => {
    for (const value of [null, undefined, '', 'stable', 'critical', 42, {}]) {
      expect(parseOperationalIntegrityStatus(value)).toBe('DESCONOCIDO')
    }
  })
})
