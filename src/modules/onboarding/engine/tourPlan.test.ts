import { describe, expect, it } from 'vitest'
import { isStepAuthorized, planTourSteps, type TourStepRequirements } from './tourPlan'

const user = { permissions: ['SITUATIONS_CREATE', 'SITUATIONS_VIEW'] }

const steps: Array<TourStepRequirements & { id: string }> = [
  { id: 'intro' },
  { id: 'report', requires: ['SITUATIONS_CREATE'] },
  { id: 'resolve', requires: ['SITUATIONS_CLOSE'] },
  { id: 'director-only', roles: ['DIRECTOR'] },
  { id: 'analyst-report', roles: ['ANALISTA'], requires: ['SITUATIONS_CREATE'] },
  { id: 'optional-report', optional: true, requires: ['SITUATIONS_CREATE'] },
]

describe('planTourSteps', () => {
  it('omite los pasos cuyos permisos el usuario no tiene, sin tocar el resto', () => {
    const ids = planTourSteps(steps, user, 'ANALISTA').map((step) => step.id)
    expect(ids).toEqual(['intro', 'report', 'analyst-report', 'optional-report'])
  })

  it('un paso sin requisitos siempre se incluye', () => {
    expect(
      planTourSteps<{ id: string } & TourStepRequirements>(
        [{ id: 'intro' }],
        null,
        'COORDINADOR',
      ),
    ).toEqual([
      { id: 'intro' },
    ])
  })

  it('sin usuario, los pasos que exigen permisos se omiten de forma segura', () => {
    const ids = planTourSteps(steps, null, 'ANALISTA').map((step) => step.id)
    expect(ids).toEqual(['intro'])
  })

  it('filtra por rol cuando el paso lo declara', () => {
    const ids = planTourSteps(steps, user, 'DIRECTOR').map((step) => step.id)
    expect(ids).toContain('director-only')
    expect(ids).not.toContain('analyst-report')
  })

  it('conserva el orden de los pasos', () => {
    const ids = planTourSteps(steps, user, 'ANALISTA').map((step) => step.id)
    expect(ids).toEqual([...ids].sort((a, b) => steps.findIndex((s) => s.id === a) - steps.findIndex((s) => s.id === b)))
  })
})

describe('isStepAuthorized', () => {
  it('exige TODOS los permisos declarados', () => {
    expect(
      isStepAuthorized(
        { requires: ['SITUATIONS_CREATE', 'SITUATIONS_CLOSE'] },
        user,
        'ANALISTA',
      ),
    ).toBe(false)
  })
})
