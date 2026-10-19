import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  BACK_TO_DIRECTION_LABEL,
  OperationalBreadcrumb,
} from '@/modules/operational-cards/components/OperationalBreadcrumb'

/**
 * Se renderiza con `react-dom/server`, como el resto del módulo: aquí se
 * comprueba la FORMA del único retorno de la baraja; el recorrido real (pulsar
 * y volver a la mesa) lo cubren los e2e de selección y responsive.
 */
describe('OperationalBreadcrumb', () => {
  const html = renderToStaticMarkup(
    <OperationalBreadcrumb
      coordinationName="Especializaciones"
      onBackToDirection={() => undefined}
    />,
  )

  it('el retorno es un botón de verdad, no un enlace ni un div pulsable', () => {
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('data-testid="breadcrumb-direction"')
    expect(html).not.toContain('<a ')
  })

  it('es solo una flecha: sin etiqueta visible, con nombre accesible', () => {
    expect(html).toContain(`aria-label="${BACK_TO_DIRECTION_LABEL}"`)
    const button = html.slice(html.indexOf('<button'), html.indexOf('</button>'))
    // Ningún texto visible dentro del botón; el icono no se anuncia.
    expect(button.replace(/<[^>]+>/g, '').trim()).toBe('')
    expect(button).toContain('aria-hidden="true"')
  })

  it('conserva la coordinación actual como ubicación', () => {
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('Especializaciones')
  })
})
