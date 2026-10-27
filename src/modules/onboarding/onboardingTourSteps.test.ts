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

  it('el analista recorre el Centro Operacional: ya no pasa por el asistente retirado', () => {
    /*
     * El asistente de `/situaciones/nueva` dejó de crear problemas internos: la
     * única puerta es el formulario del Centro Operacional. El recorrido del
     * analista ocurre entero ahí, como el del coordinador.
     */
    const steps = getOnboardingSteps('ANALISTA')

    for (const step of steps) {
      expect(step.route).toBe('/centro-operacional')
      expect(step.route).not.toBe('/situaciones/nueva')
    }
    const ids = steps.map((step) => step.id)
    expect(ids).not.toContain('capture')
    expect(ids).not.toContain('review')
    expect(ids).toContain('shell-report')
    expect(steps.at(-1)?.id).toBe('shell-complete')
  })

  it('el analista no tiene que crear nada real para avanzar, y su texto es el suyo', () => {
    const steps = getOnboardingSteps('ANALISTA')
    for (const step of steps) {
      expect(step.advanceOnTarget).toBeUndefined()
      expect(step.lockNavigation).toBeFalsy()
    }
    expect(steps.find((step) => step.id === 'shell-report')?.title).toBe(
      'Registre un problema en la coordinación seleccionada',
    )
    expect(
      steps.find((step) => step.id === 'shell-resolve')?.description,
    ).toContain('Coordinación General')
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
