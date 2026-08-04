import { describe, expect, it } from 'vitest'
import { getOnboardingSteps } from './onboardingTourSteps'

describe('getOnboardingSteps', () => {
  it('mantiene al director en una experiencia ejecutiva sin captura', () => {
    const steps = getOnboardingSteps('DIRECTOR')

    expect(steps.every((step) => step.route === '/dashboard')).toBe(true)
    expect(steps.some((step) => step.id === 'capture')).toBe(false)
    expect(steps.some((step) => step.id === 'trends')).toBe(true)
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
    const steps = getOnboardingSteps('COORDINADOR')

    expect(steps.find((step) => step.id === 'capture')?.advanceOnTarget).toBe(
      '[data-tour="capture-review"]',
    )
    expect(steps.find((step) => step.id === 'review')?.advanceOnTarget).toBe(
      '[data-tour="analysis-stage"]',
    )
    expect(steps.find((step) => step.id === 'analysis')?.advanceOnTarget).toBe(
      '[data-tour="situation-management"]',
    )
    expect(steps.find((step) => step.id === 'analysis')?.lockNavigation).toBe(
      true,
    )
    expect(
      steps.find((step) => step.id === 'report-detail')
        ?.advanceOnVisibleTarget,
    ).toBe('[data-tour="report-end"]')
    expect(steps.find((step) => step.id === 'status')?.target).toBe(
      '[data-tour="status-update-trigger"]',
    )
    expect(steps.at(-1)?.placement).toBe('center')
    expect(steps.at(-1)?.id).toBe('complete')
  })

  it('lleva al coordinador primero a su red de impacto', () => {
    const [welcome] = getOnboardingSteps('COORDINADOR')

    expect(welcome.route).toBe('/red-impacto')
  })

  it('limita el recorrido administrativo a control y soporte por rol', () => {
    expect(getOnboardingSteps('ADMIN').map((step) => step.id)).toEqual([
      'admin',
      'support',
    ])
  })
})
