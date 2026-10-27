import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { agingFixture } from '@/modules/operational-cards/charts/antiguedad.fixture'
import { DirectorAntiguedad } from '@/modules/operational-cards/experience/director/DirectorAntiguedad'

const render = (props: Parameters<typeof DirectorAntiguedad>[0]) =>
  renderToStaticMarkup(<DirectorAntiguedad {...props} />)

const count = (html: string, needle: string) => html.split(needle).length - 1

describe('DirectorAntiguedad · lámina', () => {
  it('cabecera común ANTIGÜEDAD + un solo corte HOY; ranking | distribución lado a lado', () => {
    const html = render({
      aging: agingFixture({ at: '2026-10-07', isNow: true }),
      loading: false,
      error: null,
    })
    // Scope COORDINATION: sin etiqueta «Dirección» ni responsable repetido por fila.
    expect(html).toMatch(/<h3 class="director-antiguedad__eyebrow">Antigüedad<\/h3>/)
    expect(html).not.toContain('director-antiguedad-scope')
    expect(html).not.toMatch(/Dirección/)
    expect(html).not.toContain('director-antiguedad-responsible-')
    expect(count(html, 'data-testid="director-antiguedad-cut"')).toBe(1)
    expect(html).toMatch(/data-now="true"[^>]*>HOY</)
    // Orden del par: ranking a la izquierda, distribución a la derecha.
    const ranking = html.indexOf('data-testid="director-antiguedad-ranking"')
    const distribucion = html.indexOf('data-testid="director-antiguedad-distribucion"')
    expect(ranking).toBeGreaterThan(-1)
    expect(distribucion).toBeGreaterThan(ranking)
    expect(html).toContain('Problemas más antiguos')
    expect(html).toContain('Antigüedad de la carga')
    expect(html).toContain('data-testid="director-antiguedad-chart"')
    expect(html).toContain('data-testid="director-distribucion-chart"')
    expect(html).not.toMatch(/más críticos/i)
    // Sin «Máximo 63 días»: la primera fila del ranking ya lo dice.
    expect(html).not.toMatch(/Máximo/i)
  })

  it('ayudas: registro en NOVEX, no ocurrencia', () => {
    const html = render({
      aging: agingFixture({ at: '2026-10-07', isNow: true }),
      loading: false,
      error: null,
    })
    expect(html).toContain(
      'Problemas de la coordinación seleccionada que seguían activos al corte, ordenados por días desde su registro en NOVEX.',
    )
    expect(html).toContain('no desde la fecha en que ocurrió')
    expect(html).toContain('Toda la carga activa de la coordinación al mismo corte')
  })

  it('histórico: «AL CIERRE DEL …» una sola vez para las dos gráficas', () => {
    const html = render({
      aging: agingFixture({ at: '2026-09-30', isNow: false }),
      loading: false,
      error: null,
    })
    expect(count(html, 'AL CIERRE DEL 30 SEP 2026')).toBe(1)
    expect(html).toContain('data-cut="historical"')
  })

  it('ranking: top 5 en orden en la tabla accesible, sin la sexta fila', () => {
    const html = render({
      aging: agingFixture({ at: '2026-10-07', isNow: true }),
      loading: false,
      error: null,
    })
    const rows = [
      ...html.matchAll(
        /data-testid="director-antiguedad-row-[^"]+"><th scope="row">([^<]+)<\/th><td>([^<]+)</g,
      ),
    ].map((match) => [match[1], match[2]])
    expect(rows).toEqual([
      ['Falla en matrícula de nuevos ingresos', '63 d'],
      ['Entrega de actas pendiente para Saber Pro', '43 d'],
      ['Intermitencia en el aula virtual de posgrado', '31 d'],
      ['Convenio empresarial sin firma', '18 d'],
      ['Reporte de notas incompleto', '9 d'],
    ])
    expect(html).not.toContain('Equipos de laboratorio sin mantenimiento')
    expect(html).toContain('Interno · Sin categoría')
    expect(html).toContain('Compromiso · afecta a Saber Pro')
  })

  it('distribución: las cuatro bandas con count y porcentaje (tabla sr-only)', () => {
    const html = render({
      aging: agingFixture({ at: '2026-10-07', isNow: true }),
      loading: false,
      error: null,
    })
    const rows = [
      ...html.matchAll(
        /data-testid="director-distribucion-row-[^"]+"><th scope="row">([^<]+)<\/th><td>(\d+)<\/td><td>([^<]+)</g,
      ),
    ].map((match) => [match[1], Number(match[2]), match[3]])
    expect(rows).toEqual([
      ['0–7 días', 2, '29 %'],
      ['8–14 días', 1, '14 %'],
      ['15–30 días', 1, '14 %'],
      ['31+ días', 3, '43 %'],
    ])
    expect(rows.reduce((sum, row) => sum + Number(row[1]), 0)).toBe(7)
    expect(html).toContain('7 activos en total')
  })

  it('mediana discreta bajo el título de la distribución', () => {
    const html = render({
      aging: agingFixture({ at: '2026-10-07', isNow: true }),
      loading: false,
      error: null,
    })
    expect(html).toMatch(/data-testid="director-antiguedad-median">Mediana · 18 días</)
  })

  it('«+ N activos fuera del Top 5» solo con más de 5', () => {
    const html = render({
      aging: agingFixture({ at: '2026-10-07', isNow: true, activeCount: 7 }),
      loading: false,
      error: null,
    })
    expect(html).toContain('+ 2 activos fuera del Top 5')
    expect(html).not.toContain('adicional')
    const exact = render({
      aging: agingFixture({ at: '2026-10-07', isNow: true, activeCount: 5 }),
      loading: false,
      error: null,
    })
    expect(exact).not.toContain('director-antiguedad-more')
  })

  it('menos de 5: el ranking muestra solo los existentes (sin huecos reservados)', () => {
    const html = render({
      aging: agingFixture({ at: '2026-10-07', isNow: true, activeCount: 2 }),
      loading: false,
      error: null,
    })
    expect(count(html, 'data-testid="director-antiguedad-row-')).toBe(2)
    expect(html).toContain('--aging-rows:2')
    expect(html).toContain('Top 2')
    // La distribución sigue con sus cuatro rangos.
    expect(count(html, 'data-testid="director-distribucion-row-')).toBe(4)
  })

  it('0 activos: una sola lectura para la lámina, sin barras vacías', () => {
    const html = render({
      aging: agingFixture({ at: '2026-10-07', isNow: true, activeCount: 0 }),
      loading: false,
      error: null,
    })
    expect(html).toContain('Sin problemas activos en este corte')
    expect(html).toContain('data-empty="true"')
    expect(html).not.toContain('director-antiguedad-chart')
    expect(html).not.toContain('director-distribucion-chart')
    expect(html).not.toContain('director-distribucion-row-')
    expect(html).not.toContain('Mediana')
    // El corte sigue visible: «sin activos HOY» es información.
    expect(html).toContain('data-testid="director-antiguedad-cut"')
  })

  it('cargando y error', () => {
    expect(render({ aging: null, loading: true, error: null })).toContain('Leyendo antigüedad…')
    expect(render({ aging: null, loading: false, error: 'boom' })).toContain(
      'No se pudo leer la antigüedad. boom',
    )
  })
})
