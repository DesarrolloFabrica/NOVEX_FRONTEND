import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { planTourSteps } from '../engine/tourPlan'
import { COORDINATOR_PILOT_STEPS, COORDINATOR_PILOT_STEP_COUNT } from './coordinatorPilot'

const SRC = join(process.cwd(), 'src')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    const isProductionSource = /\.(tsx?|ts)$/.test(entry) && !/\.test\.(tsx?|ts)$/.test(entry)
    return isProductionSource ? [path] : []
  })
}

const SOURCE_TEXT = sourceFiles(SRC)
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')

/** Extrae los atributos `data-tour` y `data-testid` que un selector de paso exige. */
function requiredAttributes(selector: string): string[] {
  const tour = [...selector.matchAll(/data-tour="([^"]+)"/g)].map((match) => `data-tour="${match[1]}"`)
  const testIds = [...selector.matchAll(/data-testid="([^"]+)"/g)].map((match) => `data-testid="${match[1]}"`)
  return [...tour, ...testIds]
}

describe('recorrido piloto del COORDINADOR · secuencia', () => {
  it('tiene diez pasos con identificadores únicos', () => {
    expect(COORDINATOR_PILOT_STEP_COUNT).toBe(10)
    const ids = COORDINATOR_PILOT_STEPS.map((step) => step.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('recorre en orden la bienvenida, la carta, los indicadores, los reportes, los problemas y el menú', () => {
    const ids = COORDINATOR_PILOT_STEPS.map((step) => step.id)
    expect(ids).toEqual([
      'bienvenida',
      'carta-propia',
      'indicadores',
      'mis-reportes',
      'problemas',
      'detalle',
      'seguimiento',
      'reportar',
      'historial',
      'menu',
    ])
  })

  it('todos los pasos viven en el Centro Operacional', () => {
    for (const step of COORDINATOR_PILOT_STEPS) {
      expect(step.route).toBe('/centro-operacional')
    }
  })

  it('ningún paso avanza por una acción de negocio: no declara hitos de escritura', () => {
    for (const step of COORDINATOR_PILOT_STEPS) {
      expect(step.advanceOnTarget).toBeUndefined()
      expect(step.advanceOnVisibleTarget).toBeUndefined()
      expect(step.advanceWhen).toBeUndefined()
      expect(step.lockNavigation).toBeFalsy()
    }
  })

  it('los pasos que dependen de un problema seleccionado son opcionales y explican su ausencia', () => {
    for (const id of ['detalle', 'seguimiento']) {
      const step = COORDINATOR_PILOT_STEPS.find((item) => item.id === id)
      expect(step?.optional).toBe(true)
      expect(step?.missingNotice).toBeTruthy()
    }
  })
})

describe('recorrido piloto del COORDINADOR · anclas reales', () => {
  it('cada ancla que un paso señala existe en el código de producción', () => {
    for (const step of COORDINATOR_PILOT_STEPS) {
      for (const attribute of requiredAttributes(step.target)) {
        expect(
          SOURCE_TEXT.includes(attribute),
          `${step.id}: no existe ${attribute} en src`,
        ).toBe(true)
      }
    }
  })
})

describe('recorrido piloto del COORDINADOR · permisos', () => {
  it('el coordinador con permisos completos ve los diez pasos', () => {
    const steps = planTourSteps(
      COORDINATOR_PILOT_STEPS,
      { permissions: ['SITUATIONS_CREATE', 'SITUATIONS_UPDATE', 'SITUATIONS_VIEW'] },
      'COORDINADOR',
    )
    expect(steps).toHaveLength(10)
  })

  it('sin permiso de actualizar, el paso de seguimiento no se muestra', () => {
    const steps = planTourSteps(
      COORDINATOR_PILOT_STEPS,
      { permissions: ['SITUATIONS_CREATE', 'SITUATIONS_VIEW'] },
      'COORDINADOR',
    )
    expect(steps.map((step) => step.id)).not.toContain('seguimiento')
  })

  it('sin permiso de crear, el paso de reportar no se muestra', () => {
    const steps = planTourSteps(
      COORDINATOR_PILOT_STEPS,
      { permissions: ['SITUATIONS_UPDATE', 'SITUATIONS_VIEW'] },
      'COORDINADOR',
    )
    expect(steps.map((step) => step.id)).not.toContain('reportar')
  })
})

describe('recorrido piloto del COORDINADOR · lenguaje', () => {
  const TECHNICAL = /\b(componente|selector|DOM|API|endpoint|backend|localStorage|data-|JSON|hook|props)\b/i

  it('los textos no usan vocabulario técnico', () => {
    for (const step of COORDINATOR_PILOT_STEPS) {
      for (const text of [step.eyebrow, step.title, step.description, step.expectation, step.missingNotice ?? '']) {
        expect(TECHNICAL.test(text), `${step.id}: «${text}»`).toBe(false)
      }
    }
  })

  it('las descripciones son breves', () => {
    for (const step of COORDINATOR_PILOT_STEPS) {
      expect(step.description.length, step.id).toBeLessThanOrEqual(180)
    }
  })
})
