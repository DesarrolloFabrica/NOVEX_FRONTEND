import { Link } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { canCreateSituations } from '@/modules/auth/utils/permissions'
import { buildInternalReportUrl } from '@/modules/operational-cards/experience/reportIntent'

type RegisterSituationCtaVariant = 'rail' | 'topbar' | 'inline' | 'command' | 'footer'

interface RegisterSituationCtaProps {
  variant?: RegisterSituationCtaVariant
  label?: string
  className?: string
  'data-testid'?: string
  onClick?: () => void
}

const DEFAULT_LABEL = '+ Registrar situación'

export function RegisterSituationCta({
  variant = 'inline',
  label = DEFAULT_LABEL,
  className = '',
  'data-testid': testId,
  onClick,
}: RegisterSituationCtaProps) {
  const { user } = useAuth()

  if (!canCreateSituations(user)) {
    return null
  }

  return (
    <Link
      to={buildInternalReportUrl()}
      viewTransition
      className={`novex-register-cta novex-register-cta--${variant} ${className}`.trim()}
      aria-label="Registrar nueva situación"
      data-testid={testId}
      onClick={onClick}
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
