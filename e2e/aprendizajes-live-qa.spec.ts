import { expect, test, type Page, type Response } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * QA EN VIVO · DIRECTOR → APRENDIZAJES contra backend y BD REALES (locales).
 * Opt-in: NOVEX_LIVE_E2E=1 con Nest en :3001 (BD local) y Vite en :4173.
 * Solo lectura: inicia sesión por correo (solo desarrollo), no escribe nada.
 *
 *   NOVEX_LIVE_E2E=1 PLAYWRIGHT_EXTERNAL_SERVER=1 npx playwright test e2e/aprendizajes-live-qa.spec.ts
 *
 * Capturas en e2e/artifacts/aprendizajes/.
 */

const RUN = process.env.NOVEX_LIVE_E2E === '1'
const DIRECTOR_EMAIL = process.env.NOVEX_LIVE_DIRECTOR ?? 'iron_fuentes@cun.edu.co'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'artifacts', 'aprendizajes')
const CARD = '[data-testid="coordination-card"]'
const PRIMARY = process.env.NOVEX_LIVE_COORD ?? 'coord-operaciones-academicas'
const SECONDARY = process.env.NOVEX_LIVE_COORD_2 ?? 'coord-general'

const tid = (page: Page, id: string) => page.getByTestId(id)

type Summary = {
  scope: { coordinationId: string }
  closedCount: number
  learningCount: number
  coverage: number | null
  categories: Array<{ id: string; name: string; count: number }>
}
type ItemsPage = { total: number; items: Array<{ situationId: string; category: { id: string } }> }

const isSummary = (r: Response) => /\/operational-kpis\/learnings\?/.test(r.url())
const isItems = (r: Response) => /\/operational-kpis\/learnings\/items\?/.test(r.url())

async function login(page: Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(DIRECTOR_EMAIL)
  await page.locator('form.novex-login-stage__email-form [type="submit"]').click()
  await page.waitForURL(/centro-operacional/, { timeout: 30_000 })
  await expect(tid(page, 'operational-shell')).toBeVisible({ timeout: 60_000 })
  await expect(tid(page, 'operational-shell')).toHaveAttribute('data-shell-experience', 'director')
}

/**
 * Respuestas COMPLETAS de la API real. En desarrollo React (StrictMode) monta
 * los efectos dos veces y aborta la primera petición: esa no tiene cuerpo.
 */
function collect(page: Page) {
  const summaries: Summary[] = []
  const pages: Array<{ url: string; body: ItemsPage }> = []
  page.on('response', async (response) => {
    if (!response.ok()) return
    try {
      if (isSummary(response)) summaries.push((await response.json()) as Summary)
      else if (isItems(response)) pages.push({ url: response.url(), body: (await response.json()) as ItemsPage })
    } catch {
      // Petición abortada: sin cuerpo.
    }
  })
  return { summaries, pages }
}

type Collected = ReturnType<typeof collect>

/** Abre la carta y la pestaña APRENDIZAJES; devuelve lo que sirvió la API real. */
async function openAprendizajes(page: Page, seen: Collected, code: string, alreadyOnTab = false) {
  const before = { summaries: seen.summaries.length, pages: seen.pages.length }
  await page.locator(`${CARD}[data-code="${code}"]`).first().click()
  if (!alreadyOnTab) await tid(page, 'director-reading-mode-aprendizajes').click()
  await expect(tid(page, 'director-reading-aprendizajes')).toHaveAttribute('data-state', 'ready', {
    timeout: 30_000,
  })
  await expect.poll(() => seen.summaries.length).toBeGreaterThan(before.summaries)
  const summary = seen.summaries.at(-1)!
  if (summary.learningCount > 0) {
    await expect.poll(() => seen.pages.length).toBeGreaterThan(before.pages)
  }
  const items = summary.learningCount > 0 ? seen.pages.at(-1)!.body : null
  return { summary, items }
}

/** Ningún bloque desborda en horizontal dentro del carril de Lectura. */
async function assertNoHorizontalOverflow(page: Page) {
  const report = await page.evaluate(() => {
    const body = document.querySelector('[data-testid="director-reading-body"]') as HTMLElement
    const bodyBox = body.getBoundingClientRect()
    const offenders: string[] = []
    if (body.scrollWidth > body.clientWidth + 1) offenders.push(`body ${body.scrollWidth}>${body.clientWidth}`)
    for (const el of body.querySelectorAll<HTMLElement>(
      '.director-aprendizajes__indicator, .director-aprendizajes__chart-frame, .director-aprendizaje-card, .director-aprendizajes__cards-head',
    )) {
      const box = el.getBoundingClientRect()
      if (box.right > bodyBox.right + 1 || box.left < bodyBox.left - 1) {
        offenders.push(`${el.className} [${Math.round(box.left)}, ${Math.round(box.right)}] ⊄ [${Math.round(bodyBox.left)}, ${Math.round(bodyBox.right)}]`)
      }
      if (el.scrollWidth > el.clientWidth + 1) offenders.push(`${el.className} scroll ${el.scrollWidth}>${el.clientWidth}`)
    }
    const svg = body.querySelector('[data-testid="director-aprendizajes-chart"] svg')?.getBoundingClientRect()
    const frame = body.querySelector('.director-aprendizajes__chart-frame')?.getBoundingClientRect()
    if (svg && frame && (svg.right > frame.right + 1 || svg.bottom > frame.bottom + 1)) {
      offenders.push('chart svg recortado por su marco')
    }
    return offenders
  })
  expect(report).toEqual([])
}

async function shoot(page: Page, name: string) {
  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
  await tid(page, 'director-reading-panel').screenshot({ path: path.join(OUT, `${name}-panel.png`) })
  await page.screenshot({ path: path.join(OUT, `${name}-full.png`) })
}

test.describe('QA EN VIVO · DIRECTOR → APRENDIZAJES', () => {
  test.skip(!RUN, 'Requiere NOVEX_LIVE_E2E=1 con backend y BD locales.')
  test.use({ colorScheme: 'light' })

  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true })
  })

  for (const [size, viewport] of [
    ['1440x900', { width: 1440, height: 900 }],
    ['1920x1080', { width: 1920, height: 1080 }],
  ] as const) {
    test(`@ ${size} · datos reales, filtro, expediente y cambio de coordinación`, async ({ page }) => {
      test.slow()
      await page.setViewportSize(viewport)
      const seen = collect(page)
      await login(page)
      const { summary, items } = await openAprendizajes(page, seen, PRIMARY)

      // A · indicadores = lo que sirvió la API (sin valores de demostración).
      await expect(tid(page, 'director-aprendizajes-count')).toHaveText(String(summary.learningCount))
      await expect(tid(page, 'director-aprendizajes-coverage')).toHaveText(
        summary.coverage === null ? '—' : `${summary.coverage} %`,
      )
      expect(summary.learningCount).toBeGreaterThan(0)

      // B · la gráfica recibe TODAS las categorías del periodo.
      const chart = tid(page, 'director-aprendizajes-chart')
      await expect(chart.locator('svg')).toBeVisible()
      const aria = await chart.getAttribute('aria-label')
      for (const category of summary.categories) expect(aria).toContain(category.name)

      // C · fichas visibles desde el inicio, contador = total del filtro.
      const cards = tid(page, 'director-aprendizaje-card')
      await expect(cards).toHaveCount(Math.min(20, items!.total))
      await expect(tid(page, 'director-aprendizajes-cards')).toContainText(String(items!.total))
      await assertNoHorizontalOverflow(page)
      await shoot(page, `${size}-01-inicial`)

      // Filtro de categoría: cambia SOLO las fichas.
      const target = summary.categories.at(-1)!
      await tid(page, 'director-aprendizajes-filter').selectOption(target.id)
      await expect(cards).toHaveCount(Math.min(20, target.count))
      await expect
        .poll(() => seen.pages.at(-1)?.url.includes(`categoryId=${target.id}`))
        .toBe(true)
      const filteredPage = seen.pages.at(-1)!.body
      expect(filteredPage.total).toBe(target.count)
      expect(filteredPage.items.every((i) => i.category.id === target.id)).toBe(true)
      await expect(chart).toHaveAttribute('aria-label', aria!)
      await expect(tid(page, 'director-aprendizajes-count')).toHaveText(String(summary.learningCount))
      await shoot(page, `${size}-02-filtro`)
      await tid(page, 'director-aprendizajes-filter').selectOption('')
      await expect(cards).toHaveCount(Math.min(20, items!.total))

      // Expediente: aprendizaje completo en solo lectura, sin controles de cierre.
      const firstId = items!.items[0].situationId
      await cards.first().getByTestId('director-aprendizaje-open').click()
      const record = tid(page, 'director-problem-resolution')
      await expect(record).toBeVisible({ timeout: 20_000 })
      await expect(record.getByTestId('problem-learning')).not.toBeEmpty()
      await expect(cards.first()).toHaveAttribute('data-selected', 'true')
      const problemPanel = tid(page, 'director-problem-panel')
      await expect(problemPanel.locator('textarea')).toHaveCount(0)
      await expect(problemPanel.getByTestId('resolve-form')).toHaveCount(0)
      await expect(problemPanel.getByTestId('resolve-submit')).toHaveCount(0)
      // El registro de cierre se puede leer COMPLETO: nada lo recorta el marco.
      await record.scrollIntoViewIfNeeded()
      await page.waitForTimeout(200)
      const fits = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="director-problem-panel"]')!.getBoundingClientRect()
        const block = document.querySelector('[data-testid="director-problem-resolution"]')!.getBoundingClientRect()
        return { top: block.top >= panel.top - 1, bottom: block.bottom <= panel.bottom + 1, panel: [panel.top, panel.bottom], block: [block.top, block.bottom] }
      })
      expect(fits, JSON.stringify(fits)).toMatchObject({ top: true, bottom: true })
      const fullText = await record.getByTestId('problem-learning').innerText()
      const excerpt = await cards.first().getByTestId('director-aprendizaje-card-learning').innerText()
      expect(fullText.replace(/\s+/g, ' ').startsWith(excerpt.replace(/…$/, '').trim())).toBe(true)
      expect(firstId).toBeTruthy()
      await shoot(page, `${size}-03-expediente`)

      // Otra coordinación (una carta visible de la subbaraja): nunca muestra la lectura anterior.
      const nextCode =
        (await page
          .locator(`${CARD}:visible`)
          .evaluateAll(
            (els, current) => els.map((el) => el.getAttribute('data-code')).find((c) => c && c !== current) ?? null,
            PRIMARY,
          )) ?? SECONDARY
      const other = await openAprendizajes(page, seen, nextCode, true)
      expect(other.summary.scope.coordinationId).not.toBe(summary.scope.coordinationId)
      await expect(tid(page, 'director-reading-aprendizajes')).toHaveAttribute(
        'data-coordination',
        other.summary.scope.coordinationId,
      )
      await expect(tid(page, 'director-aprendizajes-count')).toHaveText(String(other.summary.learningCount))
      await assertNoHorizontalOverflow(page)
      await shoot(page, `${size}-04-otra-coordinacion`)
    })
  }
})
