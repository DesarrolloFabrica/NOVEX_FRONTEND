import { expect, type Page } from 'playwright/test'

/**
 * ESTADO (DIRECTOR, con coordinación) es una LECTURA CONTINUA: pestañas y
 * filtros fijos arriba y, debajo, una sola columna de módulos que se recorre
 * con el scroll de `director-reading-body`. Helpers comunes de los QA de
 * Flujo, Antigüedad y Resolución.
 */

const tid = (page: Page, id: string) => page.getByTestId(id)

/**
 * El cuerpo de la lectura es la ÚNICA zona desplazable: sin carrusel, sin
 * scroll propio en ningún módulo y con la cabecera (tabs + filtros) fuera.
 */
export async function expectSingleScrollZone(page: Page) {
  await expect(tid(page, 'director-estado-carousel')).toHaveCount(0)
  await expect(tid(page, 'director-estado-lectura')).toBeVisible()
  const probe = await tid(page, 'director-reading-body').evaluate((body) => {
    const inner = Array.from(
      body.querySelectorAll<HTMLElement>('[data-testid="director-estado-lectura"] *'),
    ).filter((el) => {
      const style = getComputedStyle(el)
      return /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1
    })
    const header = body.parentElement?.querySelector('.director-reading__header')
    return {
      overflowY: getComputedStyle(body).overflowY,
      innerScrollers: inner.map((el) => el.className),
      headerInsideBody: header ? body.contains(header) : true,
      pageScrolls: document.scrollingElement
        ? document.scrollingElement.scrollHeight > window.innerHeight + 1
        : false,
    }
  })
  expect(probe.overflowY).toBe('auto')
  expect(probe.innerScrollers).toEqual([])
  expect(probe.headerInsideBody).toBe(false)
  // Recorrer los indicadores nunca desplaza la página entera.
  expect(probe.pageScrolls).toBe(false)
}

/** Desplaza el cuerpo hasta el módulo y comprueba que queda ENTERO a la vista. */
export async function scrollToModule(page: Page, testId: string) {
  const module = tid(page, testId)
  await module.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  const fit = await module.evaluate((node) => {
    const body = node.closest('[data-testid="director-reading-body"]')!
    const b = body.getBoundingClientRect()
    const m = node.getBoundingClientRect()
    return { top: m.top - b.top, bottom: b.bottom - m.bottom, height: m.height, bodyHeight: b.height }
  })
  // Un módulo más alto que la zona no puede caber entero: basta que arranque dentro.
  if (fit.height <= fit.bodyHeight) {
    expect(fit.top).toBeGreaterThanOrEqual(-1)
    expect(fit.bottom).toBeGreaterThanOrEqual(-1)
  } else {
    expect(fit.top).toBeLessThanOrEqual(1)
  }
}

/**
 * Dos módulos de un mismo grupo, APILADOS y a todo el ancho de la lectura
 * (nunca lado a lado), cada gráfica con alto suficiente para sus etiquetas.
 */
export async function expectStackedFullWidth(
  page: Page,
  upperId: string,
  lowerId: string,
  chartIds: readonly string[],
  minChartHeight = 100,
) {
  const upper = await tid(page, upperId).boundingBox()
  const lower = await tid(page, lowerId).boundingBox()
  const lectura = await tid(page, 'director-estado-lectura').boundingBox()
  expect(upper && lower && lectura).toBeTruthy()
  expect(lower!.y).toBeGreaterThanOrEqual(upper!.y + upper!.height - 1)
  expect(Math.abs(lower!.x - upper!.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(lower!.width - upper!.width)).toBeLessThanOrEqual(2)
  expect(upper!.width).toBeGreaterThanOrEqual(lectura!.width - 4)
  for (const id of chartIds) {
    await scrollToModule(page, id)
    const box = await tid(page, id).boundingBox()
    expect(box!.height).toBeGreaterThan(minChartHeight)
  }
}
