import { describe, expect, it } from 'vitest'
import { composeMissingNotice, DEFAULT_MISSING_NOTICE } from './tourCopy'

describe('composeMissingNotice', () => {
  it('no duplica la puntuación cuando el aviso ya termina en punto', () => {
    const text = composeMissingNotice('El acceso al historial no está visible en este momento.', true)
    expect(text).toBe(
      'El acceso al historial no está visible en este momento. Si lo prefiere, continúe sin este paso. El recorrido no avanzará hasta que usted lo decida.',
    )
    expect(text).not.toMatch(/\.\s*[,.]/)
  })

  it('cierra con punto un aviso que no lo trae', () => {
    expect(composeMissingNotice('Elija uno y pulse «Reintentar»', false)).toBe(
      'Elija uno y pulse «Reintentar». El recorrido no avanzará hasta que usted lo decida.',
    )
  })

  it('un paso obligatorio no ofrece continuar sin él', () => {
    expect(composeMissingNotice('Falta algo.', false)).not.toContain('continúe sin este paso')
  })

  it('sin aviso propio usa el texto por defecto', () => {
    const text = composeMissingNotice(undefined, false)
    expect(text.startsWith(DEFAULT_MISSING_NOTICE)).toBe(true)
    expect(text).not.toMatch(/\.\./)
  })
})
