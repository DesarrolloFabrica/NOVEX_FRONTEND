type CunmarkBrandMarkProps = {
  size?: 'rail' | 'login' | 'splash'
  className?: string
}

const SRC = '/cunmark-mark.png'

/**
 * Iso limpio de Cunmark (derivado de LogoLimpio) para marca compacta.
 * El wordmark textual "CUNMARK" se renderiza en la UI (login/rail), no como imagen.
 */
export function CunmarkBrandMark({ size = 'rail', className = '' }: CunmarkBrandMarkProps) {
  return (
    <span
      className={`cunmark-brand-mark cunmark-brand-mark--${size} ${className}`.trim()}
      aria-hidden="true"
    >
      <img src={SRC} alt="" draggable={false} />
    </span>
  )
}
