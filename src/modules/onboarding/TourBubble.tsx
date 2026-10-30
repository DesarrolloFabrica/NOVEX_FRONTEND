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
  /** Mensaje de espera o de incidencia, mostrado sobre el pie. */
  notice?: ReactNode
  /** Texto de qué esperar; reemplaza al de la definición del paso si hay incidencia. */
  expectationOverride?: string
}

const CENTER_STYLE: CSSProperties = {
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
}

/**
 * Globo explicativo reutilizable. No conoce pasos ni permisos: recibe el
 * contenido ya resuelto y la posición calculada por el motor.
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
    },
    ref,
  ) {
    const isSheet = placement.mode === 'sheet'
    const style: CSSProperties | undefined = isSheet
      ? undefined
      : placement.mode === 'center'
        ? CENTER_STYLE
        : { top: placement.top, left: placement.left }

    const className = [
      'novex-tour__card',
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

    return (
      <div
        ref={ref}
        className={className}
        style={style}
        role="dialog"
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
        <header>
          <span>{eyebrow}</span>
          <small className="novex-tour__count">
            Paso {stepNumber} de {stepTotal}
          </small>
          {!pauseHidden && onPause ? (
            <button type="button" onClick={onPause} aria-label="Pausar tutorial">
              <NovexIcon name="x" />
            </button>
          ) : null}
        </header>
        <div
          className="novex-tour__progress"
          aria-hidden="true"
        >
          <i style={{ width: `${(stepNumber / stepTotal) * 100}%` }} />
        </div>
        <h2 id="novex-tour-title">{title}</h2>
        <p id="novex-tour-description">{description}</p>
        <div className="novex-tour__expectation">
          <NovexIcon name="sparkles" />
          <span>
            <strong>Qué esperar</strong>
            {expectationOverride ?? expectation}
          </span>
        </div>
        {notice ? <div className="novex-tour__notice">{notice}</div> : null}
        <footer>{footer}</footer>
      </div>
    )
  },
)
