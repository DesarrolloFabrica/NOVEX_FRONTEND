import { forwardRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { NovexIcon } from '@/shared/components/NovexIcon'
import type { TourPlacement } from './engine/tourGeometry'
import '@/styles/tour-engine.css'

export interface TourBubbleProps {
  placement: TourPlacement
  eyebrow: string
  title: string
  description: string
  expectation: string
  stepNumber: number
  stepTotal: number
  onPause?: () => void
  pauseHidden?: boolean
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  /** Pie con las acciones del paso (Anterior, Siguiente, Omitir, etc.). */
  footer: ReactNode
  /** Mensaje de incidencia, mostrado sobre el pie. */
  notice?: ReactNode
  /** Qué espera el recorrido (una acción, volver, la carga): línea propia sobre el pie. */
  status?: ReactNode
  /**
   * Texto de qué esperar; reemplaza al de la definición del paso si hay
   * incidencia. Vacío oculta el bloque (el aviso ya lo explica).
   */
  expectationOverride?: string
  /** Recuerda los atajos de teclado (solo con teclado y ratón, no en la hoja móvil). */
  keyboardHint?: boolean
}

/** Por encima de este número de pasos, los segmentos se vuelven una barra continua. */
const MAX_SEGMENTS = 14

/**
 * Globo explicativo reutilizable. No conoce pasos ni permisos: recibe el
 * contenido ya resuelto y la posición calculada por el motor.
 *
 * El centrado no usa `transform`: la animación de entrada lo anima y lo
 * anularía. La clase `--center` centra con `translate`, que se compone con él.
 */
export const TourBubble = forwardRef<HTMLDivElement, TourBubbleProps>(
  function TourBubble(
    {
      placement,
      eyebrow,
      title,
      description,
      expectation,
      expectationOverride,
      stepNumber,
      stepTotal,
      onPause,
      pauseHidden = false,
      onKeyDown,
      footer,
      notice,
      status,
      keyboardHint = false,
    },
    ref,
  ) {
    const isSheet = placement.mode === 'sheet'
    const isCenter = placement.mode === 'center'
    const style: CSSProperties | undefined =
      isSheet || isCenter ? undefined : { top: placement.top, left: placement.left }

    const className = [
      'novex-tour__card',
      isCenter ? 'novex-tour__card--center' : '',
      isSheet ? 'novex-tour__card--sheet' : '',
      isSheet && placement.edge === 'top' ? 'novex-tour__card--sheet-top' : '',
      placement.arrow ? `novex-tour__card--arrow-${placement.arrow.side}` : '',
    ]
      .filter(Boolean)
      .join(' ')

    const arrowStyle = placement.arrow
      ? ({
          '--tour-arrow-offset': `${placement.arrow.offset}px`,
        } as CSSProperties)
      : undefined

    const shownExpectation = expectationOverride ?? expectation
    const segmented = stepTotal > 1 && stepTotal <= MAX_SEGMENTS

    return (
      <div
        ref={ref}
        className={className}
        style={style}
        role="dialog"
        aria-modal="false"
        aria-labelledby="novex-tour-title"
        aria-describedby="novex-tour-description"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {placement.arrow ? (
          <span
            className={`novex-tour__arrow novex-tour__arrow--${placement.arrow.side}`}
            style={arrowStyle}
            aria-hidden="true"
          />
        ) : null}
        <header className="novex-tour__head">
          <span className="novex-tour__eyebrow">{eyebrow}</span>
          <small className="novex-tour__count">
            Paso {stepNumber} de {stepTotal}
          </small>
          {!pauseHidden && onPause ? (
            <button
              type="button"
              className="novex-tour__close"
              onClick={onPause}
              aria-label="Cerrar recorrido"
              title="Cerrar recorrido (Esc)"
            >
              <NovexIcon name="x" />
            </button>
          ) : null}
        </header>
        <div
          className={`novex-tour__progress${segmented ? ' novex-tour__progress--segmented' : ''}`}
          aria-hidden="true"
        >
          {segmented ? (
            Array.from({ length: stepTotal }, (_, index) => (
              <i
                key={index}
                data-state={
                  index + 1 < stepNumber ? 'done' : index + 1 === stepNumber ? 'current' : 'todo'
                }
              />
            ))
          ) : (
            <i style={{ width: `${(stepNumber / stepTotal) * 100}%` }} />
          )}
        </div>
        {/* `key`: el texto entra de nuevo con cada paso, aunque el globo no se mueva. */}
        <div className="novex-tour__body" key={`${stepNumber}-${title}`}>
          <h2 id="novex-tour-title">{title}</h2>
          <p id="novex-tour-description">{description}</p>
          {shownExpectation ? (
            <p className="novex-tour__expectation">
              <NovexIcon name="sparkles" />
              <span>{shownExpectation}</span>
            </p>
          ) : null}
        </div>
        {notice ? (
          <div className="novex-tour__notice" role="status">
            {notice}
          </div>
        ) : null}
        {status ? <div className="novex-tour__status">{status}</div> : null}
        <footer>{footer}</footer>
        {keyboardHint ? (
          <p className="novex-tour__keys" aria-hidden="true">
            <kbd>←</kbd>
            <kbd>→</kbd> para moverse · <kbd>Esc</kbd> para cerrar
          </p>
        ) : null}
      </div>
    )
  },
)
