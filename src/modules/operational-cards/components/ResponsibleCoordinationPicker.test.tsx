import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  buildResponsibleSelectionSummary,
  filterResponsibleOptions,
  findResponsibleOption,
  isResponsibleSelectionValid,
  type ResponsiblePickerOption,
} from '@/modules/operational-cards/data/responsibleCoordinationPicker'
import { ResponsibleCoordinationPicker } from '@/modules/operational-cards/components/ResponsibleCoordinationPicker'

const OPTIONS: ResponsiblePickerOption[] = [
  { id: 'uuid-fab', label: 'Fábrica de Contenidos', code: 'coord-fabrica-contenidos' },
  { id: 'uuid-neg', label: 'Negocios', code: 'coord-negocios' },
  { id: 'uuid-b2b', label: 'B2B', code: 'coord-b2b' },
]

describe('responsibleCoordinationPicker helpers', () => {
  it('filtra por nombre sin distinguir mayúsculas', () => {
    expect(filterResponsibleOptions(OPTIONS, 'fábr')).toEqual([OPTIONS[0]])
    expect(filterResponsibleOptions(OPTIONS, 'NEGO')).toEqual([OPTIONS[1]])
    expect(filterResponsibleOptions(OPTIONS, '')).toHaveLength(3)
  })

  it('declara vacío cuando no hay coincidencias', () => {
    expect(filterResponsibleOptions(OPTIONS, 'zzz')).toEqual([])
  })

  it('valida selección frente a opciones disponibles', () => {
    expect(isResponsibleSelectionValid('', OPTIONS)).toBe(true)
    expect(isResponsibleSelectionValid('uuid-fab', OPTIONS)).toBe(true)
    expect(isResponsibleSelectionValid('uuid-gone', OPTIONS)).toBe(false)
  })

  it('excluye implícitamente: la afectada no está en el catálogo pasado', () => {
    const withoutAffected = OPTIONS.filter((row) => row.code !== 'coord-b2b')
    expect(withoutAffected.map((row) => row.code)).not.toContain('coord-b2b')
    expect(findResponsibleOption(withoutAffected, 'uuid-b2b')).toBeNull()
  })

  it('arma la confirmación afectada → responsable', () => {
    expect(buildResponsibleSelectionSummary('B2B', 'Saber Pro')).toBe(
      'Afectada: B2B → Responsable: Saber Pro',
    )
  })
})

describe('ResponsibleCoordinationPicker (marcado estático)', () => {
  it('sin valor muestra el disparador de elección', () => {
    const html = renderToStaticMarkup(
      <ResponsibleCoordinationPicker
        options={OPTIONS}
        value=""
        affectedLabel="B2B"
        onChange={() => {}}
      />,
    )
    expect(html).toContain('data-testid="report-responsible-trigger"')
    expect(html).toContain('Elegir coordinación responsable')
    expect(html).not.toContain('data-testid="report-responsible-summary"')
  })

  it('con valor muestra confirmación y Cambiar coordinación', () => {
    const html = renderToStaticMarkup(
      <ResponsibleCoordinationPicker
        options={OPTIONS}
        value="uuid-fab"
        affectedLabel="B2B"
        onChange={() => {}}
      />,
    )
    expect(html).toContain('data-testid="report-responsible-summary"')
    expect(html).toContain('Afectada: B2B → Responsable: Fábrica de Contenidos')
    expect(html).toContain('data-testid="report-responsible-change"')
    expect(html).toContain('Cambiar coordinación')
    expect(html).toContain('data-testid="report-responsible-value"')
    expect(html).toContain('value="uuid-fab"')
    expect(html).toContain('data-mark-code="coord-fabrica-contenidos"')
  })
})
