import { NovexBrandMark } from '@/shared/components/NovexBrandMark'

interface NovexSectionLoaderProps {
  label?: string
  detail?: string
}

/**
 * Estado de carga institucional para superficies internas (p. ej. F5).
 * Centrado, sin tarjeta: continuidad de marca sin competir con el splash de login.
 */
export function NovexSectionLoader({
  label = 'Preparando información operacional',
  detail = 'Sincronizando la vista con los datos más recientes',
}: NovexSectionLoaderProps) {
  return (
    <section
      className="novex-section-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="novex-section-loader__stage" aria-hidden="true">
        <div className="novex-section-loader__orbit" />
        <div className="novex-section-loader__halo" />
        <div className="novex-section-loader__mark">
          <NovexBrandMark size="login" />
        </div>
      </div>

      <div className="novex-section-loader__copy">
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>

      <div className="novex-section-loader__track" aria-hidden="true">
        <span />
      </div>
    </section>
  )
}
