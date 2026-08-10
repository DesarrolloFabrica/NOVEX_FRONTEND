import { useAuth } from '@/modules/auth/hooks/useAuth'
import { getRoleDisplayName } from '@/modules/auth/utils/roleDisplay'

interface SectionPlaceholderProps {
  title: string
  description: string
}

export function SectionPlaceholder({
  title,
  description,
}: SectionPlaceholderProps) {
  const { user } = useAuth()

  return (
    <section className="eoc-placeholder" aria-labelledby="eoc-placeholder-title">
      <div className="eoc-placeholder__badge">Sprint 2</div>
      <h2 id="eoc-placeholder-title" className="eoc-placeholder__title">
        {title}
      </h2>
      <p className="eoc-placeholder__description">{description}</p>
      <p className="eoc-placeholder__status">
        Contenido en desarrollo — Sprint 2
      </p>
      <p className="eoc-placeholder__role">
        Rol activo: <strong>{getRoleDisplayName(user)}</strong>
      </p>
    </section>
  )
}
