import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TableReturnAction } from '@/modules/operational-cards/components/TableReturnAction'

/**
 * Se renderiza con `react-dom/server`, como el resto del módulo: no hay jsdom,
 * así que aquí se comprueba la FORMA del control —que sea un botón de verdad,
 * con nombre accesible y sin duplicarlo en el icono— y el recorrido real
 * (pulsar y volver al estado global) lo comprueba el e2e de composición.
 */

describe('TableReturnAction', () => {
  it('es un botón de verdad, no un enlace ni un div pulsable', () => {
    const html = renderToStaticMarkup(
      <TableReturnAction label="Volver a la mesa" onReturn={() => undefined} />,
    )

    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('data-testid="return-to-table"')
    expect(html).not.toContain('<a ')
  })

  it('su nombre accesible es el texto, y el icono no lo repite', () => {
    const html = renderToStaticMarkup(
      <TableReturnAction label="Volver a la mesa" onReturn={() => undefined} />,
    )

    expect(html).toContain('Volver a la mesa')
    // El SVG es decorativo: si se anunciara, el botón tendría dos nombres.
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('aria-label')
  })

  it('la etiqueta la decide quien lo usa', () => {
    // El mazo tendrá su propio retorno —«Recoger mazo»— sobre este mismo
    // control: el texto es un dato, no está incrustado en el componente.
    const html = renderToStaticMarkup(
      <TableReturnAction label="Recoger mazo" onReturn={() => undefined} />,
    )

    expect(html).toContain('Recoger mazo')
    expect(html).not.toContain('Volver a la mesa')
  })
})
