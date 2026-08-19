import { describe, expect, it } from 'vitest'
import { resolveIncidentCategoryIcon } from '@/modules/situations/data/incident-category-visual'

describe('resolveIncidentCategoryIcon', () => {
  it('usa el icono del catálogo cuando es conocido', () => {
    expect(resolveIncidentCategoryIcon('X', 'Y', 'zoho')).toBe('zoho')
  })

  it('mapea códigos institucionales y códigos históricos', () => {
    expect(resolveIncidentCategoryIcon('INTERNET', 'Internet')).toBe('internet')
    expect(resolveIncidentCategoryIcon('TECH_DEGRADATION', '')).toBe('apps')
    expect(resolveIncidentCategoryIcon('ACADEMIC_INCONSISTENCY', '')).toBe(
      'diplomas',
    )
  })
})
