import { expect, test, type Page } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installResponsiveCentro, ESPE, B2B } from './responsive-centro.fixture'

/**
 * QA de la franja de filtros temporales de la lectura de coordinación (DIRECTOR):
 * Ciclo · Mes · Semana sobre el MISMO AnalysisPeriod que flechas y gráficas.
 * Comprueba niveles, vuelta a «Todo el mes / Todo el ciclo», sincronía con el
 * drill-down, una consulta por cambio, futuros deshabilitados, error, carga,
 * coordinación/pestaña/lámina, teclado y redimensionado de ECharts.
 * Capturas en test-results/period-filters/ (no versionado).
 */
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'period-filters')

const SIZES = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

const tid = (page: Page, id: string) => page.getByTestId(id)

async function stateRequests(page: Page) {
  const seen: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.includes('/operational-kpis/state')) {
      seen.push(`${url.searchParams.get('kind')} ${url.searchParams.get('from')}`)
    }
  })
  return seen
}

async function settle(page: Page) {
  await page.waitForTimeout(900)
}

for (const size of SIZES) {
  test(`filtros temporales ${size.width}x${size.height}`, async ({ page }) => {
    test.setTimeout(300000)
    await page.setViewportSize(size)
    // Reloj fijo (lunes 19 oct 2026, Bogotá): «En curso» y los futuros no dependen del día.
    await page.clock.setFixedTime(new Date('2026-10-19T12:00:00-05:00'))
    await installResponsiveCentro(page, 'DIRECTOR')
    // Error inyectado (agosto) y respuesta lenta (julio) sobre el mock del fixture.
    await page.route('**/api/v1/operational-kpis/state**', async (route) => {
      const url = new URL(route.request().url())
      const from = url.searchParams.get('from')
      if (from === '2026-08-01' && url.searchParams.get('kind') === 'month') {
        await route.fulfill({ status: 500, json: { message: 'Fallo simulado' } })
        return
      }
      if (from === '2026-07-01' && url.searchParams.get('kind') === 'month') {
        await new Promise((resolve) => setTimeout(resolve, 2500))
      }
      await route.fallback()
    })
    const requests = await stateRequests(page)
    const tag = `${size.width}x${size.height}`
    mkdirSync(OUT, { recursive: true })
    await page.goto('/centro-operacional')
    await tid(page, 'shell-stage').locator(`[data-testid="coordination-card"][data-code="${ESPE}"]`).click({ timeout: 60000 })
    await expect(tid(page, 'director-flujo-chart')).toBeVisible({ timeout: 30000 })
    await settle(page)

    const root = tid(page, 'director-analysis-period')
    const cycle = tid(page, 'director-period-cycle')
    const month = tid(page, 'director-period-month')
    const week = tid(page, 'director-period-week')
    const range = tid(page, 'director-analysis-period-range')

    // 1. Nivel ciclo (periodo inicial conservado).
    await expect(root).toHaveAttribute('data-kind', 'cycle')
    await expect(cycle).toHaveValue('2026-2')
    await expect(month).toHaveValue('')
    await expect(week).toBeDisabled()
    await expect(week).toHaveAccessibleDescription('Elija un mes para filtrar por semana.')
    await expect(range).toHaveText('1 JUL — 31 DIC 2026')
    await expect(root).toContainText('En curso')
    await expect(tid(page, 'director-flujo-crumb')).toHaveCount(0)
    // Futuros deshabilitados: noviembre y diciembre de 2026.
    expect(await month.locator('option[value="10"]').evaluate((o) => (o as HTMLOptionElement).disabled)).toBe(true)
    expect(await month.locator('option[value="11"]').evaluate((o) => (o as HTMLOptionElement).disabled)).toBe(true)
    expect(await month.locator('option[value="9"]').evaluate((o) => (o as HTMLOptionElement).disabled)).toBe(false)
    await page.screenshot({ path: `${OUT}/${tag}-1-ciclo.png` })

    // 2. Mes concreto → vista mensual; una sola consulta nueva.
    let before = requests.length
    await month.selectOption('8')
    await expect(root).toHaveAttribute('data-kind', 'month')
    await expect(range).toHaveText('1 — 30 SEP 2026')
    await expect(week).toBeEnabled()
    await expect(week).toHaveValue('')
    await settle(page)
    expect(requests.slice(before)).toEqual(['month 2026-09-01'])
    await page.screenshot({ path: `${OUT}/${tag}-2-mes.png` })

    // 3. Semana concreta → vista semanal; el mes se conserva como contexto.
    before = requests.length
    await week.selectOption('2026-09-07')
    await expect(root).toHaveAttribute('data-kind', 'week')
    await expect(range).toHaveText('7 — 13 SEP 2026')
    await expect(month).toHaveValue('8')
    await settle(page)
    expect(requests.slice(before)).toEqual(['week 2026-09-07'])
    await page.screenshot({ path: `${OUT}/${tag}-3-semana.png` })

    // Semana que cruza meses: completa lun–dom (regla existente), contexto = septiembre.
    await week.selectOption('2026-08-31')
    await expect(range).toHaveText('31 AGO — 6 SEP 2026')
    await expect(month).toHaveValue('8')

    // 4. Volver a «Todo el mes» y a «Todo el ciclo».
    await week.selectOption('')
    await expect(root).toHaveAttribute('data-kind', 'month')
    await expect(range).toHaveText('1 — 30 SEP 2026')
    await month.selectOption('')
    await expect(root).toHaveAttribute('data-kind', 'cycle')
    await expect(week).toBeDisabled()

    // 5. Clic en la gráfica (drill) → los controles lo reflejan al instante.
    await tid(page, 'director-reading-panel').getByTestId('director-flujo-drill-2026-09-01').focus()
    await page.keyboard.press('Enter')
    await expect(root).toHaveAttribute('data-kind', 'month')
    await expect(month).toHaveValue('8')

    // 6. Flechas: ‹ en septiembre → agosto (error simulado: se informa, sin datos viejos).
    await tid(page, 'director-analysis-period-prev').click()
    await expect(month).toHaveValue('7')
    await expect(tid(page, 'director-flujo-error')).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: `${OUT}/${tag}-4-error.png` })
    // Julio responde lento: se ve la carga, no los datos del periodo anterior.
    await tid(page, 'director-analysis-period-prev').click()
    await expect(month).toHaveValue('6')
    await expect(tid(page, 'director-flujo-loading')).toBeVisible()
    await expect(tid(page, 'director-flujo-loading')).toHaveCount(0, { timeout: 15000 })

    // 7. Cambiar de ciclo descarta mes y semana; histórico y «Ciclo actual».
    await month.selectOption('9')
    await week.selectOption('2026-10-05')
    await cycle.selectOption('2026-1')
    await expect(root).toHaveAttribute('data-kind', 'cycle')
    await expect(month).toHaveValue('')
    await expect(week).toBeDisabled()
    await expect(range).toHaveText('1 ENE — 30 JUN 2026')
    await expect(root).not.toContainText('En curso')
    await cycle.selectOption('2025-2')
    expect(await month.locator('option[value="11"]').evaluate((o) => (o as HTMLOptionElement).disabled)).toBe(false)
    await tid(page, 'director-analysis-period-go-current').click()
    await expect(cycle).toHaveValue('2026-2')
    await expect(tid(page, 'director-analysis-period-go-current')).toHaveCount(0)

    // 8. Coordinación, pestaña y lámina conservan el mismo periodo.
    await month.selectOption('8')
    await tid(page, 'shell-stage').locator(`[data-testid="coordination-card"][data-code="${B2B}"]`).click()
    await settle(page)
    await expect(month).toHaveValue('8')
    await tid(page, 'director-reading-mode-internos').click()
    await expect(month).toHaveValue('8')
    await tid(page, 'director-reading-mode-state').click()
    await tid(page, 'director-estado-carousel-dot-1').click()
    await expect(month).toHaveValue('8')
    await tid(page, 'director-estado-carousel-dot-0').click()

    // 9. Teclado: Tab llega al selector y las flechas cambian el valor.
    await month.focus()
    await expect(month).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(month).toHaveValue('7')
    await page.keyboard.press('Tab')
    await expect(week).toBeFocused()

    // (Agosto tiene el error simulado: se vuelve a septiembre para medir la gráfica.)
    await month.selectOption('8')
    await expect(tid(page, 'director-flujo-chart')).toBeVisible({ timeout: 30000 })
    await settle(page)
    // 10. ECharts ocupa el ancho de su columna (redimensionado tras ampliar).
    const fit = await tid(page, 'director-flujo-chart').evaluate((host) => {
      const canvas = host.querySelector('.novex-chart__canvas') as HTMLElement
      const svg = canvas.querySelector('svg')!
      return { host: Math.round(canvas.getBoundingClientRect().width), svg: Math.round(svg.getBoundingClientRect().width) }
    })
    expect(Math.abs(fit.host - fit.svg)).toBeLessThanOrEqual(2)
  })
}
