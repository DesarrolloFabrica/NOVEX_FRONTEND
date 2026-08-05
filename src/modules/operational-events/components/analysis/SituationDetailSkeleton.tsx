import { NovexIcon } from '@/shared/components/NovexIcon'

interface SituationDetailSkeletonProps {
  title?: string
  onClose: () => void
}

const SECTIONS = [
  { question: '¿Qué ocurrió?', cards: 2 },
  { question: '¿Qué tan grave es?', cards: 3 },
  { question: '¿Qué hacemos?', cards: 2 },
] as const

/**
 * Reproduce la silueta del expediente mientras llegan los datos: el diálogo
 * conserva su tamaño definitivo y el contenido se sustituye en el sitio, sin
 * que la tarjeta crezca de golpe al terminar la carga.
 */
export function SituationDetailSkeleton({
  title,
  onClose,
}: SituationDetailSkeletonProps) {
  return (
    <>
      <header className="novex-sit-header">
        <div className="novex-sit-header__lead">
          <span className="novex-sit-header__icon" aria-hidden="true">
            <NovexIcon name="alert" size={16} strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <p className="novex-sit-header__eyebrow">Expediente operativo</p>
            {title ? (
              <h2 className="novex-sit-header__title">{title}</h2>
            ) : (
              <span
                className="novex-skeleton novex-skeleton--title"
                aria-hidden="true"
              />
            )}
            <span
              className="novex-skeleton novex-skeleton--meta"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="novex-sit-header__aside">
          <button
            type="button"
            className="novex-sit-header__close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <NovexIcon name="x" size={15} strokeWidth={1.7} />
          </button>
          <p className="novex-sit-skeleton__status" aria-live="polite">
            <span className="novex-sit-skeleton__pulse" aria-hidden="true" />
            Abriendo expediente…
          </p>
        </div>
      </header>

      <div className="novex-sit-scroll" aria-hidden="true">
        <div className="novex-sit-skeleton__body">
          {SECTIONS.map((section) => (
            <section
              key={section.question}
              className="novex-sit-skeleton__section"
            >
              <p className="novex-sit-skeleton__question">{section.question}</p>
              <div
                className="novex-sit-skeleton__grid"
                data-cards={section.cards}
              >
                {Array.from({ length: section.cards }, (_, index) => (
                  <div key={index} className="novex-sit-skeleton__card">
                    <span className="novex-skeleton novex-skeleton--heading" />
                    <span className="novex-skeleton novex-skeleton--line" />
                    <span className="novex-skeleton novex-skeleton--line" />
                    <span className="novex-skeleton novex-skeleton--line novex-skeleton--short" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
