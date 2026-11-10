// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RetireEvidenceModal } from './RetireEvidenceModal'

function setTextareaValue(element: HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(element)
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('RetireEvidenceModal', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('no renderiza nada cuando isOpen es false', () => {
    act(() => {
      root.render(
        <RetireEvidenceModal
          isOpen={false}
          evidenceTitle="Nota"
          evidenceId="ev-1"
          isSubmitting={false}
          error={null}
          onClose={() => undefined}
          onConfirm={() => undefined}
        />,
      )
    })
    expect(document.querySelector('[data-testid="retire-evidence-modal"]')).toBeNull()
  })

  it('bloquea confirmación con motivo corto', () => {
    const onConfirm = vi.fn()
    act(() => {
      root.render(
        <RetireEvidenceModal
          isOpen
          evidenceTitle="Nota duplicada"
          evidenceId="ev-1"
          isSubmitting={false}
          error={null}
          onClose={() => undefined}
          onConfirm={onConfirm}
        />,
      )
    })

    const reason = document.querySelector(
      '[data-testid="retire-evidence-reason"]',
    ) as HTMLTextAreaElement
    const submit = document.querySelector(
      '[data-testid="confirm-retire-evidence-submit"]',
    ) as HTMLButtonElement

    act(() => {
      setTextareaValue(reason, 'corto')
    })
    expect(submit.disabled).toBe(true)

    act(() => {
      submit.click()
    })
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('confirma con motivo válido y muestra estado de envío', () => {
    const onConfirm = vi.fn()
    act(() => {
      root.render(
        <RetireEvidenceModal
          isOpen
          evidenceTitle="Nota duplicada"
          evidenceId="ev-1"
          isSubmitting={false}
          error={null}
          onClose={() => undefined}
          onConfirm={onConfirm}
        />,
      )
    })

    const reason = document.querySelector(
      '[data-testid="retire-evidence-reason"]',
    ) as HTMLTextAreaElement
    const submit = document.querySelector(
      '[data-testid="confirm-retire-evidence-submit"]',
    ) as HTMLButtonElement

    act(() => {
      setTextareaValue(reason, 'Duplicado confirmado en revisión')
    })
    expect(submit.disabled).toBe(false)

    act(() => {
      submit.click()
    })
    expect(onConfirm).toHaveBeenCalledWith('Duplicado confirmado en revisión')

    act(() => {
      root.render(
        <RetireEvidenceModal
          isOpen
          evidenceTitle="Nota duplicada"
          evidenceId="ev-1"
          isSubmitting
          error={null}
          onClose={() => undefined}
          onConfirm={onConfirm}
        />,
      )
    })

    const busy = document.querySelector(
      '[data-testid="confirm-retire-evidence-submit"]',
    ) as HTMLButtonElement
    expect(busy.disabled).toBe(true)
    expect(busy.textContent).toContain('Retirando')
  })

  it('muestra error de retiro previo', () => {
    act(() => {
      root.render(
        <RetireEvidenceModal
          isOpen
          evidenceTitle="Nota"
          evidenceId="ev-1"
          isSubmitting={false}
          error="La evidencia ya fue retirada."
          onClose={() => undefined}
          onConfirm={() => undefined}
        />,
      )
    })
    expect(
      document.querySelector('[data-testid="retire-evidence-error"]')?.textContent,
    ).toMatch(/ya fue retirada/)
  })

  it('advierte que el retiro no es borrado físico', () => {
    act(() => {
      root.render(
        <RetireEvidenceModal
          isOpen
          evidenceTitle="Nota"
          evidenceId="ev-1"
          isSubmitting={false}
          error={null}
          onClose={() => undefined}
          onConfirm={() => undefined}
        />,
      )
    })
    expect(document.body.textContent).toMatch(/no elimina/i)
  })
})
