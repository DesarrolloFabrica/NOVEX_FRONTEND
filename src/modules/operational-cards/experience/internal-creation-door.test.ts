import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildInternalReportUrl,
  parseReportIntent,
  stripReportIntent,
} from '@/modules/operational-cards/experience/reportIntent'

/**
 * UNA SOLA PUERTA DE CREACIÓN DE PROBLEMAS INTERNOS.
 *
 * Comprobación estática sobre el código fuente: ningún flujo activo crea un
 * INTERNAL fuera de `ReportProblemForm` → `submitProblemReport`. El asistente
 * legado (severidad fija MEDIUM, INTERNAL sin coordinación para el analista)
 * se retiró y su ruta redirige al Centro Operacional.
 */

const SRC = join(__dirname, '..', '..', '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)
      ? [path]
      : []
  })
}

const files = sourceFiles(SRC).map((path) => ({
  path: relative(SRC, path).replace(/\\/g, '/'),
  code: readFileSync(path, 'utf8'),
}))

describe('Creación de INTERNAL: una sola puerta', () => {
  it('solo report-submission.service llama al alta (además de su cliente HTTP)', () => {
    const callers = files
      .filter((file) => file.code.includes('createSituationWithAnalysis('))
      .map((file) => file.path)
      .sort()
    expect(callers).toEqual([
      'modules/api/situations.api.ts',
      'modules/operational-cards/services/report-submission.service.ts',
    ])
  })

  it('el asistente legado ya no existe como creador', () => {
    const paths = files.map((file) => file.path)
    expect(paths).not.toContain(
      'modules/operational-events/components/OperationalEventWizard.tsx',
    )
    expect(paths).not.toContain('modules/services/situationRegistration.service.ts')
    expect(paths).not.toContain('pages/RegisterOperationalEventPage.tsx')
  })

  it('ningún flujo de alta fija la severidad en MEDIUM', () => {
    const submission = files.find((file) =>
      file.path.endsWith('report-submission.service.ts'),
    )!
    expect(submission.code).not.toMatch(/severity:\s*'MEDIUM'/)
  })

  it('/situaciones/nueva redirige al formulario del Centro Operacional', () => {
    const router = files.find((file) => file.path === 'app/router.tsx')!
    const route = router.code.slice(router.code.indexOf("path: '/situaciones/nueva'"))
    expect(route.slice(0, 400)).toContain('<RedirectToInternalReport />')
    expect(router.code).not.toContain('RegisterOperationalEventPage')
  })

  it('ningún enlace de la app apunta todavía a /situaciones/nueva', () => {
    const offenders = files
      .filter((file) => file.path !== 'app/router.tsx')
      .filter((file) =>
        // Navegación real (enlace, navigate, paso de tour), no menciones en comentarios.
        /to="\/situaciones\/nueva|navigate\(\s*[`'"]\/situaciones\/nueva|route:\s*'\/situaciones\/nueva'/.test(
          file.code,
        ),
      )
      .map((file) => file.path)
    expect(offenders).toEqual([])
  })
})

describe('reportIntent', () => {
  it('construye y lee la intención, con coordinación opcional', () => {
    expect(buildInternalReportUrl()).toBe('/centro-operacional?reportar=interno')
    const url = buildInternalReportUrl('uuid-1')
    expect(url).toBe('/centro-operacional?reportar=interno&coordinacion=uuid-1')
    expect(parseReportIntent(url.split('?')[1])).toEqual({ coordination: 'uuid-1' })
    expect(parseReportIntent('?otra=1')).toBeNull()
  })

  it('limpia solo sus parámetros', () => {
    expect(stripReportIntent('?reportar=interno&coordinacion=x&tab=2')).toBe('?tab=2')
    expect(stripReportIntent('?reportar=interno')).toBe('')
  })
})
