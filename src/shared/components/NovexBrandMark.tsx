type NovexBrandMarkProps = {
  size?: 'rail' | 'login' | 'splash'
  className?: string
}

const SRC = '/novex-mark.png'

/**
 * Iso limpio de Novex (derivado de LogoLimpio) para marca compacta.
 * El wordmark textual "NOVEX" se renderiza en la UI (login/rail), no como imagen.
 */
export function NovexBrandMark({ size = 'rail', className = '' }: NovexBrandMarkProps) {
  return (
    <span
      className={`novex-brand-mark novex-brand-mark--${size} ${className}`.trim()}
      aria-hidden="true"
    >
      <img src={SRC} alt="" draggable={false} />
    </span>
  )
}
