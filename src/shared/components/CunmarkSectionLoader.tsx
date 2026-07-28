import { CunmarkBrandMark } from '@/shared/components/CunmarkBrandMark'

interface CunmarkSectionLoaderProps {
  label?: string
  detail?: string
}

/**
 * Estado de carga institucional para superficies internas (p. ej. F5).
 * Centrado, sin tarjeta: continuidad de marca sin competir con el splash de login.
 */
export function CunmarkSectionLoader({
  label = 'Preparando información operacional',
  detail = 'Sincronizando la vista con los datos más recientes',
}: CunmarkSectionLoaderProps) {
  return (
    <section
      className="cunmark-section-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="cunmark-section-loader__stage" aria-hidden="true">
        <div className="cunmark-section-loader__orbit" />
        <div className="cunmark-section-loader__halo" />
        <div className="cunmark-section-loader__mark">
          <CunmarkBrandMark size="login" />
        </div>
      </div>

      <div className="cunmark-section-loader__copy">
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>

      <div className="cunmark-section-loader__track" aria-hidden="true">
        <span />
      </div>
    </section>
  )
}
