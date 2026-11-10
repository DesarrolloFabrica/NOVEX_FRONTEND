import { describe, expect, it } from 'vitest'
import {
  LEGACY_EXECUTIVE_SECTION_REDIRECTS,
  LEGACY_PLATFORM_REDIRECTS,
} from '@/app/legacyOperationalRedirects'
import { EXECUTIVE_OPERATIONS_HOME } from '@/modules/executive-operations-center'

describe('legacyOperationalRedirects FE-04', () => {
  it('lista secciones ejecutivas fuera del layout (sin hijas del provider)', () => {
    expect(LEGACY_EXECUTIVE_SECTION_REDIRECTS).toEqual([
      `${EXECUTIVE_OPERATIONS_HOME}/panorama`,
      `${EXECUTIVE_OPERATIONS_HOME}/inteligencia`,
      `${EXECUTIVE_OPERATIONS_HOME}/reportes`,
    ])
    for (const path of LEGACY_EXECUTIVE_SECTION_REDIRECTS) {
      expect(path.startsWith(`${EXECUTIVE_OPERATIONS_HOME}/`)).toBe(true)
      expect(path.includes('situations')).toBe(false)
    }
  })

  it('conserva marcadores de plataforma legados', () => {
    expect(LEGACY_PLATFORM_REDIRECTS).toContain('/dashboard')
    expect(LEGACY_PLATFORM_REDIRECTS).toContain('/intelligence')
    expect(LEGACY_PLATFORM_REDIRECTS).toContain('/situaciones')
  })
})
