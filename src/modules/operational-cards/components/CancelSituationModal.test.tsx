// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CancelSituationModal } from './CancelSituationModal'

function setElementValue(
  element: HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const prototype = Object.getPrototypeOf(element)
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('CancelSituationModal', () => {
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
        <CancelSituationModal
          isOpen={false}
          situationTitle="Caída de servicios"
          situationId="sit-1"
          isSubmitting={false}
          error={null}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      )
    })

    expect(document.querySelector('[data-testid="cancel-situation-modal"]')).toBeNull()
  })

  it('renderiza título, contexto y advertencia cuando isOpen es true', () => {
    act(() => {
      root.render(
        <CancelSituationModal
          isOpen={true}
          situationTitle="Caída de servicios"
          situationId="sit-1"
          isSubmitting={false}
          error={null}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      )
    })

    const modal = document.querySelector('[data-testid="cancel-situation-modal"]')
    expect(modal).not.toBeNull()
    expect(modal?.textContent).toContain('Anular situación')
    expect(modal?.textContent).toContain('Caída de servicios')
    expect(modal?.textContent).toContain('Gestión administrativa')
    expect(modal?.textContent).toContain(
      'La anulación es una medida administrativa excepcional',
    )
  })

  it('valida longitud mínima (10 caracteres) antes de confirmar', () => {
    const onConfirm = vi.fn()
    act(() => {
      root.render(
        <CancelSituationModal
          isOpen={true}
          situationTitle="Caída de servicios"
          situationId="sit-1"
          isSubmitting={false}
          error={null}
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />,
      )
    })

    const submitBtn = document.querySelector(
      '[data-testid="confirm-cancel-situation-submit"]',
    ) as HTMLButtonElement
    expect(submitBtn.disabled).toBe(true)

    const textarea = document.querySelector(
      '[data-testid="cancel-situation-reason"]',
    ) as HTMLTextAreaElement

    // Escribir solo 5 caracteres
    act(() => {
      setElementValue(textarea, 'Corto')
    })

    expect(submitBtn.disabled).toBe(true)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('permite el envío cuando el motivo tiene al menos 10 caracteres', () => {
    const onConfirm = vi.fn()
    act(() => {
      root.render(
        <CancelSituationModal
          isOpen={true}
          situationTitle="Caída de servicios"
          situationId="sit-1"
          isSubmitting={false}
          error={null}
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />,
      )
    })

    const textarea = document.querySelector(
      '[data-testid="cancel-situation-reason"]',
    ) as HTMLTextAreaElement
    const form = document.querySelector(
      '[data-testid="cancel-situation-form"]',
    ) as HTMLFormElement

    act(() => {
      setElementValue(
        textarea,
        'Este es un motivo válido con más de 10 caracteres.',
      )
    })

    const submitBtn = document.querySelector(
      '[data-testid="confirm-cancel-situation-submit"]',
    ) as HTMLButtonElement
    expect(submitBtn.disabled).toBe(false)

    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(onConfirm).toHaveBeenCalledWith(
      'Este es un motivo válido con más de 10 caracteres.',
    )
  })

  it('muestra estado de carga deshabilitando controles durante isSubmitting', () => {
    act(() => {
      root.render(
        <CancelSituationModal
          isOpen={true}
          situationTitle="Caída de servicios"
          situationId="sit-1"
          isSubmitting={true}
          error={null}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      )
    })

    const submitBtn = document.querySelector(
      '[data-testid="confirm-cancel-situation-submit"]',
    ) as HTMLButtonElement
    const textarea = document.querySelector(
      '[data-testid="cancel-situation-reason"]',
    ) as HTMLTextAreaElement

    expect(submitBtn.disabled).toBe(true)
    expect(submitBtn.textContent).toContain('Anulando…')
    expect(textarea.disabled).toBe(true)
  })

  it('muestra error y botón de refresco ante concurrencia', () => {
    const onRetryDetail = vi.fn()
    act(() => {
      root.render(
        <CancelSituationModal
          isOpen={true}
          situationTitle="Caída de servicios"
          situationId="sit-1"
          isSubmitting={false}
          error="La situación ya no admite esta operación."
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          onRetryDetail={onRetryDetail}
        />,
      )
    })

    const errorEl = document.querySelector('[data-testid="cancel-situation-error"]')
    expect(errorEl?.textContent).toContain('La situación ya no admite esta operación.')

    const retryBtn = document.querySelector('.novex-ops-modal__retry-btn') as HTMLButtonElement
    expect(retryBtn).not.toBeNull()

    act(() => {
      retryBtn.click()
    })
    expect(onRetryDetail).toHaveBeenCalled()
  })

  it('permite cerrar con Escape cuando no se está enviando', () => {
    const onClose = vi.fn()
    act(() => {
      root.render(
        <CancelSituationModal
          isOpen={true}
          situationTitle="Caída de servicios"
          situationId="sit-1"
          isSubmitting={false}
          error={null}
          onClose={onClose}
          onConfirm={vi.fn()}
        />,
      )
    })

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('ignora Escape mientras isSubmitting es true', () => {
    const onClose = vi.fn()
    act(() => {
      root.render(
        <CancelSituationModal
          isOpen={true}
          situationTitle="Caída de servicios"
          situationId="sit-1"
          isSubmitting={true}
          error={null}
          onClose={onClose}
          onConfirm={vi.fn()}
        />,
      )
    })

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onClose).not.toHaveBeenCalled()
  })
})
