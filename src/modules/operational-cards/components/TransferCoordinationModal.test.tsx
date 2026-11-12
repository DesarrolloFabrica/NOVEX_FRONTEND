// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TransferCoordinationModal } from './TransferCoordinationModal'

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

const options = [
  { id: 'coord-1', label: 'Coordinación General', code: 'coord-general' },
  { id: 'coord-2', label: 'B2B', code: 'coord-b2b' },
  { id: 'coord-3', label: 'Desarrollo Profesional', code: 'coord-dp' },
  { id: 'coord-4', label: 'Fábrica de Contenidos', code: 'coord-fabrica' },
]

describe('TransferCoordinationModal', () => {
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
        <TransferCoordinationModal
          isOpen={false}
          situationTitle="Caída de servicios"
          situationId="sit-1"
          currentCoordinationName="B2B"
          currentCoordinationId="coord-2"
          currentCoordinationCode="coord-b2b"
          coordinationOptions={options}
          isSubmitting={false}
          error={null}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      )
    })

    expect(
      document.querySelector('[data-testid="transfer-coordination-modal"]'),
    ).toBeNull()
  })

  it('renderiza título, coordinación actual y opciones filtradas', () => {
    act(() => {
      root.render(
        <TransferCoordinationModal
          isOpen={true}
          situationTitle="Falla en pasarela"
          situationId="sit-1"
          currentCoordinationName="B2B"
          currentCoordinationId="coord-2"
          currentCoordinationCode="coord-b2b"
          coordinationOptions={options}
          isSubmitting={false}
          error={null}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      )
    })

    const modal = document.querySelector(
      '[data-testid="transfer-coordination-modal"]',
    )
    expect(modal).not.toBeNull()
    expect(modal?.textContent).toContain('Trasladar coordinación responsable')
    expect(modal?.textContent).toContain('Falla en pasarela')
    expect(
      document.querySelector('[data-testid="current-coordination-name"]')
        ?.textContent,
    ).toContain('B2B')

    // El select NO debe incluir B2B (coordinación actual)
    const select = document.querySelector(
      '[data-testid="transfer-destination-select"]',
    ) as HTMLSelectElement
    const optValues = Array.from(select.options).map((o) => o.value)
    expect(optValues).not.toContain('coord-2')
    expect(optValues).toContain('coord-1')
    expect(optValues).toContain('coord-3')
    expect(optValues).toContain('coord-4')
  })

  it('excluye la coordinación afectada en reportes INTER_COORDINATION', () => {
    act(() => {
      root.render(
        <TransferCoordinationModal
          isOpen={true}
          situationTitle="Dependencia externa"
          situationId="sit-1"
          currentCoordinationName="B2B"
          currentCoordinationId="coord-2"
          currentCoordinationCode="coord-b2b"
          affectedCoordinationId="coord-3"
          affectedCoordinationCode="coord-dp"
          reportKind="INTER_COORDINATION"
          coordinationOptions={options}
          isSubmitting={false}
          error={null}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      )
    })

    const select = document.querySelector(
      '[data-testid="transfer-destination-select"]',
    ) as HTMLSelectElement
    const optValues = Array.from(select.options).map((o) => o.value)
    // No debe incluir ni la actual (coord-2) ni la afectada (coord-3)
    expect(optValues).not.toContain('coord-2')
    expect(optValues).not.toContain('coord-3')
    expect(optValues).toContain('coord-1')
    expect(optValues).toContain('coord-4')
  })

  it('muestra advertencia cuando la situación está En atención', () => {
    act(() => {
      root.render(
        <TransferCoordinationModal
          isOpen={true}
          situationTitle="Falla en pasarela"
          situationId="sit-1"
          currentCoordinationName="B2B"
          currentCoordinationId="coord-2"
          currentCoordinationCode="coord-b2b"
          currentStatus="IN_PROGRESS"
          coordinationOptions={options}
          isSubmitting={false}
          error={null}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      )
    })

    const warning = document.querySelector(
      '[data-testid="transfer-reopen-warning"]',
    )
    expect(warning).not.toBeNull()
    expect(warning?.textContent).toContain('volverá al estado «Abierta»')
  })

  it('valida destino y longitud de motivo antes de permitir el envío', () => {
    const onConfirm = vi.fn()
    act(() => {
      root.render(
        <TransferCoordinationModal
          isOpen={true}
          situationTitle="Falla en pasarela"
          situationId="sit-1"
          currentCoordinationName="B2B"
          currentCoordinationId="coord-2"
          currentCoordinationCode="coord-b2b"
          coordinationOptions={options}
          isSubmitting={false}
          error={null}
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />,
      )
    })

    const submitBtn = document.querySelector(
      '[data-testid="confirm-transfer-coordination-submit"]',
    ) as HTMLButtonElement
    const select = document.querySelector(
      '[data-testid="transfer-destination-select"]',
    ) as HTMLSelectElement
    const textarea = document.querySelector(
      '[data-testid="transfer-coordination-reason"]',
    ) as HTMLTextAreaElement

    // Sin destino ni motivo
    expect(submitBtn.disabled).toBe(true)

    // Seleccionar destino válido
    act(() => {
      setElementValue(select, 'coord-4')
    })
    expect(submitBtn.disabled).toBe(true) // Todavía falta motivo

    // Motivo corto (<10)
    act(() => {
      setElementValue(textarea, 'Reasignar')
    })
    expect(submitBtn.disabled).toBe(true)

    // Motivo válido (>=10)
    act(() => {
      setElementValue(
        textarea,
        'Reasignación técnica a Fábrica de Contenidos por competencia del dominio.',
      )
    })
    expect(submitBtn.disabled).toBe(false)

    // Submit
    const form = document.querySelector(
      '[data-testid="transfer-coordination-form"]',
    ) as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(onConfirm).toHaveBeenCalledWith(
      'coord-4',
      'Reasignación técnica a Fábrica de Contenidos por competencia del dominio.',
    )
  })

  it('muestra estado de carga mientras isSubmitting es true', () => {
    act(() => {
      root.render(
        <TransferCoordinationModal
          isOpen={true}
          situationTitle="Falla en pasarela"
          situationId="sit-1"
          currentCoordinationName="B2B"
          currentCoordinationId="coord-2"
          currentCoordinationCode="coord-b2b"
          coordinationOptions={options}
          isSubmitting={true}
          error={null}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      )
    })

    const submitBtn = document.querySelector(
      '[data-testid="confirm-transfer-coordination-submit"]',
    ) as HTMLButtonElement
    expect(submitBtn.disabled).toBe(true)
    expect(submitBtn.textContent).toContain('Trasladando…')
  })

  it('muestra error de concurrencia y botón para refrescar situación', () => {
    const onRetryDetail = vi.fn()
    act(() => {
      root.render(
        <TransferCoordinationModal
          isOpen={true}
          situationTitle="Falla en pasarela"
          situationId="sit-1"
          currentCoordinationName="B2B"
          currentCoordinationId="coord-2"
          currentCoordinationCode="coord-b2b"
          coordinationOptions={options}
          isSubmitting={false}
          error="La coordinación responsable cambió desde que consultó la situación. Vuelva a intentarlo."
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          onRetryDetail={onRetryDetail}
        />,
      )
    })

    const errorEl = document.querySelector(
      '[data-testid="transfer-coordination-error"]',
    )
    expect(errorEl?.textContent).toContain('cambió desde que consultó la situación')

    const retryBtn = document.querySelector(
      '.novex-ops-modal__retry-btn',
    ) as HTMLButtonElement
    expect(retryBtn).not.toBeNull()

    act(() => {
      retryBtn.click()
    })
    expect(onRetryDetail).toHaveBeenCalled()
  })

  it('cierra con Escape solo si no está enviando', () => {
    const onClose = vi.fn()
    act(() => {
      root.render(
        <TransferCoordinationModal
          isOpen={true}
          situationTitle="Falla en pasarela"
          situationId="sit-1"
          currentCoordinationName="B2B"
          currentCoordinationId="coord-2"
          currentCoordinationCode="coord-b2b"
          coordinationOptions={options}
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
})
