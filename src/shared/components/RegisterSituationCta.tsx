import { Link } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { canCreateSituations } from '@/modules/auth/utils/permissions'

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
  const { user } = useAuth()

  if (!canCreateSituations(user)) {
    return null
  }

  return (
    <Link
      to="/situaciones/nueva"
      viewTransition
      className={`novex-register-cta novex-register-cta--${variant} ${className}`.trim()}
      aria-label="Registrar nueva situación"
    >
      <span className="novex-register-cta__label">{label}</span>
      {variant === 'rail' ? (
        <span className="novex-register-cta__mark" aria-hidden="true">
          +
        </span>
      ) : null}
    </Link>
  )
}
