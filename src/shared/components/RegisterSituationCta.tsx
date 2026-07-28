import { Link } from 'react-router-dom'

type RegisterSituationCtaVariant = 'rail' | 'topbar' | 'inline' | 'command' | 'footer'

interface RegisterSituationCtaProps {
  variant?: RegisterSituationCtaVariant
  label?: string
  className?: string
}

const DEFAULT_LABEL = '+ Registrar situación'

export function RegisterSituationCta({
  variant = 'inline',
  label = DEFAULT_LABEL,
  className = '',
}: RegisterSituationCtaProps) {
  return (
    <Link
      to="/situaciones/nueva"
      viewTransition
      className={`cunmark-register-cta cunmark-register-cta--${variant} ${className}`.trim()}
      aria-label="Registrar nueva situación"
    >
      <span className="cunmark-register-cta__label">{label}</span>
      {variant === 'rail' ? (
        <span className="cunmark-register-cta__mark" aria-hidden="true">
          +
        </span>
      ) : null}
    </Link>
  )
}
