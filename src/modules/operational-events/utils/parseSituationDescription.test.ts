import { describe, expect, it } from 'vitest'
import { splitSituationDescription } from '@/modules/operational-events/utils/parseSituationDescription'

describe('parseSituationDescription', () => {
  it('separa la narrativa del contexto embebido', () => {
    const description = [
      'Caída del sistema de matrículas.',
      '',
      '---',
      'Contexto reportado por el usuario:',
      'Detección: Sistema',
      'Afectados percibidos: Estudiantes',
    ].join('\n')

    const parsed = splitSituationDescription(description)

    expect(parsed.narrative).toBe('Caída del sistema de matrículas.')
    expect(parsed.reportedContext).toContain('Detección: Sistema')
  })
})
