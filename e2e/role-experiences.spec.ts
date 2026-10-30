import { expect, test } from 'playwright/test'
import { installRoleExperience } from './role-experience.fixture'

test('el coordinador aterriza en el Centro Operacional', async ({ page }) => {
  /*
   * VERDAD NUEVA (fase 2.1). Antes aterrizaba en la red de impacto con su
   * coordinación preseleccionada. Ahora llega al Centro Operacional, que es
   * donde reporta y donde resuelve —la única pantalla con esa acción— y a la
   * que hasta ahora solo se entraba escribiendo la URL.
   *
   * Se conserva lo que esta prueba protegía: que el coordinador entre a SU
   * puesto de trabajo y no a una lectura de Dirección que no le corresponde.
   */
  await installRoleExperience(page, 'COORDINADOR')
  await page.goto('/')

  await expect(page).toHaveURL(/\/centro-operacional$/)
  await expect(page.getByTestId('operational-shell')).toBeVisible()

  // Su puesto, no una consola ejecutiva: «Mis reportes» y la acción de
  // reportar están presentes desde el primer momento.
  await expect(page.getByTestId('my-reports')).toBeVisible()
  // El botón de reportar vive en el panel de acción; sin coordinación
  // seleccionada aparece deshabilitado, pero visible.
  await expect(page.getByTestId('report-internal-button')).toBeVisible()
})

/*
 * FASE 1 — landing único. ANALISTA, DIRECTOR y ADMIN ya no aterrizan en la Red
 * de impacto: entran al Centro Operacional, cada uno en su shell.
 */
for (const [roleCode, experience] of [
  ['ANALISTA', 'analyst'],
  ['DIRECTOR', 'director'],
  ['ADMIN', 'admin'],
] as const) {
  test(`${roleCode} aterriza en el Centro Operacional con su shell`, async ({
    page,
  }) => {
    await installRoleExperience(page, roleCode)
    await page.goto('/')

    await expect(page).toHaveURL(/\/centro-operacional$/)
    const shell = page.getByTestId('operational-shell')
    await expect(shell).toBeVisible()
    await expect(shell).toHaveAttribute('data-shell-experience', experience)
    // Nada del shell legacy: ni carril ni menú Plataforma.
    await expect(page.locator('.novex-os-rail')).toHaveCount(0)
    await expect(page.getByTestId('platform-menu-trigger')).toHaveCount(0)
  })
}
