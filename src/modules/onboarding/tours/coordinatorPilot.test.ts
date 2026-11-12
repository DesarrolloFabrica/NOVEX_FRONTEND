import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { planTourSteps } from '../engine/tourPlan'
import { COORDINATOR_PILOT_STEPS, COORDINATOR_PILOT_STEP_COUNT } from './coordinatorPilot'

const SRC = join(process.cwd(), 'src')

/** Extrae los atributos `data-tour` y `data-testid` que un selector de paso exige. */
function requiredAttributes(selector: string): string[] {
  const tour = [...selector.matchAll(/data-tour="([^"]+)"/g)].map((match) => `data-tour="${match[1]}"`)
  const testIds = [...selector.matchAll(/data-testid="([^"]+)"/g)].map((match) => `data-testid="${match[1]}"`)
  return [...tour, ...testIds]
}

const COORDINATOR_SCREEN_FILES = [
  'modules/operational-cards/experience/layouts/CoordinatorOperationalLayout.tsx',
  'modules/operational-cards/experience/layouts/OperationalCenterChrome.tsx',
  'modules/operational-cards/experience/layouts/OperationalCenterMenu.tsx',
  'modules/operational-cards/components/CoordinatorProblemPanel.tsx',
  'modules/operational-cards/components/CoordinationCard.tsx',
  'modules/operational-cards/components/OperationalActionPanel.tsx',
  'modules/operational-cards/components/ProblemDetail.tsx',
  'modules/operational-cards/components/ProblemActions.tsx',
  'modules/operational-cards/components/ProblemHistoryPanel.tsx',
  'modules/operational-cards/components/AdminInsightPanels.tsx',
]

/** Solo el código que pinta la pantalla del coordinador: un ancla de otro rol no cuenta. */
const COORDINATOR_SCREEN_TEXT = COORDINATOR_SCREEN_FILES.map((file) =>
  readFileSync(join(SRC, file), 'utf8'),
).join('\n')

/** `tourId="x"` de ShellRegion se pinta como `data-tour="x"`. */
function presentOnCoordinatorScreen(attribute: string): boolean {
  if (COORDINATOR_SCREEN_TEXT.includes(attribute)) return true
  const tour = attribute.match(/^data-tour="(.+)"$/)
  if (tour && COORDINATOR_SCREEN_TEXT.includes(`tourId="${tour[1]}"`)) return true
  // Valores calculados (`data-testid={cond ? 'a' : 'b'}`): basta el literal.
  const value = attribute.match(/^data-[a-z-]+="(.+)"$/)?.[1]
  return Boolean(value && COORDINATOR_SCREEN_TEXT.includes(`'${value}'`))
}

/** Predicado como texto legible, sin las comillas escapadas de JSON. */
const asText = (value: unknown) => JSON.stringify(value ?? '').replace(/\\"/g, '"')

const byId = (id: string) => COORDINATOR_PILOT_STEPS.find((step) => step.id === id)

describe('recorrido piloto del COORDINADOR · secuencia', () => {
  it('tiene once pasos con identificadores únicos', () => {
    expect(COORDINATOR_PILOT_STEP_COUNT).toBe(11)
    const ids = COORDINATOR_PILOT_STEPS.map((step) => step.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('sigue la pantalla de arriba abajo y de izquierda a derecha', () => {
    expect(COORDINATOR_PILOT_STEPS.map((step) => step.id)).toEqual([
      'bienvenida',
      'resumen',
      'carta',
      'estado',
      'situaciones',
      'abrir',
      'expediente',
      'seguimiento',
      'registrar',
      'consultar',
      'menu',
    ])
  })

  it('todos los pasos viven en el Centro Operacional', () => {
    for (const step of COORDINATOR_PILOT_STEPS) {
      expect(step.route).toBe('/centro-operacional')
    }
  })

  it('la bienvenida va centrada y sin resaltar nada', () => {
    expect(byId('bienvenida')?.placement).toBe('center')
    expect(byId('bienvenida')?.highlightTarget).toBe(false)
  })

  it('ningún paso usa hitos heredados ni bloquea la navegación', () => {
    for (const step of COORDINATOR_PILOT_STEPS) {
      expect(step.advanceOnTarget).toBeUndefined()
      expect(step.advanceOnVisibleTarget).toBeUndefined()
      expect(step.lockNavigation).toBeFalsy()
    }
  })

  it('el único paso de acción solo espera a que se abra un expediente, y puede omitirse', () => {
    const actions = COORDINATOR_PILOT_STEPS.filter((step) => step.kind === 'action')
    expect(actions.map((step) => step.id)).toEqual(['abrir'])
    expect(asText(byId('abrir')?.advanceWhen)).toContain('data-mode="detail"')
    expect(byId('abrir')?.optional).toBe(true)
    expect(byId('abrir')?.waitingLabel).toBeTruthy()
  })
})

describe('recorrido piloto del COORDINADOR · anclas reales', () => {
  it('cada ancla que un paso señala existe en la pantalla del coordinador', () => {
    for (const step of COORDINATOR_PILOT_STEPS) {
      const selectors = [
        step.target,
        step.missingTarget ?? '',
        step.gate?.target ?? '',
        step.placementTarget ?? '',
        asText(step.showWhen),
        asText(step.advanceWhen),
      ]
      for (const attribute of selectors.flatMap(requiredAttributes)) {
        expect(
          presentOnCoordinatorScreen(attribute),
          `${step.id}: no existe ${attribute} en la pantalla del coordinador`,
        ).toBe(true)
      }
    }
  })
})

describe('recorrido piloto del COORDINADOR · pasos que dependen de un expediente', () => {
  it('expediente y seguimiento solo se muestran si hay uno abierto', () => {
    expect(asText(byId('expediente')?.showWhen)).toContain('data-mode="detail"')
    expect(asText(byId('seguimiento')?.showWhen)).toContain('problem-actions')
  })

  it('«Abra una situación» se salta si no hay filas o si ya hay un expediente abierto', () => {
    const condition = asText(byId('abrir')?.showWhen)
    expect(condition).toContain('situation-row')
    expect(condition).toContain('"type":"not"')
  })

  it('registrar y consultar piden volver a la vista principal antes de explicarse', () => {
    for (const id of ['registrar', 'consultar']) {
      const gate = byId(id)?.gate
      expect(gate, id).toBeDefined()
      expect(gate?.target).toContain('data-testid="detail-bar-back"')
      expect(gate?.target).toContain('data-testid="admin-insight-back"')
      expect(asText(gate?.when)).toContain('coordinator-actions')
    }
  })
})

describe('recorrido piloto del COORDINADOR · permisos', () => {
  it('el coordinador con permisos completos ve los once pasos', () => {
    const steps = planTourSteps(
      COORDINATOR_PILOT_STEPS,
      { permissions: ['SITUATIONS_CREATE', 'SITUATIONS_UPDATE', 'SITUATIONS_VIEW'] },
      'COORDINADOR',
    )
    expect(steps).toHaveLength(11)
  })

  it('sin permiso de actualizar, el paso de seguimiento no se muestra', () => {
    const steps = planTourSteps(
      COORDINATOR_PILOT_STEPS,
      { permissions: ['SITUATIONS_CREATE', 'SITUATIONS_VIEW'] },
      'COORDINADOR',
    )
    expect(steps.map((step) => step.id)).not.toContain('seguimiento')
  })
})

describe('recorrido piloto del COORDINADOR · lenguaje', () => {
  const TECHNICAL = /\b(componente|selector|DOM|API|endpoint|backend|localStorage|data-|JSON|hook|props)\b/i

  it('los textos no usan vocabulario técnico', () => {
    for (const step of COORDINATOR_PILOT_STEPS) {
      const gate = step.gate
      const gateTexts = gate ? [gate.eyebrow, gate.title, gate.description, gate.expectation, gate.waitingLabel] : []
      for (const text of [step.eyebrow, step.title, step.description, step.expectation, step.missingNotice ?? '', ...gateTexts]) {
        expect(TECHNICAL.test(text), `${step.id}: «${text}»`).toBe(false)
      }
    }
  })

  it('las descripciones son breves', () => {
    for (const step of COORDINATOR_PILOT_STEPS) {
      expect(step.description.length, step.id).toBeLessThanOrEqual(180)
      if (step.gate) expect(step.gate.description.length, step.id).toBeLessThanOrEqual(180)
    }
  })

  it('los avisos de ausencia no anuncian por su cuenta la opción de continuar', () => {
    // El motor añade «Si lo prefiere, continúe sin este paso»; repetirlo la duplica.
    for (const step of COORDINATOR_PILOT_STEPS) {
      expect(step.missingNotice ?? '', step.id).not.toMatch(/puede continuar/i)
    }
  })
})
