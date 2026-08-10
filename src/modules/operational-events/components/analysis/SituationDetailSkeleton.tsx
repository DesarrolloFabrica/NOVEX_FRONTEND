import { NovexIcon } from '@/shared/components/NovexIcon'

interface SituationDetailSkeletonProps {
  title?: string
  onClose: () => void
}

/**
 * Silueta breve del expediente mientras llegan los datos.
 */
export function SituationDetailSkeleton({
  title,
  onClose,
}: SituationDetailSkeletonProps) {
  return (
    <>
      <header className="novex-sit-header novex-sit-header--brief">
        <div className="novex-sit-header__lead">
          <div className="min-w-0">
            <p className="novex-sit-header__eyebrow">Detalle de situación</p>
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
            Abriendo detalle…
          </p>
        </div>
      </header>

      <div className="novex-sit-scroll" aria-hidden="true">
        <div className="novex-sit-brief">
          <section className="novex-sit-brief__block">
            <span className="novex-skeleton novex-skeleton--heading" />
            <span className="novex-skeleton novex-skeleton--line" />
            <span className="novex-skeleton novex-skeleton--line" />
            <span className="novex-skeleton novex-skeleton--line novex-skeleton--short" />
          </section>
          <section className="novex-sit-brief__metrics">
            <span className="novex-skeleton novex-skeleton--line" />
            <span className="novex-skeleton novex-skeleton--line" />
            <span className="novex-skeleton novex-skeleton--line" />
          </section>
          <section className="novex-sit-brief__block">
            <span className="novex-skeleton novex-skeleton--heading" />
            <span className="novex-skeleton novex-skeleton--line" />
            <span className="novex-skeleton novex-skeleton--line novex-skeleton--short" />
          </section>
        </div>
      </div>
    </>
  )
}
