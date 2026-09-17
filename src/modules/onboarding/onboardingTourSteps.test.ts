import { describe, expect, it } from 'vitest'
import { getOnboardingSteps } from './onboardingTourSteps'

describe('getOnboardingSteps', () => {
  it('mantiene al director en una experiencia ejecutiva sin captura', () => {
    const steps = getOnboardingSteps('DIRECTOR')

    expect(steps.every((step) => step.route === '/dashboard')).toBe(true)
    expect(steps.some((step) => step.id === 'capture')).toBe(false)
    expect(steps.some((step) => step.id === 'trends')).toBe(true)
    expect(steps.find((step) => step.id === 'impact')?.target).toBe(
      '[data-tour="impact-summary"]',
    )
  })

  it('no ofrece tutorial al administrador', () => {
    expect(getOnboardingSteps('ADMIN')).toEqual([])
  })

  it('acompaña al analista por el flujo operacional completo', () => {
    const stepIds = getOnboardingSteps('ANALISTA').map((step) => step.id)

    expect(stepIds).toEqual(
      expect.arrayContaining([
        'overview',
        'impact',
        'register',
        'capture',
        'review',
        'analysis',
        'report',
        'report-detail',
        'pdf',
        'history',
        'management',
        'status',
        'complete',
      ]),
    )
  })

  it('bloquea el avance hasta completar captura, confirmación, IA e informe', () => {
    /*
     * La comprobación se conserva íntegra, pero apuntando al ANALISTA: el flujo
     * de captura guiada sigue siendo suyo. El coordinador dejó de recorrerlo
     * porque su trabajo se mudó al Centro Operacional; su recorrido nuevo se
     * verifica en el caso de abajo.
     */
    const steps = getOnboardingSteps('ANALISTA')

    expect(steps.find((step) => step.id === 'capture')?.advanceOnTarget).toBe(
      '[data-tour="capture-review"]',
    )
    expect(steps.find((step) => step.id === 'review')?.advanceOnTarget).toBe(
      '[data-tour="analysis-stage"]',
    )
    expect(steps.find((step) => step.id === 'analysis')?.advanceOnTarget).toBe(
      '[data-tour="ai-report"]',
    )
    expect(steps.find((step) => step.id === 'analysis')?.lockNavigation).toBe(
      true,
    )
    expect(
      steps.find((step) => step.id === 'report-detail')
        ?.advanceOnVisibleTarget,
    ).toBe('[data-tour="report-end"]')
    expect(steps.find((step) => step.id === 'status')?.target).toContain(
      'status-update-trigger',
    )
    expect(steps.find((step) => step.id === 'status')?.target).toContain(
      'status-management',
    )
    expect(steps.at(-1)?.placement).toBe('center')
    expect(steps.at(-1)?.id).toBe('complete')
  })

  it('recorre al coordinador por el Centro Operacional, sin salir de él', () => {
    const steps = getOnboardingSteps('COORDINADOR')

    // Ni un solo paso navega fuera: su jornada ocurre en una sola pantalla.
    for (const step of steps) {
      expect(step.route).toBe('/centro-operacional')
    }

    // Y señala las regiones REALES de la experiencia actual.
    const targets = steps.map((step) => step.target)
    expect(targets).toContain('[data-tour="my-reports"]')
    expect(targets).toContain('[data-tour="coordination-problems"]')
    expect(targets).toContain('[data-tour="report-problem"]')
    expect(targets).toContain('[data-tour="action-panel"]')
    expect(targets).toContain('[data-tour="operational-deck"]')
  })

  it('el recorrido del coordinador no exige crear ni cerrar nada real', () => {
    // Conocer la pantalla no debe obligar a ensuciar la operación con un caso
    // de prueba: ningún paso espera a un hito de escritura.
    const steps = getOnboardingSteps('COORDINADOR')

    for (const step of steps) {
      expect(step.advanceOnTarget).toBeUndefined()
      expect(step.lockNavigation).toBeFalsy()
    }
  })

  it('el coordinador termina en un paso de cierre', () => {
    const steps = getOnboardingSteps('COORDINADOR')
    expect(steps.at(-1)?.id).toBe('shell-complete')
    expect(steps.at(-1)?.placement).toBe('center')
  })
})
