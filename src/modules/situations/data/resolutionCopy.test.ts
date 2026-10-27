import { describe, expect, it } from 'vitest'
import { resolveResolutionCopy } from '@/modules/situations/data/resolutionCopy'
import { assertResolutionLearning } from '@/modules/situations/data/assertResolutionLearning'

describe('resolutionCopy', () => {
  it('INTERNAL pide solución, procesos afectados y prevención en un solo aprendizaje', () => {
    const interno = resolveResolutionCopy('INTERNAL')
    expect(interno.fieldLabel).toBe('Aprendizaje del cierre')
    expect(interno.submitLabel).toBe('Cerrar problema')
    expect(interno.fieldLabel.toLowerCase()).not.toContain('solución')
    expect(interno.fieldHelp.toLowerCase()).toContain('solucionarlo')
    expect(interno.fieldHelp.toLowerCase()).toContain('procesos')
    expect(interno.fieldHelp.toLowerCase()).toContain('evitar')
    expect(interno.blockHint.toLowerCase()).toContain('único')
    expect(interno.placeholder.toLowerCase()).toContain('notas')
  })

  it('INTER adapta la ayuda a entrega o dependencia sin campos separados', () => {
    const inter = resolveResolutionCopy('INTER_COORDINATION')
    expect(inter.fieldLabel).toBe('Aprendizaje del cierre')
    expect(inter.fieldHelp.toLowerCase()).toContain('solucionarlo')
    expect(inter.fieldHelp.toLowerCase()).toMatch(/entrega|dependencia/)
    expect(inter.fieldHelp.toLowerCase()).toContain('evitar')
    expect(inter.blockHint.toLowerCase()).toContain('único')
  })
})

describe('assertResolutionLearning', () => {
  it('rechaza vacío o solo espacios', () => {
    expect(() => assertResolutionLearning('')).toThrow()
    expect(() => assertResolutionLearning('   ')).toThrow()
  })

  it('recorta y acepta texto válido', () => {
    expect(assertResolutionLearning('  Lección  ')).toBe('Lección')
  })
})
